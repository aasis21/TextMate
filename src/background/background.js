// TextMate - AI Text Assistant
// Background script for handling API key storage and communication

// Import logger and config
import Logger from '../utils/logger.js';
import { loggingConfig } from '../utils/config.js';

// Create a logger for this module
const logger = Logger.createChildLogger('Background');

// Configure logger using centralized config
Logger.configure({
  level: loggingConfig.level === 'DEBUG' ? Logger.LogLevel.DEBUG : Logger.LogLevel.INFO,
  environment: loggingConfig.environment,
  enableConsole: loggingConfig.enableConsole,
  enableRemote: loggingConfig.enableRemote,
  remoteEndpoint: loggingConfig.remoteEndpoint,
  version: loggingConfig.version
});

// Listen for installation
chrome.runtime.onInstalled.addListener(function() {
  logger.info('Extension installed');
  
  // Initialize settings if not already set
  chrome.storage.sync.get(['openai_api_key'], function(result) {
    if (!result.openai_api_key) {
      logger.warn('No API key found, opening options page');
      // No API key set, open options page
      chrome.runtime.openOptionsPage();
    } else {
      logger.info('API key found in storage');
    }
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  logger.info('Message received', { action: request.action, sender: sender.id });
  
  // Handle API key retrieval
  if (request.action === 'getApiKey') {
    chrome.storage.sync.get(['openai_api_key'], function(result) {
      logger.debug('Sending API key to requester');
      sendResponse({ apiKey: result.openai_api_key || '' });
    });
    return true; // Required for async response
  }
  
  // Handle API key storage
  if (request.action === 'setApiKey') {
    chrome.storage.sync.set({ 'openai_api_key': request.apiKey }, function() {
      logger.info('API key saved');
      sendResponse({ success: true });
    });
    return true; // Required for async response
  }
  
  // Handle model selection
  if (request.action === 'getAIModel') {
    chrome.storage.sync.get(['ai_model'], function(result) {
      logger.debug('Sending AI model to requester', { model: result.ai_model || 'gpt-3.5-turbo' });
      sendResponse({ model: result.ai_model || 'gpt-3.5-turbo' });
    });
    return true; // Required for async response
  }
}); 