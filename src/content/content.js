// TextMate - AI Text Assistant
// Content script that injects AI functionality into text boxes

// Inline implementation of logger since content scripts can't use import
const log = (function() {
  // Default to production mode (false)
  let isDevelopment = false;
  
  // Log levels
  const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
  };
  
  // Default configuration
  let config = {
    level: LogLevel.ERROR,  // Default to ERROR level
    prefix: 'TextMate',    // Log prefix
    enableConsole: true,   // Enable console output
    environment: 'production',
    context: 'content'     // Default context
  };
  
  // Update configuration based on development mode
  function updateConfig() {
    config.level = isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
    config.environment = isDevelopment ? 'development' : 'production';
  }
  
  // Load development mode setting from storage
  try {
    chrome.storage.sync.get(['development_mode'], function(result) {
      if (result.development_mode !== undefined) {
        isDevelopment = result.development_mode;
        console.log('TextMate: Development mode loaded from storage:', isDevelopment);
        updateConfig();
      }
    });
  } catch (error) {
    console.warn('Unable to access chrome storage, using default development mode:', isDevelopment);
  }
  
  // Initialize config
  updateConfig();
  
  // Log functions
  function debug(message, data = null) {
    if (LogLevel.DEBUG < config.level) return;
    const formattedMessage = `${config.prefix}: [${config.context}] ${message}`;
    console.debug(formattedMessage, data || '');
  }
  
  function info(message, data = null) {
    if (LogLevel.INFO < config.level) return;
    const formattedMessage = `${config.prefix}: [${config.context}] ${message}`;
    console.info(formattedMessage, data || '');
  }
  
  function warn(message, data = null) {
    if (LogLevel.WARN < config.level) return;
    const formattedMessage = `${config.prefix}: [${config.context}] ${message}`;
    console.warn(formattedMessage, data || '');
  }
  
  function error(message, data = null) {
    if (LogLevel.ERROR < config.level) return;
    const formattedMessage = `${config.prefix}: [${config.context}] ${message}`;
    console.error(formattedMessage, data || '');
  }
  
  // Return the logger API
  return {
    debug,
    info,
    warn,
    error
  };
})();

// Global variables
let apiKey = '';
let aiModel = 'gpt-3.5-turbo';
let currentTextElement = null;
let aiButton = null;
let aiPopup = null;
let textmateContainer = null; // Container for all TextMate elements

// State management for undo functionality
const stateManager = {
  previousState: null,
  
  saveState: function(element) {
    if (!element) return;
    
    this.previousState = {
      text: element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' 
        ? element.value 
        : element.innerText || element.textContent,
      selectionStart: element.selectionStart || 0,
      selectionEnd: element.selectionEnd || 0,
      element: element
    };
    log.info('Saved previous state');
  },
  
  restoreState: function() {
    if (!this.previousState) {
      log.info('No previous state to restore');
      return false;
    }
    
    const { text, selectionStart, selectionEnd, element } = this.previousState;
    
    try {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = text;
        element.selectionStart = selectionStart;
        element.selectionEnd = selectionEnd;
      } else {
        element.innerText = text;
      }
      
      // Trigger input event to notify the page of the change
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
      
      // Also trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      element.dispatchEvent(changeEvent);
      
      // Focus the element
      element.focus();
      
      log.info('State restored successfully');
      showNotification('Changes undone');
      
      // Clear the previous state after restore
      this.previousState = null;
      return true;
    } catch (error) {
      log.error('Error restoring state:', error);
      return false;
    }
  },
  
  hasPreviousState: function() {
    return this.previousState !== null;
  }
};

// Initialize the extension
function initialize() {
  log.info('Initializing extension');
  
  // Create container for TextMate elements
  createTextMateContainer();
  
  // Load API key from storage
  loadSettings();
  
  // Add event listeners to detect text input fields
  document.addEventListener('focusin', handleFocusIn);
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Add global click handler for debugging
  document.addEventListener('click', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('textmate-ai-button')) {
      log.debug('Global click handler detected AI button click');
      handleAIButtonClick(e);
    }
  }, true);
  
  // Add a MutationObserver to handle dynamically added content
  setupMutationObserver();
  
  // Add a MutationObserver to ensure container stays at the end of body
  setupContainerObserver();
  
  log.info('Event listeners added');
}

