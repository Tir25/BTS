import { Request, Response } from 'express';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatLogEntry(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Development: Human-readable format
      const timestamp = new Date(entry.timestamp).toISOString();
      const level = entry.level.toUpperCase().padEnd(5);
      const service = entry.service.padEnd(10);
      const requestId = entry.requestId ? `[${entry.requestId}]` : '';
      const userId = entry.userId ? `[User:${entry.userId}]` : '';
      
      let logLine = `${timestamp} ${level} ${service} ${requestId} ${userId} ${entry.message}`;
      
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        logLine += ` | Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
      }
      
      if (entry.error) {
        logLine += ` | Error: ${entry.error.name}: ${entry.error.message}`;
        if (entry.error.stack) {
          logLine += `\nStack: ${entry.error.stack}`;
        }
      }
      
      return logLine;
    } else {
      // Production: JSON format for log aggregation
      return JSON.stringify(entry);
    }
  }

  private log(level: LogLevel, message: string, service: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service,
      requestId: req?.id || req?.headers['x-request-id'] as string,
      userId: (req as any)?.user?.id,
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      } : undefined
    };

    const formattedLog = this.formatLogEntry(entry);
    
    // Use appropriate console method based on log level
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedLog);
        }
        break;
    }
  }

  public error(message: string, service: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    this.log(LogLevel.ERROR, message, service, metadata, error, req);
  }

  public warn(message: string, service: string, metadata?: Record<string, any>, req?: Request): void {
    this.log(LogLevel.WARN, message, service, metadata, undefined, req);
  }

  public info(message: string, service: string, metadata?: Record<string, any>, req?: Request): void {
    this.log(LogLevel.INFO, message, service, metadata, undefined, req);
  }

  public debug(message: string, service: string, metadata?: Record<string, any>, req?: Request): void {
    this.log(LogLevel.DEBUG, message, service, metadata, undefined, req);
  }

  // Convenience methods for common services
  public auth(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    this.info(message, 'auth', metadata, req);
  }

  public cors(message: string, metadata?: Record<string, any>, req?: Request): void {
    this.info(message, 'cors', metadata, req);
  }

  public websocket(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    this.info(message, 'websocket', metadata, req);
  }

  public database(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    this.info(message, 'database', metadata, req);
  }

  public location(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    this.info(message, 'location', metadata, req);
  }

  public bus(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    this.info(message, 'bus', metadata, req);
  }

  public route(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    this.info(message, 'route', metadata, req);
  }

  public admin(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    this.info(message, 'admin', metadata, req);
  }

  public security(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    this.warn(message, 'security', metadata, req);
  }

  public performance(message: string, metadata?: Record<string, any>, req?: Request): void {
    this.info(message, 'performance', metadata, req);
  }

  // HTTP request/response logging
  public httpRequest(req: Request, res: Response, responseTime?: number): void {
    const metadata = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      responseTime: responseTime ? `${responseTime}ms` : undefined
    };

    const level = res.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, `HTTP ${req.method} ${req.originalUrl}`, 'http', metadata, undefined, req);
  }

  // Database query logging
  public dbQuery(query: string, duration?: number, metadata?: Record<string, any>, req?: Request): void {
    this.database(`Database query executed`, {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      duration: duration ? `${duration}ms` : undefined,
      ...metadata
    }, undefined, req);
  }

  // WebSocket connection logging
  public wsConnection(socketId: string, userId?: string, metadata?: Record<string, any>): void {
    this.websocket(`WebSocket connection established`, {
      socketId,
      userId,
      ...metadata
    });
  }

  public wsDisconnection(socketId: string, reason: string, userId?: string): void {
    this.websocket(`WebSocket connection closed`, {
      socketId,
      reason,
      userId
    });
  }

  // Security event logging
  public securityEvent(event: string, metadata?: Record<string, any>, req?: Request): void {
    this.security(`Security event: ${event}`, metadata, undefined, req);
  }

  // Performance monitoring
  public performanceMetric(metric: string, value: number, unit: string, metadata?: Record<string, any>, req?: Request): void {
    this.performance(`Performance metric: ${metric}`, {
      value,
      unit,
      ...metadata
    }, req);
  }

  // Server lifecycle methods
  public serverStart(port: number, environment: string): void {
    this.info(`Server starting on port ${port} in ${environment} mode`, 'server');
  }

  public serverReady(port: number): void {
    this.info(`Server ready on port ${port}`, 'server');
  }

  public databaseConnected(): void {
    this.info('Database connection established', 'database');
  }

  public databaseError(error: Error): void {
    this.error('Database connection failed', 'database', undefined, error);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions for backward compatibility
export const logError = (message: string, service: string, metadata?: Record<string, any>, error?: Error, req?: Request) => 
  logger.error(message, service, metadata, error, req);

export const logWarn = (message: string, service: string, metadata?: Record<string, any>, req?: Request) => 
  logger.warn(message, service, metadata, req);

export const logInfo = (message: string, service: string, metadata?: Record<string, any>, req?: Request) => 
  logger.info(message, service, metadata, req);

export const logDebug = (message: string, service: string, metadata?: Record<string, any>, req?: Request) => 
  logger.debug(message, service, metadata, req);