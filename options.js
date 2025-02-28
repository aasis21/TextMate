// TextMate - AI Text Assistant
// Options page script

document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const successMessage = document.getElementById('success-message');
  const errorMessage = document.getElementById('error-message');
  const modelRadios = document.querySelectorAll('input[name="ai-model"]');
  const toneRadios = document.querySelectorAll('input[name="writing-tone"]');
  
  // Load saved settings
  loadSettings();
  
  // Save button click handler
  saveBtn.addEventListener('click', saveSettings);
  
  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(['openai_api_key', 'ai_model', 'writing_tone'], function(result) {
      // Set API key if it exists
      if (result.openai_api_key) {
        apiKeyInput.value = result.openai_api_key;
      }
      
      // Set AI model if it exists
      if (result.ai_model) {
        for (const radio of modelRadios) {
          if (radio.value === result.ai_model) {
            radio.checked = true;
            break;
          }
        }
      }
      
      // Set writing tone if it exists
      if (result.writing_tone) {
        for (const radio of toneRadios) {
          if (radio.value === result.writing_tone) {
            radio.checked = true;
            break;
          }
        }
      }
    });
  }
  
  // Save settings to storage
  function saveSettings() {
    // Get API key
    const apiKey = apiKeyInput.value.trim();
    
    // Validate API key
    if (!apiKey) {
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
    
    // Save to storage
    chrome.storage.sync.set({
      'openai_api_key': apiKey,
      'ai_model': selectedModel,
      'writing_tone': selectedTone
    }, function() {
      // Check for error
      if (chrome.runtime.lastError) {
        showError('Error saving settings: ' + chrome.runtime.lastError.message);
      } else {
        showSuccess('Settings saved successfully!');
      }
    });
  }
  
  // Show success message
  function showSuccess(message) {
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
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    
    // Hide after 3 seconds
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 3000);
  }
}); 