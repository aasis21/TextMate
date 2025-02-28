// TextMate - AI Text Assistant
// Background script for handling API key storage and communication

// Import logger
import logger from '../utils/logger.js';

// Create a logger for this module
const log = logger.createChildLogger('background');

// Listen for installation
chrome.runtime.onInstalled.addListener(function() {
  log.info('Extension installed');
  
  // Initialize settings if not already set
  chrome.storage.sync.get(['openai_api_key', 'development_mode'], function(result) {
    if (!result.openai_api_key) {
      log.warn('No API key found, opening options page');
      // No API key set, open options page
      chrome.runtime.openOptionsPage();
    } else {
      log.info('API key found in storage');
    }
    
    // Log development mode status
    if (result.development_mode !== undefined) {
      log.info('Development mode:', result.development_mode);
    } else {
      // Initialize development mode to false if not set
      chrome.storage.sync.set({ 'development_mode': false }, function() {
        log.info('Development mode initialized to false');
      });
    }
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  log.info('Message received', { action: request.action, sender: sender.id });
  
  // Handle API key retrieval
  if (request.action === 'getApiKey') {
    chrome.storage.sync.get(['openai_api_key'], function(result) {
      log.debug('Sending API key to requester');
      sendResponse({ apiKey: result.openai_api_key || '' });
    });
    return true; // Required for async response
  }
  
  // Handle API key storage
  if (request.action === 'setApiKey') {
    chrome.storage.sync.set({ 'openai_api_key': request.apiKey }, function() {
      log.info('API key saved');
      sendResponse({ success: true });
    });
    return true; // Required for async response
  }
  
  // Handle model selection
  if (request.action === 'getAIModel') {
    chrome.storage.sync.get(['ai_model'], function(result) {
      log.debug('Sending AI model to requester', { model: result.ai_model || 'gpt-3.5-turbo' });
      sendResponse({ model: result.ai_model || 'gpt-3.5-turbo' });
    });
    return true; // Required for async response
  }
  
  // Note: We've removed the development mode change handler
  // Changes will be picked up when the extension is reloaded
}); 