// Create a container for all TextMate elements
function createTextMateContainer() {
  // Remove existing container if any
  const existingContainer = document.getElementById('textmate-container');
  if (existingContainer) {
    existingContainer.remove();
  }
  
  // Create new container
  textmateContainer = document.createElement('div');
  textmateContainer.id = 'textmate-container';
  textmateContainer.style.position = 'fixed';
  textmateContainer.style.top = '0';
  textmateContainer.style.left = '0';
  textmateContainer.style.width = '100%';
  textmateContainer.style.height = '100%';
  textmateContainer.style.pointerEvents = 'none'; // Allow clicks to pass through
  textmateContainer.style.zIndex = '2147483647'; // Maximum possible z-index
  
  // Append to the end of body to ensure it's on top
  document.body.appendChild(textmateContainer);
  
  log.info('Container created');
}

// Setup MutationObserver to ensure container stays at the end of body
function setupContainerObserver() {
  const observer = new MutationObserver(function(mutations) {
    // Check if our container is still the last child of body
    if (document.body.lastChild !== textmateContainer) {
      log.info('Container is not at the end of body, moving it');
      // Move it to the end
      document.body.appendChild(textmateContainer);
    }
    
    // Also check if container still exists
    if (!document.getElementById('textmate-container')) {
      log.info('Container was removed, recreating it');
      createTextMateContainer();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: false
  });
  
  log.info('Container observer setup complete');
}

// Setup MutationObserver to handle dynamically added content
function setupMutationObserver() {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && isTextInputElement(node)) {
            log.info('Detected dynamically added text input');
            currentTextElement = node;
            showAIButton(node);
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  log.info('MutationObserver setup complete');
}

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(['openai_api_key', 'ai_model', 'writing_tone'], function(result) {
    if (result.openai_api_key) {
      apiKey = result.openai_api_key;
      log.info('API key loaded');
    } else {
      log.info('No API key found');
    }
    
    if (result.ai_model) {
      aiModel = result.ai_model;
      log.info('AI model set to', aiModel);
    }
  });
}

// Handle focus on text input fields
function handleFocusIn(event) {
  const element = event.target;
  
  // Check if the focused element is a text input or textarea
  if (isTextInputElement(element)) {
    log.info('Text input element focused');
    
    // Store the reference to the current text element
    currentTextElement = element;
    
    // Add a data attribute to help identify this element later
    if (!element.dataset.textmateId) {
      element.dataset.textmateId = Date.now();
    }
    
    // Show the AI button
    showAIButton(element);
    
    // Add a blur event listener to maintain the reference for a short time
    element.addEventListener('blur', function onBlur() {
      // Keep the reference for a short time to allow for button clicks
      setTimeout(() => {
        // Only clear if no new focus has happened
        if (currentTextElement === element) {
          log.info('Maintaining text element reference for button clicks');
        }
      }, 500);
      
      // Remove this listener after it fires once
      element.removeEventListener('blur', onBlur);
    });
  } else {
    // Don't immediately hide the button or clear the reference
    // This allows time for the button click to be processed
    setTimeout(() => {
      // Only hide if we haven't focused on another valid element
      if (!document.activeElement || !isTextInputElement(document.activeElement)) {
        hideAIButton();
      }
    }, 200);
  }
}

// Check if an element is a text input
function isTextInputElement(element) {
  const validTagNames = ['INPUT', 'TEXTAREA'];
  const validInputTypes = ['text', 'search', 'url', 'tel', 'email', 'password', null, ''];
  
  // Check for contenteditable divs
  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }
  
  // Check for input fields and textareas
  if (validTagNames.includes(element.tagName)) {
    if (element.tagName === 'INPUT') {
      return validInputTypes.includes(element.type);
    }
    return true;
  }
  
  return false;
}

