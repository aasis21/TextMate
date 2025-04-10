// TextMate - AI Text Assistant
// Popup script

// Import logger
import Logger from '../utils/logger.js';

// Create a logger for this module
const logger = Logger.createChildLogger('Popup');

document.addEventListener('DOMContentLoaded', function() {
  logger.info('Popup initialized');
  
  // Get DOM elements
  const inputBox = document.getElementById('input-box');
  const actionBtn = document.getElementById('action-btn');
  const copyBtn = document.getElementById('copy-btn');
  const generateModeBtn = document.getElementById('generate-mode-btn');
  const rewriteModeBtn = document.getElementById('rewrite-mode-btn');
  const optionsLink = document.getElementById('options-link');
  const helpLink = document.getElementById('help-link');
  
  // Track current mode
  let currentMode = 'generate';
  
  // Check if API key is set
  chrome.storage.sync.get(['openai_api_key'], function(result) {
    if (!result.openai_api_key) {
      logger.warn('No API key found in storage');
      inputBox.placeholder = 'Please set your OpenAI API key in Settings first...';
      inputBox.disabled = true;
      actionBtn.disabled = true;
    } else {
      logger.info('API key found in storage');
    }
  });
  
  // Mode toggle handlers
  generateModeBtn.addEventListener('click', function() {
    if (currentMode !== 'generate') {
      setMode('generate');
    }
  });
  
  rewriteModeBtn.addEventListener('click', function() {
    if (currentMode !== 'rewrite') {
      setMode('rewrite');
    }
  });
  
  // Action button click handler
  actionBtn.addEventListener('click', function() {
    const text = inputBox.value.trim();
    if (!text) return;
    
    logger.info(`${currentMode} button clicked`, { textLength: text.length });
    
    // Show loading state
    actionBtn.textContent = currentMode === 'generate' ? 'Generating...' : 'Rewriting...';
    actionBtn.disabled = true;
    
    if (currentMode === 'generate') {
      generateText(text, inputBox, actionBtn);
    } else {
      const rewritePrompt = `Rewrite the following text using clear, easy-to-understand language. Fix any spelling or grammar mistakes. Do not change or expand acronyms. Only return the rewritten text:\n\n${text}`;
      generateText(rewritePrompt, inputBox, actionBtn);
    }
  });
  
  // Copy button click handler
  copyBtn.addEventListener('click', function() {
    copyToClipboard(inputBox.value.trim(), copyBtn);
  });
  
  // Options link click handler
  optionsLink.addEventListener('click', function(e) {
    e.preventDefault();
    logger.info('Options link clicked');
    chrome.runtime.openOptionsPage();
  });
  
  // Help link click handler
  helpLink.addEventListener('click', function(e) {
    e.preventDefault();
    logger.info('Help link clicked');
    chrome.tabs.create({ url: 'https://github.com/yourusername/textmate-ai-assistant' });
  });
  
  // Set current mode and update UI
  function setMode(mode) {
    currentMode = mode;
    
    // Update button states
    generateModeBtn.classList.toggle('active', mode === 'generate');
    rewriteModeBtn.classList.toggle('active', mode === 'rewrite');
    
    // Update action button text
    actionBtn.textContent = mode === 'generate' ? 'Generate' : 'Rewrite';
    
    // Update placeholder text
    inputBox.placeholder = mode === 'generate' 
      ? 'Enter your prompt here...'
      : 'Paste text to rewrite here...';
    
    logger.info('Mode changed:', mode);
  }
  
  // Generate text using OpenAI API
  function generateText(prompt, inputElement, buttonElement) {
    // Get API key from storage
    chrome.storage.sync.get(['openai_api_key'], function(result) {
      if (!result.openai_api_key) {
        logger.error('API key not found when attempting to generate');
        showError('API key not set. Please go to Settings.', inputElement);
        resetButton(buttonElement);
        return;
      }
      
      // Call OpenAI API
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${result.openai_api_key}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
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
        // Extract generated text
        const generatedText = data.choices[0].message.content.trim();
        logger.info('Text generated successfully', { responseLength: generatedText.length });
        
        // Update textarea with generated text
        inputElement.value = generatedText;
        
        // Reset button
        resetButton(buttonElement);
      })
      .catch(error => {
        logger.error('OpenAI API Error', { error: error.message });
        showError(`Error: ${error.message}`, inputElement);
        resetButton(buttonElement);
      });
    });
  }
  
  // Copy text to clipboard
  function copyToClipboard(text, buttonElement) {
    if (!text) return;
    
    logger.info('Copying text to clipboard', { textLength: text.length });
    
    navigator.clipboard.writeText(text)
      .then(() => {
        // Show success feedback
        const originalText = buttonElement.textContent;
        buttonElement.textContent = 'Copied!';
        setTimeout(() => {
          buttonElement.textContent = originalText;
        }, 1500);
        logger.info('Text copied to clipboard successfully');
      })
      .catch(err => {
        logger.error('Clipboard error', { error: err.message });
        showError('Failed to copy text', inputBox);
      });
  }
  
  // Reset button to initial state
  function resetButton(buttonElement) {
    buttonElement.textContent = currentMode === 'generate' ? 'Generate' : 'Rewrite';
    buttonElement.disabled = false;
    logger.debug('Button reset:', buttonElement.textContent);
  }
  
  // Show error message
  function showError(message, inputElement) {
    logger.error('Error displayed to user', { message });
    inputElement.value = message;
    setTimeout(() => {
      inputElement.value = '';
    }, 3000);
  }
}); 