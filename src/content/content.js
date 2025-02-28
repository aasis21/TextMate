// TextMate - AI Text Assistant
// Content script that injects AI functionality into text boxes

// Create a simple logger for the content script
const Logger = {
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
  },
  
  // Default configuration
  config: {
    level: 0, // DEBUG
    environment: 'development',
    enableConsole: true,
    version: '1.0.0'
  },
  
  // Configure the logger
  configure: function(config) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  },
  
  // Create a child logger with a specific module name
  createChildLogger: function(moduleName) {
    return {
      debug: function(message, data) {
        if (Logger.config.level <= Logger.LogLevel.DEBUG) {
          console.debug(`[${Logger.config.environment}][${moduleName}] DEBUG:`, message, data || '');
        }
      },
      info: function(message, data) {
        if (Logger.config.level <= Logger.LogLevel.INFO) {
          console.info(`[${Logger.config.environment}][${moduleName}] INFO:`, message, data || '');
        }
      },
      warn: function(message, data) {
        if (Logger.config.level <= Logger.LogLevel.WARN) {
          console.warn(`[${Logger.config.environment}][${moduleName}] WARN:`, message, data || '');
        }
      },
      error: function(message, data) {
        if (Logger.config.level <= Logger.LogLevel.ERROR) {
          console.error(`[${Logger.config.environment}][${moduleName}] ERROR:`, message, data || '');
        }
      }
    };
  }
};

// Create a logger for this module
const logger = Logger.createChildLogger('Content');

// Configure logger - hardcoded for now
Logger.configure({
  level: Logger.LogLevel.DEBUG,
  environment: 'development',
  enableConsole: true,
  version: '1.0.0'
});

// Global variables
let apiKey = '';
let aiModel = 'gpt-3.5-turbo';
let currentTextElement = null;
let aiButton = null;
let aiPopup = null;
let textmateContainer = null; // Container for all TextMate elements

// Initialize the extension
function initialize() {
  logger.info('Initializing extension');
  
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
      logger.debug('Global click handler detected AI button click');
      handleAIButtonClick(e);
    }
  }, true);
  
  // Add a MutationObserver to handle dynamically added content
  setupMutationObserver();
  
  // Add a MutationObserver to ensure container stays at the end of body
  setupContainerObserver();
  
  logger.info('Event listeners added');
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
  
  logger.info('Container created');
}

// Setup MutationObserver to ensure container stays at the end of body
function setupContainerObserver() {
  const observer = new MutationObserver(function(mutations) {
    // Check if our container is still the last child of body
    if (document.body.lastChild !== textmateContainer) {
      logger.info('Container is not at the end of body, moving it');
      // Move it to the end
      document.body.appendChild(textmateContainer);
    }
    
    // Also check if container still exists
    if (!document.getElementById('textmate-container')) {
      logger.info('Container was removed, recreating it');
      createTextMateContainer();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: false
  });
  
  logger.info('Container observer setup complete');
}

// Setup MutationObserver to handle dynamically added content
function setupMutationObserver() {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && isTextInputElement(node)) {
            logger.info('Detected dynamically added text input');
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
  
  logger.info('MutationObserver setup complete');
}

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(['openai_api_key', 'ai_model', 'writing_tone'], function(result) {
    if (result.openai_api_key) {
      apiKey = result.openai_api_key;
      logger.info('API key loaded');
    } else {
      logger.info('No API key found');
    }
    
    if (result.ai_model) {
      aiModel = result.ai_model;
      logger.info('AI model set to', aiModel);
    }
  });
}

// Handle focus on text input fields
function handleFocusIn(event) {
  const element = event.target;
  
  // Check if the focused element is a text input or textarea
  if (isTextInputElement(element)) {
    logger.info('Text input element focused');
    
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
          logger.info('Maintaining text element reference for button clicks');
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
  logger.info('AI button added to container');
  
  // Add multiple event handlers to ensure at least one works
  aiButton.addEventListener('click', handleAIButtonClick, true); // Use capture phase
  aiButton.onclick = handleAIButtonClick; // Direct onclick property
  
  // Add direct click handler with HTML attribute
  aiButton.setAttribute('onclick', 'this.dispatchEvent(new CustomEvent("textmate-click"))');
  aiButton.addEventListener('textmate-click', handleAIButtonClick, true);
  
  // Add additional mousedown event for debugging
  aiButton.addEventListener('mousedown', function(e) {
    logger.info('AI button mousedown detected');
    // Try to trigger click on mousedown as a fallback
    setTimeout(() => {
      logger.info('Triggering click from mousedown');
      showAIOptionsForButton(aiButton);
    }, 100);
  }, true);
  
  // Test if button is clickable
  logger.info('Button element:', aiButton);
  logger.info('Button clickable:', (typeof aiButton.click === 'function'));
  
  // Add a keyboard shortcut to trigger the AI button (Alt+A)
  document.addEventListener('keydown', function(e) {
    if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      logger.info('Alt+A shortcut detected');
      if (aiButton) {
        showAIOptionsForButton(aiButton);
      }
    }
  });
}