// Create and show the AI button next to the text field
function showAIButton(element) {
  // Remove existing button if any
  hideAIButton();
  
  // Store the current text element reference
  currentTextElement = element;
  
  // Create new button
  aiButton = document.createElement('button');
  aiButton.className = 'textmate-ai-button';
  aiButton.innerHTML = '✨ AI';
  aiButton.type = 'button'; // Explicitly set button type
  
  // Store a reference to the associated text element
  aiButton.dataset.textElementId = Date.now(); // Use a timestamp as a unique ID
  
  // Add a data attribute to the text element to link it to the button
  element.dataset.textmateId = aiButton.dataset.textElementId;
  
  // Position the button next to the text field
  const rect = element.getBoundingClientRect();
  aiButton.style.position = 'absolute';
  aiButton.style.left = `${rect.right + 5}px`;
  aiButton.style.top = `${rect.top}px`;
  aiButton.style.zIndex = '2147483647'; // Maximum possible z-index value
  
  // Make sure the button is visible and clickable
  aiButton.style.display = 'block';
  aiButton.style.visibility = 'visible';
  aiButton.style.pointerEvents = 'auto';
  aiButton.style.opacity = '1';
  
  // Add to TextMate container instead of document body
  textmateContainer.appendChild(aiButton);
  log.info('AI button added to container');
  
  // Add multiple event handlers to ensure at least one works
  aiButton.addEventListener('click', handleAIButtonClick, true); // Use capture phase
  aiButton.onclick = handleAIButtonClick; // Direct onclick property
  
  // Add direct click handler with HTML attribute
  aiButton.setAttribute('onclick', 'this.dispatchEvent(new CustomEvent("textmate-click"))');
  aiButton.addEventListener('textmate-click', handleAIButtonClick, true);
  
  // Add additional mousedown event for debugging
  aiButton.addEventListener('mousedown', function(e) {
    log.info('AI button mousedown detected');
    // Try to trigger click on mousedown as a fallback
    setTimeout(() => {
      log.info('Triggering click from mousedown');
      showAIOptionsForButton(aiButton);
    }, 100);
  }, true);
  
  // Test if button is clickable
  log.info('Button element:', aiButton);
  log.info('Button clickable:', (typeof aiButton.click === 'function'));
  
  // Add a keyboard shortcut to trigger the AI button (Alt+A)
  document.addEventListener('keydown', function(e) {
    if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      log.info('Alt+A shortcut detected');
      if (aiButton) {
        showAIOptionsForButton(aiButton);
      }
    }
  });
}

// Handle AI button click
function handleAIButtonClick(e) {
  log.info('AI button clicked');
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  // Get the button that was clicked
  const button = e.target.closest('.textmate-ai-button');
  
  if (button) {
    log.info('Found button element from click event');
    // Use our direct method to show options for this specific button
    showAIOptionsForButton(button);
  } else {
    log.info('Using default AI button');
    // Force the options to show with a slight delay to ensure event propagation is complete
    setTimeout(() => {
      log.info('Executing showAIOptions after delay');
      showAIOptions();
    }, 50);
  }
  
  return false; // Prevent default and stop propagation
}

// Manually trigger the AI button
function triggerAIButton() {
  log.info('Manually triggering AI button');
  
  // Force the options to show directly
  showAIOptions();
}

// Hide the AI button
function hideAIButton() {
  if (aiButton && aiButton.parentNode) {
    aiButton.parentNode.removeChild(aiButton);
    aiButton = null;
  }
}

