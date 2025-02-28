// TextMate - AI Text Assistant
// Popup script

document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const promptInput = document.getElementById('prompt-input');
  const generateBtn = document.getElementById('generate-btn');
  const copyBtn = document.getElementById('copy-btn');
  const optionsLink = document.getElementById('options-link');
  const helpLink = document.getElementById('help-link');
  
  // Store generated text
  let generatedText = '';
  
  // Check if API key is set
  chrome.storage.sync.get(['openai_api_key'], function(result) {
    if (!result.openai_api_key) {
      promptInput.placeholder = 'Please set your OpenAI API key in Settings first...';
      promptInput.disabled = true;
      generateBtn.disabled = true;
    }
  });
  
  // Generate button click handler
  generateBtn.addEventListener('click', function() {
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    
    // Show loading state
    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;
    
    // Get API key from storage
    chrome.storage.sync.get(['openai_api_key'], function(result) {
      if (!result.openai_api_key) {
        showError('API key not set. Please go to Settings.');
        resetGenerateButton();
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
        generatedText = data.choices[0].message.content.trim();
        
        // Update textarea with generated text
        promptInput.value = generatedText;
        
        // Reset button
        resetGenerateButton();
      })
      .catch(error => {
        showError(`Error: ${error.message}`);
        resetGenerateButton();
        console.error('OpenAI API Error:', error);
      });
    });
  });
  
  // Copy button click handler
  copyBtn.addEventListener('click', function() {
    const textToCopy = promptInput.value.trim();
    if (!textToCopy) return;
    
    // Copy to clipboard
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Show success feedback
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 1500);
      })
      .catch(err => {
        showError('Failed to copy text');
        console.error('Clipboard error:', err);
      });
  });
  
  // Options link click handler
  optionsLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  
  // Help link click handler
  helpLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/yourusername/textmate-ai-assistant' });
  });
  
  // Reset generate button to initial state
  function resetGenerateButton() {
    generateBtn.textContent = 'Generate';
    generateBtn.disabled = false;
  }
  
  // Show error message
  function showError(message) {
    promptInput.value = message;
    setTimeout(() => {
      promptInput.value = '';
    }, 3000);
  }
}); 