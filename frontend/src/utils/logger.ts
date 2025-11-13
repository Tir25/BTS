/**
 * Centralized logging utility for the University Bus Tracking System Frontend
 * Provides structured logging with different levels and production-safe output
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  component: string;
  metadata: Record<string, unknown>;
}

class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;
  private isProduction: boolean;
  // PRODUCTION FIX: Throttle "Debug info" logging to prevent console spam
  private debugInfoLogTimes: Map<string, number> = new Map();
  private readonly DEBUG_INFO_THROTTLE_MS = 5000; // Only log "Debug info" once per 5 seconds per component

  private constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatLog(level: LogLevel, message: string, component?: string, metadata?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      component: component || 'unknown',
      metadata: metadata || {},
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction) {
      // In production, only log errors and warnings
      return level === LogLevel.ERROR || level === LogLevel.WARN;
    }
    return true;
  }

  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formattedMessage = this.isDevelopment
      ? `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.component ? `[${entry.component}] ` : ''}${entry.message}`
      : JSON.stringify(entry);

    // Use a more production-safe logging approach
    if (this.isDevelopment) {
      switch (entry.level) {
        case LogLevel.ERROR:
           
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
           
          console.warn(formattedMessage);
          break;
        case LogLevel.INFO:
           
          console.info(formattedMessage);
          break;
        case LogLevel.DEBUG:
           
          console.debug(formattedMessage);
          break;
      }
    } else {
      // In production, we could send to external logging service
      // For now, we'll use a silent approach
      if (entry.level === LogLevel.ERROR) {
        // Only log critical errors in production
         
        console.error(formattedMessage);
      }
    }
  }

  error(message: string, component?: string, metadata?: Record<string, unknown>): void {
    const entry = this.formatLog(LogLevel.ERROR, message, component, metadata);
    this.output(entry);
    
    // PRODUCTION FIX: Also log metadata to console.error for visibility
    // This ensures error details are visible even if the logger output doesn't show them
    if (metadata && Object.keys(metadata).length > 0) {
      console.error('Error details:', metadata);
      // If there's a stack trace, log it separately for better visibility
      if (metadata.stack) {
        console.error('Stack trace:', metadata.stack);
      }
    }
  }

  warn(message: string, component?: string, metadata?: Record<string, unknown>): void {
    const entry = this.formatLog(LogLevel.WARN, message, component, metadata);
    this.output(entry);
  }

  info(message: string, component?: string, metadata?: Record<string, unknown>): void {
    const entry = this.formatLog(LogLevel.INFO, message, component, metadata);
    this.output(entry);
  }

  debug(message: string, component?: string, metadata?: Record<string, unknown>): void {
    // PRODUCTION FIX: Throttle "Debug info" messages to prevent console spam
    if (message === 'Debug info') {
      const componentKey = component || 'unknown';
      const now = Date.now();
      const lastLogTime = this.debugInfoLogTimes.get(componentKey) || 0;
      
      if (now - lastLogTime < this.DEBUG_INFO_THROTTLE_MS) {
        // Skip logging if throttled
        return;
      }
      
      // Update last log time
      this.debugInfoLogTimes.set(componentKey, now);
    }
    
    const entry = this.formatLog(LogLevel.DEBUG, message, component, metadata);
    this.output(entry);
  }

  // Convenience methods for common patterns
  authSuccess(userId: string, email: string): void {
    this.info(`Authentication successful for user ${email}`, 'auth', { userId, email });
  }

  authFailure(email: string, reason: string): void {
    this.warn(`Authentication failed for ${email}: ${reason}`, 'auth', { email, reason });
  }

  websocketConnected(): void {
    this.info('WebSocket connected', 'websocket');
  }

  websocketDisconnected(): void {
    this.info('WebSocket disconnected', 'websocket');
  }

  websocketError(error: unknown): void {
    this.error('WebSocket error', 'websocket', { error: String(error) });
  }

  apiRequest(method: string, url: string, statusCode: number, duration?: number): void {
    this.info(`${method} ${url} - ${statusCode}`, 'api', { method, url, statusCode, duration });
  }

  apiError(method: string, url: string, error: unknown): void {
    this.error(`API Error: ${method} ${url}`, 'api', { method, url, error: String(error) });
  }

  locationUpdate(lat: number, lng: number, accuracy?: number): void {
    this.debug('Location updated', 'location', { lat, lng, accuracy });
  }

  locationError(error: string): void {
    this.error('Location error', 'location', { error });
  }

  mapInitialized(): void {
    this.info('Map initialized', 'map');
  }

  mapError(error: unknown): void {
    this.error('Map error', 'map', { error: String(error) });
  }

  componentMount(componentName: string): void {
    this.debug(`Component mounted: ${componentName}`, componentName);
  }

  componentUnmount(componentName: string): void {
    this.debug(`Component unmounted: ${componentName}`, componentName);
  }

  componentError(componentName: string, error: unknown): void {
    this.error(`Component error in ${componentName}`, componentName, { error: String(error) });
  }

  serviceWorkerRegistered(): void {
    this.info('Service Worker registered', 'service-worker');
  }

  serviceWorkerError(error: unknown): void {
    this.error('Service Worker error', 'service-worker', { error: String(error) });
  }

  storageSet(key: string, value: unknown): void {
    this.debug(`Storage set: ${key}`, 'storage', { key, valueType: typeof value });
  }

  storageGet(key: string, value: unknown): void {
    this.debug(`Storage get: ${key}`, 'storage', { key, valueType: typeof value });
  }

  storageError(key: string, error: unknown): void {
    this.error(`Storage error for key: ${key}`, 'storage', { key, error: String(error) });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions for common use cases
export const logError = (message: string, component?: string, metadata?: Record<string, unknown>) => 
  logger.error(message, component, metadata);

export const logWarn = (message: string, component?: string, metadata?: Record<string, unknown>) => 
  logger.warn(message, component, metadata);

export const logInfo = (message: string, component?: string, metadata?: Record<string, unknown>) => 
  logger.info(message, component, metadata);

export const logDebug = (message: string, component?: string, metadata?: Record<string, unknown>) => 
  logger.debug(message, component, metadata);