// Show AI options menu
function showAIOptions() {
  log.info('Showing AI options');
  
  // Remove any existing popup first
  const existingPopup = document.querySelector('.textmate-ai-options');
  if (existingPopup) {
    existingPopup.parentNode.removeChild(existingPopup);
    log.info('Removed existing popup');
  }
  
  // Check if we have a current text element
  if (!currentTextElement) {
    log.info('No current text element');
    
    // Try to find the text element using the data attribute
    if (aiButton && aiButton.dataset.textElementId) {
      const textElementId = aiButton.dataset.textElementId;
      const textElement = document.querySelector(`[data-textmate-id="${textElementId}"]`);
      
      if (textElement) {
        log.info('Recovered text element from data attribute');
        currentTextElement = textElement;
      } else {
        // If we still can't find it, show a notification
        showNotification('Please click in a text field first');
        return;
      }
    } else {
      showNotification('Please click in a text field first');
      return;
    }
  }
  
  if (!aiButton) {
    log.info('No AI button found');
    return;
  }
  
  try {
    // Create options popup
    const optionsPopup = document.createElement('div');
    optionsPopup.className = 'textmate-ai-options';
    optionsPopup.innerHTML = `
      <div class="textmate-ai-option" data-action="generate">Generate AI Text</div>
      <div class="textmate-ai-option" data-action="rewrite">Rewrite</div>
      <div class="textmate-ai-option" data-action="summarize">Summarize</div>
      <div class="textmate-ai-option" data-action="expand">Expand</div>
    `;
    
    // Position the popup
    const rect = aiButton.getBoundingClientRect();
    log.info('Button position for popup:', rect);
    
    optionsPopup.style.position = 'absolute';
    optionsPopup.style.left = `${rect.left}px`;
    optionsPopup.style.top = `${rect.bottom + 5}px`;
    optionsPopup.style.zIndex = '2147483647'; // Maximum possible z-index value
    
    // Add event listeners
    const optionElements = optionsPopup.querySelectorAll('.textmate-ai-option');
    optionElements.forEach(option => {
      option.addEventListener('click', function(e) {
        log.info('Option clicked', e.target.getAttribute('data-action'));
        const action = e.target.getAttribute('data-action');
        if (action) {
          handleAIAction(action);
          if (optionsPopup.parentNode) {
            optionsPopup.parentNode.removeChild(optionsPopup);
          }
        }
        e.stopPropagation();
        e.preventDefault();
      }, true);
    });
    
    // Close when clicking outside
    document.addEventListener('click', function closePopup(e) {
      log.info('Document click detected, checking if should close popup');
      if (!optionsPopup.contains(e.target) && e.target !== aiButton) {
        log.info('Closing popup');
        if (optionsPopup.parentNode) {
          optionsPopup.parentNode.removeChild(optionsPopup);
        }
        document.removeEventListener('click', closePopup);
      }
    });
    
    // Add to TextMate container instead of document body
    textmateContainer.appendChild(optionsPopup);
    log.info('Options popup added to container');
    
    // Force a reflow to ensure the popup is rendered
    optionsPopup.getBoundingClientRect();
    
    // Add a visible indicator that the popup is shown
    showNotification('AI options menu opened');
  } catch (error) {
    log.error('Error showing options menu:', error);
    showNotification('Error showing AI options: ' + error.message);
  }
}

// Generate prompt based on action and text input
function generatePrompt(action, text) {
  switch (action) {
    case 'rewrite':
      return `Rewrite the following text using clear, easy-to-understand language. Fix any spelling or grammar mistakes, but do not change or expand acronyms:: Text : ${text}`;
    case 'summarize':
      return `Summarize the following text: ${text}`;
    case 'expand':
      return `Expand on the following text with more details: ${text}`;
    case 'generate':
      return text; // For generate action, the text is already the prompt
    default:
      log.error('Unknown action for prompt generation:', action);
      return text;
  }
}