// Handle AI button click
function handleAIButtonClick(e) {
  logger.info('AI button clicked');
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  // Get the button that was clicked
  const button = e.target.closest('.textmate-ai-button');
  
  if (button) {
    logger.info('Found button element from click event');
    // Use our direct method to show options for this specific button
    showAIOptionsForButton(button);
  } else {
    logger.info('Using default AI button');
    // Force the options to show with a slight delay to ensure event propagation is complete
    setTimeout(() => {
      logger.info('Executing showAIOptions after delay');
      showAIOptions();
    }, 50);
  }
  
  return false; // Prevent default and stop propagation
}

// Manually trigger the AI button
function triggerAIButton() {
  logger.info('Manually triggering AI button');
  
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
  logger.info('Showing AI options');
  
  // Remove any existing popup first
  const existingPopup = document.querySelector('.textmate-ai-options');
  if (existingPopup) {
    existingPopup.parentNode.removeChild(existingPopup);
    logger.info('Removed existing popup');
  }
  
  // Check if we have a current text element
  if (!currentTextElement) {
    logger.info('No current text element');
    
    // Try to find the text element using the data attribute
    if (aiButton && aiButton.dataset.textElementId) {
      const textElementId = aiButton.dataset.textElementId;
      const textElement = document.querySelector(`[data-textmate-id="${textElementId}"]`);
      
      if (textElement) {
        logger.info('Recovered text element from data attribute');
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
    logger.info('No AI button found');
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
    logger.info('Button position for popup:', rect);
    
    optionsPopup.style.position = 'absolute';
    optionsPopup.style.left = `${rect.left}px`;
    optionsPopup.style.top = `${rect.bottom + 5}px`;
    optionsPopup.style.zIndex = '2147483647'; // Maximum possible z-index value
    
    // Add event listeners
    const optionElements = optionsPopup.querySelectorAll('.textmate-ai-option');
    optionElements.forEach(option => {
      option.addEventListener('click', function(e) {
        logger.info('Option clicked', e.target.getAttribute('data-action'));
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
      logger.info('Document click detected, checking if should close popup');
      if (!optionsPopup.contains(e.target) && e.target !== aiButton) {
        logger.info('Closing popup');
        if (optionsPopup.parentNode) {
          optionsPopup.parentNode.removeChild(optionsPopup);
        }
        document.removeEventListener('click', closePopup);
      }
    });
    
    // Add to TextMate container instead of document body
    textmateContainer.appendChild(optionsPopup);
    logger.info('Options popup added to container');
    
    // Force a reflow to ensure the popup is rendered
    optionsPopup.getBoundingClientRect();
    
    // Add a visible indicator that the popup is shown
    showNotification('AI options menu opened');
  } catch (error) {
    logger.error('Error showing options menu:', error);
    showNotification('Error showing AI options: ' + error.message);
  }
}

// Handle AI actions (generate, rewrite, summarize, expand)
function handleAIAction(action) {
  logger.info('Handling AI action:', action);
  
  if (!currentTextElement) {
    logger.error('No current text element for AI action');
    showNotification('Please click in a text field first');
    return;
  }
  
  // Store a reference to the text element to ensure it's not lost
  const textElement = currentTextElement;
  
  const selectedText = getSelectedText(textElement);
  const fullText = getElementText(textElement);
  
  logger.info('Selected text length:', selectedText ? selectedText.length : 0);
  logger.info('Full text length:', fullText ? fullText.length : 0);
  
  switch (action) {
    case 'generate':
      logger.info('Showing prompt popup for generate action');
      showPromptPopup('What would you like to generate?', '', (prompt) => {
        // Ensure we still have the text element reference
        if (currentTextElement !== textElement) {
          logger.info('Restoring text element reference');
          currentTextElement = textElement;
        }
        
        logger.info('Generating text with prompt:', prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''));
        generateAIText(prompt, false);
      });
      break;
    case 'rewrite':
      if (selectedText) {
        generateAIText(`Rewrite the following text: ${selectedText}`, true);
      } else {
        showNotification('Please select text to rewrite');
      }
      break;
    case 'summarize':
      if (selectedText) {
        generateAIText(`Summarize the following text: ${selectedText}`, true);
      } else {
        generateAIText(`Summarize the following text: ${fullText}`, false);
      }
      break;
    case 'expand':
      if (selectedText) {
        generateAIText(`Expand on the following text with more details: ${selectedText}`, true);
      } else {
        showNotification('Please select text to expand');
      }
      break;
    default:
      logger.error('Unknown action:', action);
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
  logger.info('Showing prompt popup');
  
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
    logger.info('Prompt popup canceled');
    popup.parentNode.removeChild(popup);
  });
  
  submitButton.addEventListener('click', () => {
    const promptText = textArea.value.trim();
    logger.info('Prompt submitted, length:', promptText.length);
    
    if (promptText) {
      // Restore the text element reference if needed
      if (currentTextElement !== textElement) {
        logger.info('Restoring text element reference in prompt popup');
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
    logger.info('No API key available');
    return;
  }
  
  // Verify we have a valid text element
  if (!currentTextElement) {
    logger.error('No current text element when generating text');
    showNotification('Error: No text field selected');
    return;
  }
  
  logger.info('Generating AI text with model:', aiModel);
  logger.info('Current text element:', currentTextElement);
  
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
    logger.info('Text generated successfully:', generatedText.substring(0, 50) + '...');
    
    // Insert text into the current element
    insertGeneratedText(generatedText, replaceSelected);
  })
  .catch(error => {
    hideLoadingIndicator(loadingIndicator);
    showNotification(`Error: ${error.message}`);
    logger.error('OpenAI API Error:', error);
  });
}

// Insert generated text into the current text element
function insertGeneratedText(text, replaceSelected) {
  logger.info('Inserting generated text into element');
  
  if (!currentTextElement) {
    logger.error('No current text element for insertion');
    showNotification('Error: No text field selected for insertion');
    return;
  }
  
  try {
    if (currentTextElement.tagName === 'INPUT' || currentTextElement.tagName === 'TEXTAREA') {
      logger.info('Inserting into input/textarea element');
      
      if (replaceSelected) {
        const start = currentTextElement.selectionStart;
        const end = currentTextElement.selectionEnd;
        const currentValue = currentTextElement.value;
        
        // Replace selected text
        currentTextElement.value = currentValue.substring(0, start) + text + currentValue.substring(end);
        
        // Set cursor position after inserted text
        currentTextElement.selectionStart = start + text.length;
        currentTextElement.selectionEnd = start + text.length;
        
        logger.info('Replaced selected text');
      } else {
        // Get current cursor position
        const cursorPos = currentTextElement.selectionEnd || currentTextElement.value.length;
        const currentValue = currentTextElement.value;
        
        // Insert at cursor position
        currentTextElement.value = currentValue.substring(0, cursorPos) + text + currentValue.substring(cursorPos);
        
        // Move cursor to end of inserted text
        currentTextElement.selectionStart = cursorPos + text.length;
        currentTextElement.selectionEnd = cursorPos + text.length;
        
        logger.info('Inserted at cursor position');
      }
    } else if (currentTextElement.getAttribute('contenteditable') === 'true') {
      logger.info('Inserting into contenteditable element');
      
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
      logger.info('Using fallback insertion method for element type:', currentTextElement.tagName);
      
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
    logger.info('Triggering input event');
    const inputEvent = new Event('input', { bubbles: true });
    currentTextElement.dispatchEvent(inputEvent);
    
    // Also trigger change event for good measure
    const changeEvent = new Event('change', { bubbles: true });
    currentTextElement.dispatchEvent(changeEvent);
    
    // Focus the element to ensure it's active
    currentTextElement.focus();
    
    // Show success notification
    showNotification('Text inserted successfully');
  } catch (error) {
    logger.error('Error inserting text:', error);
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
  // Check if Ctrl+Shift is pressed
  if (event.ctrlKey && event.shiftKey) {
    switch (event.key) {
      case 'A': // Ctrl+Shift+A - Generate AI response
      case 'a':
        event.preventDefault();
        if (currentTextElement) {
          showPromptPopup('What would you like to generate?', '', (prompt) => {
            generateAIText(prompt);
          });
        }
        break;
      case 'R': // Ctrl+Shift+R - Rewrite selected text
      case 'r':
        event.preventDefault();
        if (currentTextElement) {
          const selectedText = getSelectedText(currentTextElement);
          if (selectedText) {
            generateAIText(`Rewrite the following text: ${selectedText}`, true);
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
            generateAIText(`Summarize the following text: ${selectedText}`, true);
          } else {
            const fullText = getElementText(currentTextElement);
            generateAIText(`Summarize the following text: ${fullText}`, false);
          }
        }
        break;
      case 'E': // Ctrl+Shift+E - Expand selected text
      case 'e':
        event.preventDefault();
        if (currentTextElement) {
          const selectedText = getSelectedText(currentTextElement);
          if (selectedText) {
            generateAIText(`Expand on the following text with more details: ${selectedText}`, true);
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
    logger.info('Alt+A shortcut detected');
    if (aiButton && currentTextElement) {
      showAIOptionsForButton(aiButton);
    }
  }
}

// Create a direct method to show AI options for a specific button
function showAIOptionsForButton(button) {
  logger.info('Showing AI options for specific button');
  
  // Find the associated text element
  let textElement = null;
  
  if (button.dataset.textElementId) {
    const textElementId = button.dataset.textElementId;
    textElement = document.querySelector(`[data-textmate-id="${textElementId}"]`);
    
    if (textElement) {
      logger.info('Found associated text element');
      currentTextElement = textElement;
    }
  }
  
  if (!textElement && currentTextElement) {
    logger.info('Using current text element');
    textElement = currentTextElement;
  }
  
  if (!textElement) {
    logger.info('No text element found for this button');
    showNotification('Please click in a text field first');
    return;
  }
  
  // Now show the options
  showAIOptions();
}

// Initialize the extension when the page loads
logger.info('Content script loaded');
initialize(); 