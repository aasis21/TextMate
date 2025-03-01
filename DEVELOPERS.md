# TextMate Developer Documentation

This document provides technical information for developers who want to understand, modify, or contribute to the TextMate browser extension.

## Project Structure

```
TextMate/
├── src/                  # Source code
│   ├── background/       # Background scripts for extension
│   ├── content/          # Content scripts injected into web pages
│   ├── popup/            # UI for the browser toolbar popup
│   ├── options/          # Settings page UI and logic
│   ├── utils/            # Shared utilities and helpers
│   └── assets/           # Images, icons, and other static assets
├── manifest.json         # Extension manifest configuration
├── README.md             # User documentation
├── DEVELOPERS.md         # Developer documentation
└── privacy-policy.md     # Privacy policy
```

## Development Setup

### Prerequisites

- Chrome or Edge browser for testing
- OpenAI API key for development testing

### Getting Started

1. Clone or download the repository:
   ```bash
   git clone https://github.com/yourusername/TextMate.git
   # or download and extract the ZIP file
   ```

2. Load the extension in your browser:
   - Open Chrome/Edge and navigate to `chrome://extensions` or `edge://extensions`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select the folder containing the extension files
   - The TextMate extension should now be installed and visible in your extensions list

### Development Workflow

1. Make your changes to the source code using any text editor
2. After making changes, go to the extensions page in your browser
3. Click the refresh icon on the TextMate extension card to reload it
4. Test your changes

## Architecture

TextMate is built as a browser extension with the following components:

### Core Components

- **Content Script**: Injects the floating AI button and handles text field interactions on webpages
- **Background Script**: Manages API calls to OpenAI and handles extension-wide state
- **Popup UI**: Provides a user interface for manual input and direct text generation
- **Options Page**: Allows users to configure API keys, model selection, and writing style preferences
- **Settings Storage**: Manages user preferences and securely stores API keys

### Feature Implementation

#### Floating AI Button
The floating button is injected by the content script when a user focuses on a text field. It uses DOM manipulation to:
- Detect text input fields
- Position the button near the cursor
- Handle click events and show the options menu
- Process user selections and insert generated text

#### Keyboard Shortcuts
Keyboard shortcuts are registered in the manifest and handled by the content script to:
- Detect key combinations (Alt+A, Ctrl+Shift+A, etc.)
- Trigger the appropriate AI actions
- Handle text selection and insertion

#### OpenAI Integration
TextMate communicates with OpenAI's API through a dedicated service that:
- Authenticates requests with the user's API key
- Formats prompts based on the selected action (generate, rewrite, etc.)
- Handles model selection (GPT-3.5 vs GPT-4)
- Processes responses and error handling

### Logging System

TextMate uses a structured logging system for better debugging and monitoring:

- **Log Levels**: DEBUG, INFO, WARN, ERROR, and NONE
- **Contextual Logging**: Each module has its own logger with context
- **Environment-aware**: Different log levels for production vs. development
- **Remote Logging Support**: Optional remote logging capability for production monitoring
- **Structured Data**: Logs include timestamps, levels, and structured data objects

Example logging usage:

```javascript
// Import the logger
const logger = window.TextMate.logger.createChildLogger('ModuleName');

// Use the logger
logger.info('Operation completed', { userId: 123, duration: 500 });
logger.error('Operation failed', { error: 'API timeout', code: 408 });
```

## API Integration

TextMate integrates with OpenAI's API for text generation. The API calls are managed through a dedicated service that handles:

- Authentication with API keys
- Request formatting with appropriate prompts for different actions:
  - Text generation
  - Rewriting
  - Summarization
  - Expansion
- Response parsing and text extraction
- Error handling and user feedback
- Rate limiting and quota management

Example API call structure:

```javascript
async function generateText(prompt, model, style) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model === 'gpt4' ? 'gpt-4' : 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful writing assistant. Write in a ${style || 'professional'} tone.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    logger.error('API call failed', { error });
    throw new Error('Failed to generate text. Please try again.');
  }
}
```

## Testing

### Manual Testing

For testing your changes, load the extension in your browser and test the following:

1. Floating button appearance in various text fields:
   - Simple inputs
   - Textareas
   - Rich text editors (Google Docs, etc.)
   - Social media inputs
2. Text generation functionality with different prompts
3. Keyboard shortcuts in various contexts
4. Settings persistence across browser sessions
5. Error handling for API failures and invalid inputs

## Building for Production

To prepare the extension for distribution:

1. Make sure all your changes are working correctly
2. Test the extension thoroughly in different browsers and websites
3. Ensure all files are properly organized in the project structure
4. Update the version number in `manifest.json` if needed

## Release Process

1. Update version number in `manifest.json`
2. Test the extension thoroughly
3. Create a ZIP file of the entire extension folder
4. Submit to browser extension stores:
   - Chrome Web Store
   - Microsoft Edge Add-ons

## Code Style and Guidelines

- Follow the project's established coding style:
  - 2-space indentation
  - Semicolons required
  - Single quotes for strings
  - Camel case for variables and functions
  - Pascal case for classes and components
- Write meaningful commit messages
- Document new features and changes with comments
- Update README.md when adding user-facing features

## Troubleshooting Development Issues

### Common Issues

- **Content Script Not Loading**: Check the browser console for errors and ensure the content script is properly registered in the manifest
- **API Calls Failing**: Verify API key permissions and check network requests in the browser's developer tools
- **UI Not Rendering**: Inspect the DOM to ensure elements are being injected correctly
- **Keyboard Shortcuts Not Working**: Verify they're correctly registered in the manifest and not conflicting with browser or website shortcuts

### Debugging Tips

- Use `console.log` statements with descriptive labels
- Leverage the browser's developer tools to inspect network requests and DOM elements
- Check the extension's background page console for errors (accessible via the extensions page)
- Use the browser's extension debugging tools:
  - In Chrome: visit `chrome://extensions`, find TextMate, and click "background page" under "Inspect views"
  - In Edge: visit `edge://extensions`, find TextMate, and click "background page" under "Inspect views"

## Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Web Extension Polyfill](https://github.com/mozilla/webextension-polyfill) (for cross-browser compatibility) 