// Handle AI actions (generate, rewrite, summarize, expand)
function handleAIAction(action) {
  log.info('Handling AI action:', action);
  
  if (!currentTextElement) {
    log.error('No current text element for AI action');
    showNotification('Please click in a text field first');
    return;
  }
  
  // Store a reference to the text element to ensure it's not lost
  const textElement = currentTextElement;
  
  const selectedText = getSelectedText(textElement);
  const fullText = getElementText(textElement);
  
  log.info('Selected text length:', selectedText ? selectedText.length : 0);
  log.info('Full text length:', fullText ? fullText.length : 0);
  
  switch (action) {
    case 'generate':
      log.info('Showing prompt popup for generate action');
      showPromptPopup('What would you like to generate?', '', (prompt) => {
        // Ensure we still have the text element reference
        if (currentTextElement !== textElement) {
          log.info('Restoring text element reference');
          currentTextElement = textElement;
        }
        
        log.info('Generating text with prompt:', prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''));
        generateAIText(generatePrompt('generate', prompt), false);
      });
      break;
    case 'rewrite':
      if (selectedText) {
        generateAIText(generatePrompt('rewrite', selectedText), true);
      } else {
        showNotification('Please select text to rewrite');
      }
      break;
    case 'summarize':
      if (selectedText) {
        generateAIText(generatePrompt('summarize', selectedText), true);
      } else {
        generateAIText(generatePrompt('summarize', fullText), false);
      }
      break;
    case 'expand':
      if (selectedText) {
        generateAIText(generatePrompt('expand', selectedText), true);
      } else {
        showNotification('Please select text to expand');
      }
      break;
    default:
      log.error('Unknown action:', action);
      showNotification('Unknown action: ' + action);
  }
}

// Get selected text from an element
function getSelectedText(element) {
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    if (start !== end) {
      return element.value.substring(start, end);
    }
  } else if (window.getSelection) {
    return window.getSelection().toString();
  }
  return '';
}

// Get all text from an element
function getElementText(element) {
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    return element.value;
  } else {
    return element.innerText || element.textContent;
  }
}

// Show a popup for entering a custom prompt
function showPromptPopup(title, defaultValue, callback) {
  log.info('Showing prompt popup');
  
  // Store the current text element to ensure it's not lost
  const textElement = currentTextElement;
  
  // Create popup
  const popup = document.createElement('div');
  popup.className = 'textmate-ai-prompt-popup';
  popup.innerHTML = `
    <div class="textmate-ai-prompt-header">${title}</div>
    <textarea class="textmate-ai-prompt-input">${defaultValue}</textarea>
    <div class="textmate-ai-prompt-buttons">
      <button class="textmate-ai-prompt-cancel">Cancel</button>
      <button class="textmate-ai-prompt-submit">Generate</button>
    </div>
  `;
  
  // Position in center of screen
  popup.style.position = 'fixed';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.zIndex = '2147483647'; // Maximum possible z-index value
  
  // Add event listeners
  const cancelButton = popup.querySelector('.textmate-ai-prompt-cancel');
  const submitButton = popup.querySelector('.textmate-ai-prompt-submit');
  const textArea = popup.querySelector('.textmate-ai-prompt-input');
  
  cancelButton.addEventListener('click', () => {
    log.info('Prompt popup canceled');
    popup.parentNode.removeChild(popup);
  });
  
  submitButton.addEventListener('click', () => {
    const promptText = textArea.value.trim();
    log.info('Prompt submitted, length:', promptText.length);
    
    if (promptText) {
      // Restore the text element reference if needed
      if (currentTextElement !== textElement) {
        log.info('Restoring text element reference in prompt popup');
        currentTextElement = textElement;
      }
      
      // Remove the popup first
      popup.parentNode.removeChild(popup);
      
      // Then call the callback
      callback(promptText);
    } else {
      showNotification('Please enter a prompt');
    }
  });
  
  // Handle Enter key in textarea
  textArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      submitButton.click();
    }
  });
  
  // Add to TextMate container instead of document body
  textmateContainer.appendChild(popup);
  
  // Focus the textarea after a short delay to ensure it's ready
  setTimeout(() => {
    textArea.focus();
  }, 50);
}

