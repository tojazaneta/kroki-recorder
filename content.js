// This script is injected into the webpage to listen for clicks and input events (typing).

if (!window.clickListenerAdded) {
  window.clickListenerAdded = true;

  // Helper: find closest button or link ancestor for better description
  function findInteractiveAncestor(element) {
    if (!element) return null;
    let el = element;
    while (el && el !== document.body) {
      if (el.tagName && (el.tagName.toLowerCase() === 'button' || el.tagName.toLowerCase() === 'a')) {
        return el;
      }
      el = el.parentElement;
    }
    return element; // fallback if no interactive ancestor found
  }

  // Listen for click events and send description to background script
  document.addEventListener('click', (event) => {
    let clickedElement = event.target;

    try {
      if (clickedElement && clickedElement.tagName && typeof clickedElement.tagName === 'string') {
        if (clickedElement.tagName.toLowerCase() === 'label') {
          const forId = clickedElement.getAttribute('for');
          if (forId) {
            const linkedInput = document.getElementById(forId);
            if (linkedInput && (linkedInput.type === 'radio' || linkedInput.type === 'checkbox')) {
              const stepDescription = getElementDescription(linkedInput, 'click');
              chrome.runtime.sendMessage({ type: 'RECORD_CLICK', data: stepDescription });
              return;
            }
          }
        }
      }

      const tagName = clickedElement && clickedElement.tagName ? clickedElement.tagName.toLowerCase() : '';
      if (tagName === 'input' || tagName === 'textarea') {
        const type = clickedElement && typeof clickedElement.type === 'string' ? clickedElement.type.toLowerCase() : '';
        if (tagName === 'textarea' || (type !== 'checkbox' && type !== 'radio')) {
          return;
        }
      }

      const interactiveElement = findInteractiveAncestor(clickedElement);
      const stepDescription = getElementDescription(interactiveElement, 'click');
      chrome.runtime.sendMessage({ type: 'RECORD_CLICK', data: stepDescription });

    } catch (e) {
      // Extension context may be invalidated, ignore silently
    }
  }, true);

  // Listen for input changes (typing) in text fields and textareas
  document.addEventListener('change', (event) => {
    const target = event.target;
    if (isTextInput(target)) {
      try {
        const stepDescription = getElementDescription(target, 'type');
        chrome.runtime.sendMessage({ type: 'RECORD_CLICK', data: stepDescription });
      } catch(e) {
        // Extension context may be invalidated, ignore silently
      }
    }
  }, true);
}

// Helper function to check if element is a text input or textarea
function isTextInput(element) {
  if (!element) return false;
  const tag = element.tagName ? element.tagName.toLowerCase() : '';
  if (tag === 'textarea') return true;
  if (tag === 'input') {
    const type = (element.type || '').toLowerCase();
    // Recognize common input types for text entry
    return ['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(type);
  }
  return false;
}

// Helper: find label text for a given input element (radio, checkbox)
function findLabelForInput(element) {
  if (!element || !element.id) return null;

  // Try to find <label for="element.id">
  const label = document.querySelector(`label[for="${element.id}"]`);
  if (label) {
    // Return trimmed innerText of the label if present
    return label.innerText.trim() || null;
  }
  return null;
}

// Function to get human-readable type and action verb based on element and action type
function getHumanReadableType(element, action) {
  if (!element || !element.tagName) return { noun: 'element', verb: 'Click' };

  const tagName = element.tagName.toLowerCase();

  // Helper: check if class string contains any substring (case insensitive)
  function classIncludesAny(clsString, substrings) {
    if (!clsString) return false;
    const lower = clsString.toLowerCase();
    return substrings.some(sub => lower.includes(sub));
  }

  // Helper: get role and class of element
  function getRoleOrClass(el) {
    if (!el) return { role: null, cls: null };
    return {
      role: el.getAttribute && el.getAttribute('role'),
      cls: el.className && typeof el.className === 'string' ? el.className : null
    };
  }

  switch (tagName) {
    case 'a':
      return { noun: 'link', verb: 'Click' };
    case 'button':
      return { noun: 'button', verb: 'Click' };
    case 'input': {
      const type = element.type ? element.type.toLowerCase() : '';
      if (['button', 'submit', 'reset'].includes(type)) return { noun: 'button', verb: 'Click' };
      if (type === 'checkbox') return { noun: 'checkbox', verb: 'Toggle' };
      if (type === 'radio') return { noun: 'radio button', verb: 'Select' };
      if (['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(type))
        return action === 'type' ? { noun: 'input field', verb: 'Type into' } : { noun: 'input field', verb: 'Click' };
      return { noun: 'input field', verb: 'Click' };
    }
    case 'textarea':
      return action === 'type' ? { noun: 'text area', verb: 'Type into' } : { noun: 'text area', verb: 'Click' };
    case 'select':
      return { noun: 'dropdown', verb: action === 'type' ? 'Select from' : 'Click' };
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return { noun: 'heading', verb: 'Click' };
    case 'img':
      if (element.className && /logo/i.test(element.className)) {
        return { noun: 'logo', verb: 'Click' };
      }
      return { noun: 'image', verb: 'Click' };
    case 'li':
      return { noun: 'list item', verb: 'Select' };
    case 'label':
      return { noun: 'label', verb: 'Click' };
    case 'span':
    case 'div': {
      let { role, cls } = getRoleOrClass(element);

      if (role === 'button' || (cls && classIncludesAny(cls, ['btn', 'button', 'clickable', 'action']))) {
        return { noun: 'button', verb: 'Click' };
      }
      if (role === 'link' || (cls && classIncludesAny(cls, ['link', 'lnk']))) {
        return { noun: 'link', verb: 'Click' };
      }

      const parent = element.parentElement;
      if (parent) {
        ({ role, cls } = getRoleOrClass(parent));
        if (role === 'button' || (cls && classIncludesAny(cls, ['btn', 'button', 'clickable', 'action']))) {
          return { noun: 'button', verb: 'Click' };
        }
        if (role === 'link' || (cls && classIncludesAny(cls, ['link', 'lnk']))) {
          return { noun: 'link', verb: 'Click' };
        }
      }

      return { noun: 'element', verb: 'Click' };
    }
    default:
      return { noun: 'element', verb: 'Click' };
  }
}

// Function to generate a human-readable description of an element with action
function getElementDescription(element, action = 'click') {
  const { noun, verb } = getHumanReadableType(element, action);

  let description = `${verb} the ${noun}`;

  let text = '';

  // Special case for radio buttons and checkboxes: get label text if available
  if (noun === 'radio button' || noun === 'checkbox') {
    const labelText = findLabelForInput(element);
    if (labelText) {
      text = labelText;
    } else {
      // fallback to aria-label or value if no label found
      text = element.getAttribute('aria-label') || element.value || '';
    }
  } else {
    // For other cases get meaningful text normally
    text = (
      element.innerText ||
      element.value ||
      element.getAttribute('aria-label') ||
      element.placeholder ||
      element.title ||
      ''
    ).trim();
  }

  if (action === 'type' && element.value && element.value.trim().length > 0) {
    const truncatedValue = element.value.length > 30 ? element.value.substring(0, 27) + '...' : element.value;
    description += ` with value "${truncatedValue}"`;
  } else if (text) {
    const truncatedText = text.length > 50 ? text.substring(0, 47) + '...' : text;
    description += ` "${truncatedText}"`;
  } else if (element.id) {
    description += ` with ID "#${element.id}"`;
  } else if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(Boolean).join('.');
    if (classes) {
      description += ` with class ".${classes}"`;
    }
  }

  return description;
}
