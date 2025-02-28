/**
 * TextMate - AI Text Assistant
 * Global configuration settings
 */

// DEVELOPMENT MODE: Set this to false before production release
export const isDevelopment = true;

// Extension version from manifest
export const version = chrome.runtime.getManifest().version;

// Default logging configuration
export const loggingConfig = {
  level: isDevelopment ? 'DEBUG' : 'INFO',
  environment: isDevelopment ? 'development' : 'production',
  enableConsole: true,
  enableRemote: false,
  remoteEndpoint: '',
  version: version
};

// OpenAI API configuration
export const apiConfig = {
  defaultModel: 'gpt-3.5-turbo',
  maxTokens: 500,
  temperature: 0.7
};

// Export default configuration
export default {
  isDevelopment,
  version,
  loggingConfig,
  apiConfig
}; 