// Generate AI text using OpenAI API
function generateAIText(prompt, replaceSelected = false) {
  if (!apiKey) {
    showNotification('Please set your OpenAI API key in the extension settings');
    log.info('No API key available');
    return;
  }
  
  // Verify we have a valid text element
  if (!currentTextElement) {
    log.error('No current text element when generating text');
    showNotification('Error: No text field selected');
    return;
  }
  
  log.info('Generating AI text with model:', aiModel);
  log.info('Current text element:', currentTextElement);
  
  // Always save state before making any changes
  log.info('Saving current state before AI generation');
  stateManager.saveState(currentTextElement);
  
  // Determine the action type from the prompt
  let action = 'Generating';
  if (prompt.startsWith('Rewrite')) {
    action = 'Rewriting';
  } else if (prompt.startsWith('Summarize')) {
    action = 'Summarizing';
  } else if (prompt.startsWith('Expand')) {
    action = 'Expanding';
  }
  
  // Show loading indicator with the appropriate action
  const loadingIndicator = showLoadingIndicator(action);
  
  // Call OpenAI API
  fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: aiModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    // Hide loading indicator
    hideLoadingIndicator(loadingIndicator);
    
    // Extract generated text
    const generatedText = data.choices[0].message.content.trim();
    log.info('Text generated successfully:', generatedText.substring(0, 50) + '...');
    
    // Insert text into the current element
    insertGeneratedText(generatedText, replaceSelected);
  })
  .catch(error => {
    hideLoadingIndicator(loadingIndicator);
    showNotification(`Error: ${error.message}`);
    log.error('OpenAI API Error:', error);
  });
}

// Insert generated text into the current text element
function insertGeneratedText(text, replaceSelected) {
  log.info('Inserting generated text into element');
  
  if (!currentTextElement) {
    log.error('No current text element for insertion');
    showNotification('Error: No text field selected for insertion');
    return;
  }
  
  try {
    if (currentTextElement.tagName === 'INPUT' || currentTextElement.tagName === 'TEXTAREA') {
      log.info('Inserting into input/textarea element');
      
      if (replaceSelected) {
        const start = currentTextElement.selectionStart;
        const end = currentTextElement.selectionEnd;
        const currentValue = currentTextElement.value;
        
        // Replace selected text
        currentTextElement.value = currentValue.substring(0, start) + text + currentValue.substring(end);
        
        // Set cursor position after inserted text
        currentTextElement.selectionStart = start + text.length;
        currentTextElement.selectionEnd = start + text.length;
        
        log.info('Replaced selected text');
      } else {
        // Get current cursor position
        const cursorPos = currentTextElement.selectionEnd || currentTextElement.value.length;
        const currentValue = currentTextElement.value;
        
        // Insert at cursor position
        currentTextElement.value = currentValue.substring(0, cursorPos) + text + currentValue.substring(cursorPos);
        
        // Move cursor to end of inserted text
        currentTextElement.selectionStart = cursorPos + text.length;
        currentTextElement.selectionEnd = cursorPos + text.length;
        
        log.info('Inserted at cursor position');
      }
      
    } else if (currentTextElement.getAttribute('contenteditable') === 'true') {
      log.info('Inserting into contenteditable element');
      
      const selection = window.getSelection();
      if (replaceSelected && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
      } else {
        currentTextElement.appendChild(document.createTextNode(text));
      }
    } else {
      // Fallback for other types of elements
      log.info('Using fallback insertion method for element type:', currentTextElement.tagName);
      
      // Try to set innerText or textContent as a fallback
      if (typeof currentTextElement.innerText !== 'undefined') {
        currentTextElement.innerText += text;
      } else if (typeof currentTextElement.textContent !== 'undefined') {
        currentTextElement.textContent += text;
      } else {
        throw new Error('Unsupported element type for text insertion');
      }
    }
    
    // Trigger input event to notify the page of the change
    log.info('Triggering input event');
    const inputEvent = new Event('input', { bubbles: true });
    currentTextElement.dispatchEvent(inputEvent);
    
    // Also trigger change event for good measure
    const changeEvent = new Event('change', { bubbles: true });
    currentTextElement.dispatchEvent(changeEvent);
    
    // Focus the element to ensure it's active
    currentTextElement.focus();
    
    // Show success notification
    showNotification('Text inserted successfully! Press Ctrl+Z to undo');
  } catch (error) {
    log.error('Error inserting text:', error);
    showNotification('Error inserting text: ' + error.message);
  }
}

