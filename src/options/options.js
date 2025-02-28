// TextMate - AI Text Assistant
// Options page script

// Import logger
import Logger from '../utils/logger.js';

// Create a logger for this module
const logger = Logger.createChildLogger('Options');

document.addEventListener('DOMContentLoaded', function() {
  logger.info('Options page initialized');
  
  // Get DOM elements
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const successMessage = document.getElementById('success-message');
  const errorMessage = document.getElementById('error-message');
  const modelRadios = document.querySelectorAll('input[name="ai-model"]');
  const toneRadios = document.querySelectorAll('input[name="writing-tone"]');
  const devModeToggle = document.getElementById('dev-mode-toggle');
  
  // Load saved settings
  loadSettings();
  
  // Save button click handler
  saveBtn.addEventListener('click', saveSettings);
  
  // Load settings from storage
  function loadSettings() {
    logger.debug('Loading settings from storage');
    chrome.storage.sync.get(['openai_api_key', 'ai_model', 'writing_tone', 'development_mode'], function(result) {
      // Set API key if it exists
      if (result.openai_api_key) {
        apiKeyInput.value = result.openai_api_key;
        logger.info('API key loaded from storage');
      } else {
        logger.warn('No API key found in storage');
      }
      
      // Set AI model if it exists
      if (result.ai_model) {
        for (const radio of modelRadios) {
          if (radio.value === result.ai_model) {
            radio.checked = true;
            logger.info('AI model loaded from storage', { model: result.ai_model });
            break;
          }
        }
      }
      
      // Set writing tone if it exists
      if (result.writing_tone) {
        for (const radio of toneRadios) {
          if (radio.value === result.writing_tone) {
            radio.checked = true;
            logger.info('Writing tone loaded from storage', { tone: result.writing_tone });
            break;
          }
        }
      }
      
      // Set development mode if it exists
      if (result.development_mode !== undefined) {
        devModeToggle.checked = result.development_mode;
        logger.info('Development mode loaded from storage', { devMode: result.development_mode });
      }
    });
  }
  
  // Save settings to storage
  function saveSettings() {
    logger.info('Save settings button clicked');
    
    // Get API key
    const apiKey = apiKeyInput.value.trim();
    
    // Validate API key
    if (!apiKey) {
      logger.warn('API key validation failed - empty key');
      showError('Please enter your OpenAI API key');
      return;
    }
    
    // Get selected AI model
    let selectedModel = 'gpt-3.5-turbo'; // Default
    for (const radio of modelRadios) {
      if (radio.checked) {
        selectedModel = radio.value;
        break;
      }
    }
    
    // Get selected writing tone
    let selectedTone = 'professional'; // Default
    for (const radio of toneRadios) {
      if (radio.checked) {
        selectedTone = radio.value;
        break;
      }
    }
    
    // Get development mode setting
    const developmentMode = devModeToggle.checked;
    
    logger.info('Saving settings to storage', { 
      model: selectedModel, 
      tone: selectedTone,
      hasApiKey: !!apiKey,
      developmentMode: developmentMode
    });
    
    // Save to storage
    chrome.storage.sync.set({
      'openai_api_key': apiKey,
      'ai_model': selectedModel,
      'writing_tone': selectedTone,
      'development_mode': developmentMode
    }, function() {
      // Check for error
      if (chrome.runtime.lastError) {
        logger.error('Error saving settings', { error: chrome.runtime.lastError.message });
        showError('Error saving settings: ' + chrome.runtime.lastError.message);
      } else {
        logger.info('Settings saved successfully');
        showSuccess('Settings saved successfully!');
        
        // Note: We're no longer sending messages about setting changes
        // Changes will be picked up when components check storage again
      }
    });
  }
  
  // Show success message
  function showSuccess(message) {
    logger.debug('Showing success message', { message });
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    
    // Hide after 3 seconds
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 3000);
  }
  
  // Show error message
  function showError(message) {
    logger.debug('Showing error message', { message });
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    
    // Hide after 3 seconds
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 3000);
  }
}); 