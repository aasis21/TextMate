/**
 * TextMate - AI Text Assistant
 * Logger utility for structured logging
 */

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
  level: LogLevel.INFO,  // Default log level
  prefix: 'TextMate',    // Log prefix
  enableConsole: true,   // Enable console output
  enableRemote: false,   // Enable remote logging
  remoteEndpoint: '',    // Remote logging endpoint
  environment: 'production', // Environment (development, staging, production)
  version: chrome.runtime.getManifest().version // Extension version
};

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
 * Send log to remote endpoint if configured
 * @param {Object} logObject - Log object to send
 */
function sendRemoteLog(logObject) {
  if (!config.enableRemote || !config.remoteEndpoint) return;
  
  try {
    fetch(config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logObject)
    }).catch(err => {
      // Silently fail remote logging
      if (config.enableConsole) {
        console.error(`${config.prefix}: Failed to send remote log:`, err);
      }
    });
  } catch (error) {
    // Catch any errors to prevent logging failures from affecting the app
  }
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
  
  // Remote logging
  sendRemoteLog(logObject);
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
  createChildLogger
}; 