// Show loading indicator
function showLoadingIndicator(action = 'Generating') {
  const loader = document.createElement('div');
  loader.className = 'textmate-ai-loader';
  loader.innerHTML = `${action}...`;
  
  // Position near the current text element
  const rect = currentTextElement.getBoundingClientRect();
  loader.style.position = 'absolute';
  loader.style.left = `${rect.left}px`;
  loader.style.top = `${rect.bottom + 5}px`;
  loader.style.zIndex = '2147483647'; // Maximum possible z-index value
  
  // Add to TextMate container instead of document body
  textmateContainer.appendChild(loader);
  return loader;
}

// Hide loading indicator
function hideLoadingIndicator(loader) {
  if (loader && loader.parentNode) {
    loader.parentNode.removeChild(loader);
  }
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'textmate-ai-notification';
  notification.textContent = message;
  
  // Position at the top of the page
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.zIndex = '2147483647'; // Maximum possible z-index value
  
  // Add to TextMate container instead of document body
  textmateContainer.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(event) {
  // Check if Ctrl+Z is pressed and we have a previous state
  if (event.ctrlKey && !event.shiftKey && (event.key === 'z' || event.key === 'Z')) {
    if (stateManager.hasPreviousState()) {
      event.preventDefault();
      stateManager.restoreState();
      return;
    }
  }
  
  // Check if Ctrl+Shift is pressed
  if (event.ctrlKey && event.shiftKey) {
    switch (event.key) {
      case 'G': // Ctrl+Shift+G - Generate AI response
      case 'g':
        event.preventDefault();
        if (currentTextElement) {
          showPromptPopup('What would you like to generate?', '', (prompt) => {
            generateAIText(generatePrompt('generate', prompt));
          });
        }
        break;
      case 'R': // Ctrl+Shift+R - Rewrite selected text
      case 'r':
        event.preventDefault();
        if (currentTextElement) {
          const selectedText = getSelectedText(currentTextElement);
          if (selectedText) {
            generateAIText(generatePrompt('rewrite', selectedText), true);
          } else {
            showNotification('Please select text to rewrite');
          }
        }
        break;
      case 'Z': // Ctrl+Shift+Z - Summarize selected text (changed from S to avoid screenshot conflict)
      case 'z':
        event.preventDefault();
        if (currentTextElement) {
          const selectedText = getSelectedText(currentTextElement);
          if (selectedText) {
            generateAIText(generatePrompt('summarize', selectedText), true);
          } else {
            const fullText = getElementText(currentTextElement);
            generateAIText(generatePrompt('summarize', fullText), false);
          }
        }
        break;
      case 'E': // Ctrl+Shift+E - Expand selected text
      case 'e':
        event.preventDefault();
        if (currentTextElement) {
          const selectedText = getSelectedText(currentTextElement);
          if (selectedText) {
            generateAIText(generatePrompt('expand', selectedText), true);
          } else {
            showNotification('Please select text to expand');
          }
        }
        break;
    }
  }
  
  // Alt+A shortcut for showing AI options
  if (event.altKey && (event.key === 'a' || event.key === 'A')) {
    event.preventDefault();
    log.info('Alt+A shortcut detected');
    if (aiButton && currentTextElement) {
      showAIOptionsForButton(aiButton);
    }
  }
}

// Create a direct method to show AI options for a specific button
function showAIOptionsForButton(button) {
  log.info('Showing AI options for specific button');
  
  // Find the associated text element
  let textElement = null;
  
  if (button.dataset.textElementId) {
    const textElementId = button.dataset.textElementId;
    textElement = document.querySelector(`[data-textmate-id="${textElementId}"]`);
    
    if (textElement) {
      log.info('Found associated text element');
      currentTextElement = textElement;
    }
  }
  
  if (!textElement && currentTextElement) {
    log.info('Using current text element');
    textElement = currentTextElement;
  }
  
  if (!textElement) {
    log.info('No text element found for this button');
    showNotification('Please click in a text field first');
    return;
  }
  
  // Now show the options
  showAIOptions();
}

// Initialize the extension when the page loads
log.info('Content script loaded');
initialize(); 