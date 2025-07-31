let debuggeeTab = null;
const debuggerVersion = "1.3";
let requestUrlMap = new Map();
let isPaused = false;

// --- Main listener logic ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ isRecording: false, steps: [], consoleLogs: [], networkErrors: [], isPaused: false });
  chrome.action.setIcon({ path: { "128": "icon-128.png" } });
  chrome.action.setTitle({ title: "Kroki Recorder" });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'START_RECORDING':
      startRecording();
      chrome.action.setIcon({ path: { "128": "icon-recording-128.png" } });
      chrome.action.setTitle({ title: 'Recording in progress!' });
      break;

    case 'STOP_RECORDING':
      stopRecording();
      chrome.action.setIcon({ path: { "128": "icon-128.png" } });
      chrome.action.setTitle({ title: 'Kroki Recorder' });
      break;

    case 'PAUSE_RECORDING':
      pauseRecording();
      chrome.action.setIcon({ path: { "128": "icon-pause-128.png" } });
      chrome.action.setTitle({ title: 'Recording paused' });
      break;

    case 'RESUME_RECORDING':
      resumeRecording();
      chrome.action.setIcon({ path: { "128": "icon-recording-128.png" } });
      chrome.action.setTitle({ title: 'Recording in progress!' });
      break;

    case 'RECORD_CLICK':
      recordStep(request.data);
      break;
    
    default:
      break;
  }
});

// Navigation step registration
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const { isRecording } = await chrome.storage.local.get('isRecording');
  if (!isRecording) return;
  const navTypesToLog = ['typed', 'auto_bookmark', 'reload', 'generated'];
  if (navTypesToLog.includes(details.transitionType)) {
    const { steps } = await chrome.storage.local.get('steps');
    const newStepNumber = steps.length + 1;
    const newAppName = new URL(details.url).hostname;
    const newStep = `${newStepNumber}. Navigate to -> ${newAppName}`;
    if (steps.length > 0 && steps[steps.length - 1].endsWith(newAppName)) return;
    const updatedSteps = [...steps, newStep];
    await chrome.storage.local.set({ steps: updatedSteps });
  }
});

// Debugger events and filtering
chrome.debugger.onEvent.addListener(async (source, method, params) => {
  if (method === "Network.requestWillBeSent") {
    requestUrlMap.set(params.requestId, params.request.url);
  } 
  else if (method === "Network.loadingFailed") {
    const url = requestUrlMap.get(params.requestId) || 'Unknown URL';
    if (url.startsWith('https://region1.google-analytics.com/g/')) {
      requestUrlMap.delete(params.requestId);
      return;
    }
    const { networkErrors } = await chrome.storage.local.get('networkErrors');
    const errorText = `Failed to load resource: ${url} (Reason: ${params.errorText})`;
    const newErrors = [...networkErrors, errorText];
    await chrome.storage.local.set({ networkErrors: newErrors });
    requestUrlMap.delete(params.requestId);
  } 
  else if (method === "Network.responseReceived" && params.response.status >= 400) {
    const url = params.response.url || '';
    if (url.startsWith('https://region1.google-analytics.com/g/')) return;
    const { networkErrors } = await chrome.storage.local.get('networkErrors');
    const errorText = `HTTP Error ${params.response.status}: ${url}`;
    const newErrors = [...networkErrors, errorText];
    await chrome.storage.local.set({ networkErrors: newErrors });
  } 
  else if (method === "Network.loadingFinished") {
    requestUrlMap.delete(params.requestId);
  } 
  else if (method === "Log.entryAdded" && params.entry.level === 'error') {
    const { consoleLogs } = await chrome.storage.local.get('consoleLogs');
    const newLogs = [...consoleLogs, params.entry.text];
    await chrome.storage.local.set({ consoleLogs: newLogs });
  }
});

chrome.debugger.onDetach.addListener((source, reason) => {
  stopRecording();
  chrome.action.setIcon({ path: { "128": "icon-128.png" } });
  chrome.action.setTitle({ title: 'Kroki Recorder' });
});

async function startRecording() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !isScriptableUrl(tab.url)) return;
  debuggeeTab = { tabId: tab.id };
  try {
    await chrome.debugger.attach(debuggeeTab, debuggerVersion);
    await chrome.debugger.sendCommand(debuggeeTab, "Log.enable");
    await chrome.debugger.sendCommand(debuggeeTab, "Network.enable");
    let appName = new URL(tab.url).hostname;
    const firstStep = `1. Open application -> ${appName}`;
    isPaused = false;
    await chrome.storage.local.set({ 
      isRecording: true, 
      steps: [firstStep],
      consoleLogs: [],
      networkErrors: [],
      isPaused: false
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ['content.js']
    });
  } catch (err) {
    console.error("Failed to start debugger:", err.message);
    stopRecording();
    alert(`Could not start recording. Error: ${err.message}. Try reloading the page.`);
  }
}

async function stopRecording() {
  if (debuggeeTab) {
    try {
      await chrome.debugger.detach(debuggeeTab);
    } catch (e) { /* Ignore errors */ }
  }
  debuggeeTab = null;
  requestUrlMap.clear();
  isPaused = false;
  await chrome.storage.local.set({ isRecording: false, isPaused: false });
}

function pauseRecording() {
  isPaused = true;
  chrome.storage.local.set({ isPaused: true });
}

function resumeRecording() {
  isPaused = false;
  chrome.storage.local.set({ isPaused: false });
}

async function recordStep(stepDescription) {
  const result = await chrome.storage.local.get(['steps', 'isRecording', 'isPaused']);
  if (result.isRecording && !result.isPaused) {
    const newStepNumber = result.steps.length + 1;
    const newStep = `${newStepNumber}. ${stepDescription}`;
    const updatedSteps = [...result.steps, newStep];
    await chrome.storage.local.set({ steps: updatedSteps });
  }
}

function isScriptableUrl(urlString) {
  if (!urlString) return false;
  try {
    const url = new URL(urlString);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.hostname.startsWith('chrome.google.com');
  } catch (e) { 
    return false; 
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isScriptableUrl(tab.url)) {
    const { isRecording } = await chrome.storage.local.get('isRecording');
    if (isRecording) {
      await chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        files: ['content.js']
      }).catch(err => console.error(`Failed to inject script into ${tab.url}: ${err.message}`));
    }
  }
});

chrome.tabs.onCreated.addListener(async (tab) => {
  const { isRecording } = await chrome.storage.local.get('isRecording');
  if (isRecording && tab.id && tab.url && isScriptableUrl(tab.url)) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ['content.js']
      });
    } catch (err) {
      console.error(`Failed to inject script into new tab/popup: ${err.message}`);
    }
  }
});
