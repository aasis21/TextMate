/**
 * TextMate - AI Text Assistant
 * Logger utility for structured logging
 */

// Default to production mode (false)
let isDevelopment = false;

// Load development mode setting from storage
try {
  chrome.storage.sync.get(['development_mode'], function(result) {
    if (result.development_mode !== undefined) {
      isDevelopment = result.development_mode;
      console.log('TextMate: Development mode loaded from storage:', isDevelopment);
      updateConfig();
    }
  });
  
  // Note: We've removed the message listener for development mode changes
  // Changes will be picked up when the extension is reloaded
} catch (error) {
  console.warn('Unable to access chrome storage or runtime, using default development mode:', isDevelopment);
}

// Log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Default configuration
let config = {
  level: LogLevel.ERROR,  // Default to ERROR level
  prefix: 'TextMate',    // Log prefix
  enableConsole: true,   // Enable console output
  environment: 'production',
  version: '1.0.0' // Extension version
};

// Update configuration based on development mode
function updateConfig() {
  config.level = isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
  config.environment = isDevelopment ? 'development' : 'production';
}

// Initialize config
updateConfig();

/**
 * Configure the logger
 * @param {Object} options - Configuration options
 */
function configure(options = {}) {
  config = { ...config, ...options };
}

/**
 * Format a log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @returns {Object} Formatted log object
 */
function formatLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logObject = {
    timestamp,
    level,
    message: `${config.prefix}: ${message}`,
    environment: config.environment,
    version: config.version,
    data: data || {}
  };
  
  return logObject;
}

/**
 * Log a message at the specified level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function log(level, message, data = null) {
  // Skip logging if level is below configured level
  if (LogLevel[level] < config.level) return;
  
  const logObject = formatLog(level, message, data);
  
  // Console logging
  if (config.enableConsole) {
    switch (level) {
      case 'DEBUG':
        console.debug(logObject.message, data || '');
        break;
      case 'INFO':
        console.info(logObject.message, data || '');
        break;
      case 'WARN':
        console.warn(logObject.message, data || '');
        break;
      case 'ERROR':
        console.error(logObject.message, data || '');
        break;
    }
  }
}

/**
 * Log a debug message
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function debug(message, data = null) {
  log('DEBUG', message, data);
}

/**
 * Log an info message
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function info(message, data = null) {
  log('INFO', message, data);
}

/**
 * Log a warning message
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function warn(message, data = null) {
  log('WARN', message, data);
}

/**
 * Log an error message
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function error(message, data = null) {
  log('ERROR', message, data);
}

/**
 * Create a child logger with a specific context
 * @param {string} context - Context for the child logger
 * @returns {Object} Child logger
 */
function createChildLogger(context) {
  return {
    debug: (message, data = null) => debug(`[${context}] ${message}`, data),
    info: (message, data = null) => info(`[${context}] ${message}`, data),
    warn: (message, data = null) => warn(`[${context}] ${message}`, data),
    error: (message, data = null) => error(`[${context}] ${message}`, data)
  };
}

// Export the logger API
export default {
  LogLevel,
  configure,
  debug,
  info,
  warn,
  error,
  createChildLogger,
  updateConfig
}; 