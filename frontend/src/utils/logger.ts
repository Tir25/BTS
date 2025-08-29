/**
 * Centralized logging utility for consistent logging across the application
 */

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// Logger configuration
interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  enableDebugInProduction: boolean;
  prefix: string;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  enabled: true,
  level: LogLevel.INFO,
  enableDebugInProduction: false,
  prefix: '🚌',
};

// Current configuration
let config: LoggerConfig = {
  ...defaultConfig,
  // In production, disable debug logs by default
  level: import.meta.env.PROD ? LogLevel.INFO : LogLevel.DEBUG,
  // Never enable debug logs in production unless explicitly configured
  enableDebugInProduction: false,
};

/**
 * Configure the logger
 * @param newConfig New configuration to apply
 */
export function configure(newConfig: Partial<LoggerConfig>): void {
  config = {
    ...config,
    ...newConfig,
  };
  
  // Safety check: never enable debug logs in production unless explicitly allowed
  if (import.meta.env.PROD && !config.enableDebugInProduction) {
    if (config.level === LogLevel.DEBUG) {
      config.level = LogLevel.INFO;
    }
  }
}

/**
 * Check if a log level is enabled
 * @param level Log level to check
 * @returns True if the log level is enabled
 */
function isLevelEnabled(level: LogLevel): boolean {
  if (!config.enabled) return false;
  
  // In production, never log debug unless explicitly allowed
  if (import.meta.env.PROD && level === LogLevel.DEBUG && !config.enableDebugInProduction) {
    return false;
  }
  
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const configLevelIndex = levels.indexOf(config.level);
  const targetLevelIndex = levels.indexOf(level);
  
  return targetLevelIndex >= configLevelIndex;
}

/**
 * Format a log message with timestamp and prefix
 * @param message Message to format
 * @returns Formatted message
 */
function formatMessage(message: string): string {
  return `${config.prefix} ${message}`;
}

/**
 * Log a debug message
 * @param message Message to log
 * @param args Additional arguments
 */
export function debug(message: string, ...args: any[]): void {
  if (!isLevelEnabled(LogLevel.DEBUG)) return;
  
  if (args.length > 0) {
    console.debug(formatMessage(message), ...args);
  } else {
    console.debug(formatMessage(message));
  }
}

/**
 * Log an info message
 * @param message Message to log
 * @param args Additional arguments
 */
export function info(message: string, ...args: any[]): void {
  if (!isLevelEnabled(LogLevel.INFO)) return;
  
  if (args.length > 0) {
    console.info(formatMessage(message), ...args);
  } else {
    console.info(formatMessage(message));
  }
}

/**
 * Log a warning message
 * @param message Message to log
 * @param args Additional arguments
 */
export function warn(message: string, ...args: any[]): void {
  if (!isLevelEnabled(LogLevel.WARN)) return;
  
  if (args.length > 0) {
    console.warn(formatMessage(message), ...args);
  } else {
    console.warn(formatMessage(message));
  }
}

/**
 * Log an error message
 * @param message Message to log
 * @param args Additional arguments
 */
export function error(message: string, ...args: any[]): void {
  if (!isLevelEnabled(LogLevel.ERROR)) return;
  
  if (args.length > 0) {
    console.error(formatMessage(message), ...args);
  } else {
    console.error(formatMessage(message));
  }
}

/**
 * Create a logger with a custom prefix
 * @param prefix Prefix to use for log messages
 * @returns Logger object with debug, info, warn, and error methods
 */
export function createLogger(prefix: string) {
  return {
    debug: (message: string, ...args: any[]) => {
      if (!isLevelEnabled(LogLevel.DEBUG)) return;
      
      if (args.length > 0) {
        console.debug(`${prefix} ${message}`, ...args);
      } else {
        console.debug(`${prefix} ${message}`);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (!isLevelEnabled(LogLevel.INFO)) return;
      
      if (args.length > 0) {
        console.info(`${prefix} ${message}`, ...args);
      } else {
        console.info(`${prefix} ${message}`);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (!isLevelEnabled(LogLevel.WARN)) return;
      
      if (args.length > 0) {
        console.warn(`${prefix} ${message}`, ...args);
      } else {
        console.warn(`${prefix} ${message}`);
      }
    },
    error: (message: string, ...args: any[]) => {
      if (!isLevelEnabled(LogLevel.ERROR)) return;
      
      if (args.length > 0) {
        console.error(`${prefix} ${message}`, ...args);
      } else {
        console.error(`${prefix} ${message}`);
      }
    },
  };
}

export default {
  configure,
  debug,
  info,
  warn,
  error,
  createLogger,
  LogLevel,
};
