// TextMate - AI Text Assistant
// Background script for handling API key storage and communication

// Listen for installation
chrome.runtime.onInstalled.addListener(function() {
  console.log('TextMate: Extension installed');
  
  // Initialize settings if not already set
  chrome.storage.sync.get(['openai_api_key'], function(result) {
    if (!result.openai_api_key) {
      console.log('TextMate: No API key found, opening options page');
      // No API key set, open options page
      chrome.runtime.openOptionsPage();
    } else {
      console.log('TextMate: API key found in storage');
    }
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('TextMate: Message received', request.action);
  
  // Handle API key retrieval
  if (request.action === 'getApiKey') {
    chrome.storage.sync.get(['openai_api_key'], function(result) {
      console.log('TextMate: Sending API key to requester');
      sendResponse({ apiKey: result.openai_api_key || '' });
    });
    return true; // Required for async response
  }
  
  // Handle API key storage
  if (request.action === 'setApiKey') {
    chrome.storage.sync.set({ 'openai_api_key': request.apiKey }, function() {
      console.log('TextMate: API key saved');
      sendResponse({ success: true });
    });
    return true; // Required for async response
  }
  
  // Handle model selection
  if (request.action === 'getAIModel') {
    chrome.storage.sync.get(['ai_model'], function(result) {
      sendResponse({ model: result.ai_model || 'gpt-3.5-turbo' });
    });
    return true; // Required for async response
  }
}); 