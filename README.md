# TextMate - AI Text Assistant

TextMate is a browser extension that provides AI-powered text generation and rewriting capabilities for any text box on the web. It enhances text input fields by integrating OpenAI's powerful language models, allowing you to generate, rewrite, and enhance text directly within webpages.

## Features

### Core Functionalities

- **AI-Powered Text Generation**: Enter a text prompt inside any text box and generate AI-based content.
- **AI Rewriting & Enhancement**: Select text and rewrite it using AI with options to paraphrase, summarize, or expand.
- **Floating AI Button**: A small, non-intrusive AI button appears when you click inside a text box.
- **Popup UI for Manual Input**: A popup interface allows you to manually enter prompts and generate AI responses.
- **OpenAI API Integration**: Uses OpenAI's GPT-3.5/GPT-4 models for high-quality text generation.

### User Experience

- **Minimalist Design**: Non-intrusive UI that only appears when needed.
- **Dark Mode Support**: The UI adapts based on system-wide dark mode settings.
- **Multiple Activation Methods**:
  - Click the AI button
  - Use the Alt+A keyboard shortcut when focused on a text field
  - Use Ctrl+Shift keyboard shortcuts for specific actions

### Keyboard Shortcuts

- **Alt + A**: Open AI options menu when focused on a text field
- **Ctrl + Shift + A**: Generate AI response
- **Ctrl + Shift + R**: Rewrite selected text
- **Ctrl + Shift + Z**: Summarize selected text or entire content
- **Ctrl + Shift + E**: Expand selected text with more details

### Settings & Customization

- **API Key Configuration**: Enter your own OpenAI API key for secure access.
- **Model Selection**: Choose between GPT-3.5 Turbo (faster, more economical) and GPT-4 (more capable).
- **Writing Style Preferences**: Select from different tone options (Formal, Casual, Professional).

## Installation

### Chrome/Edge Installation

1. Download or clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions` or `edge://extensions`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The TextMate extension should now be installed and visible in your extensions list

### First-Time Setup

1. After installation, click on the TextMate icon in your browser toolbar
2. Click on "Settings" in the popup
3. Enter your OpenAI API key ([Get an API key here](https://platform.openai.com/account/api-keys))
4. Configure your preferred AI model and writing style
5. Click "Save Settings"

## Usage

### Using the Floating Button

1. Click inside any text box on a webpage
2. A small "✨ AI" button will appear next to the text box
3. Click the button to see options:
   - Generate AI Text
   - Rewrite
   - Summarize
   - Expand
4. Select an option and follow the prompts

### Using Keyboard Shortcuts

- Press `Alt + A` when focused on a text field to open the AI options menu
- Select text and press `Ctrl + Shift + A` to generate AI content
- Select text and press `Ctrl + Shift + R` to rewrite it
- Select text and press `Ctrl + Shift + Z` to summarize it
- Select text and press `Ctrl + Shift + E` to expand it

### Using the Popup

1. Click the TextMate icon in your browser toolbar
2. Enter your prompt in the text area
3. Click "Generate" to create AI text
4. Use "Copy to Clipboard" to copy the generated text

## Troubleshooting

### Button Not Responding
If the AI button appears but doesn't respond to clicks:
1. Try using the Alt+A keyboard shortcut instead
2. Check the browser console for any error messages
3. Try on a different website (some sites have strict security policies)
4. Make sure you've reloaded the extension after any updates

### API Key Issues
If you receive API key errors:
1. Verify your API key is entered correctly in the extension settings
2. Check that your OpenAI account has available credits
3. Ensure your API key has the necessary permissions

### Extension Not Working on Certain Sites
Some websites implement strict Content Security Policies that may prevent the extension from functioning properly. Try using the extension on a different website to confirm if this is the issue.

## Privacy & Security

- Your OpenAI API key is stored locally in your browser's storage
- No data is sent to any servers other than OpenAI's API
- All text processing happens through direct API calls to OpenAI

## Requirements

- Chrome/Edge browser (latest version recommended)
- OpenAI API key

## License

MIT License

## Acknowledgements

- This extension uses OpenAI's API for text generation
- Icons and design elements are created specifically for TextMate

---

For support or feature requests, please open an issue on the GitHub repository. 