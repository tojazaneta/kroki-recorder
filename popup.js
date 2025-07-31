document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('start-recording');
  const pauseButton = document.getElementById('pause-recording');
  const stopButton = document.getElementById('stop-recording');
  const clearButton = document.getElementById('clear-logs');
  const copyButton = document.getElementById('copy-steps');
  const themeToggle = document.getElementById('theme-toggle');

  const stepsContainer = document.getElementById('steps-container');
  const consoleContainer = document.getElementById('console-container');
  const networkContainer = document.getElementById('network-container');

  const consoleBadge = document.getElementById('console-badge');
  const networkBadge = document.getElementById('network-badge');

  const tabs = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');

  let isPaused = false;

  const THEMES = {
    DARK: 'dark',
    LIGHT: 'light',
  };

  const MESSAGES = {
    START_RECORDING: 'START_RECORDING',
    STOP_RECORDING: 'STOP_RECORDING',
    PAUSE_RECORDING: 'PAUSE_RECORDING',
    RESUME_RECORDING: 'RESUME_RECORDING',
  };

  // Load theme from storage and apply
  chrome.storage.local.get(['theme'], (result) => {
    if (result.theme === THEMES.DARK) {
      document.body.classList.add('dark-theme');
      themeToggle.checked = true;
    } else {
      document.body.classList.remove('dark-theme');
      themeToggle.checked = false;
    }
  });

  function updatePauseButton() {
    if (isPaused) {
      pauseButton.textContent = 'Resume';
      pauseButton.classList.add('resume');
    } else {
      pauseButton.textContent = 'Pause';
      pauseButton.classList.remove('resume');
    }
  }

  function updateStepsView(steps) {
    stepsContainer.textContent = (steps || []).join('\n');
  }

  function updateConsoleLogsView(consoleLogs) {
    if (consoleLogs.length > 0) {
      consoleContainer.innerHTML = consoleLogs.map(e => `<div>${e}</div>`).join('');
      consoleBadge.textContent = consoleLogs.length;
      consoleBadge.style.display = 'block';
    } else {
      consoleContainer.textContent = 'No console errors recorded.';
      consoleBadge.style.display = 'none';
    }
  }

  function updateNetworkErrorsView(networkErrors) {
    if (networkErrors.length > 0) {
      networkContainer.innerHTML = networkErrors.map(e => `<div>${e}</div>`).join('');
      networkBadge.textContent = networkErrors.length;
      networkBadge.style.display = 'block';
    } else {
      networkContainer.textContent = 'No network errors recorded.';
      networkBadge.style.display = 'none';
    }
  }

  function updatePopupView() {
    chrome.storage.local.get(['steps', 'consoleLogs', 'networkErrors', 'isRecording', 'isPaused'], (result) => {
      updateStepsView(result.steps || []);
      updateConsoleLogsView(result.consoleLogs || []);
      updateNetworkErrorsView(result.networkErrors || []);

      startButton.disabled = result.isRecording;
      stopButton.disabled = !result.isRecording;
      pauseButton.disabled = !result.isRecording;

      isPaused = !!result.isPaused;
      updatePauseButton();

      const hasData = (result.steps && result.steps.length > 0) || 
                      (result.consoleLogs && result.consoleLogs.length > 0) || 
                      (result.networkErrors && result.networkErrors.length > 0);
      copyButton.disabled = !hasData;
      clearButton.disabled = !hasData;
    });
  }

  updatePopupView();

  chrome.storage.onChanged.addListener(updatePopupView);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
      document.getElementById(tab.dataset.tab + '-container').classList.add('active');
    });
  });

  startButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MESSAGES.START_RECORDING });
  });

  stopButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MESSAGES.STOP_RECORDING });
  });

  pauseButton.addEventListener('click', () => {
    if (!isPaused) {
      chrome.runtime.sendMessage({ type: MESSAGES.PAUSE_RECORDING });
    } else {
      chrome.runtime.sendMessage({ type: MESSAGES.RESUME_RECORDING });
    }
  });

  copyButton.addEventListener('click', () => {
    const activeContent = document.querySelector('.tab-content.active').textContent;
    navigator.clipboard.writeText(activeContent).then(() => {
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    });
  });

  clearButton.addEventListener('click', () => {
    chrome.storage.local.set({
      steps: [],
      consoleLogs: [],
      networkErrors: []
    }, () => {
      updatePopupView();
    });
  });

  themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
      document.body.classList.add('dark-theme');
      chrome.storage.local.set({ theme: 'dark' });
    } else {
      document.body.classList.remove('dark-theme');
      chrome.storage.local.set({ theme: 'light' });
    }
  });
});
