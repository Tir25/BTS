/**
 * Shared Logger Utility for Microservices
 */

import { Request } from 'express';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  level: LogLevel;
  message: string;
  service: string;
  timestamp: string;
  metadata?: Record<string, any>;
  error?: Error;
  request?: Request;
}

class Logger {
  private serviceName: string;
  private logLevel: LogLevel;

  constructor(serviceName: string, logLevel: LogLevel = 'info') {
    this.serviceName = serviceName;
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4,
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseEntry = {
      level: entry.level.toUpperCase(),
      service: entry.service,
      message: entry.message,
      timestamp: entry.timestamp,
    };

    if (entry.metadata) {
      Object.assign(baseEntry, entry.metadata);
    }

    if (entry.error) {
      Object.assign(baseEntry, {
        error: {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack,
        },
      });
    }

    if (entry.request) {
      Object.assign(baseEntry, {
        request: {
          id: (entry.request as any).id,
          method: entry.request.method,
          url: entry.request.url,
          userAgent: entry.request.get('User-Agent'),
          ip: entry.request.ip,
        },
      });
    }

    return JSON.stringify(baseEntry);
  }

  private log(level: LogLevel, message: string, service: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      service,
      timestamp: new Date().toISOString(),
      metadata,
      error,
      request: req,
    };

    const formattedLog = this.formatLogEntry(entry);
    
    // Console output with colors
    const colors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      fatal: '\x1b[35m', // Magenta
    };

    const resetColor = '\x1b[0m';
    const coloredOutput = `${colors[level]}${formattedLog}${resetColor}`;
    
    console.log(coloredOutput);
  }

  public debug(message: string, service: string, metadata?: Record<string, any>, req?: Request): void {
    this.log('debug', message, service, metadata, undefined, req);
  }

  public info(message: string, service: string, metadata?: Record<string, any>, req?: Request): void {
    this.log('info', message, service, metadata, undefined, req);
  }

  public warn(message: string, service: string, metadata?: Record<string, any>, req?: Request): void {
    this.log('warn', message, service, metadata, undefined, req);
  }

  public error(message: string, service: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    this.log('error', message, service, metadata, error, req);
  }

  public fatal(message: string, service: string, metadata?: Record<string, any>, error?: Error, req?: Request): void {
    this.log('fatal', message, service, metadata, error, req);
  }

  // Specialized logging methods
  public auth(message: string, metadata?: Record<string, any>, req?: Request): void {
    this.info(`[AUTH] ${message}`, this.serviceName, metadata, req);
  }

  public database(message: string, metadata?: Record<string, any>, req?: Request): void {
    this.info(`[DATABASE] ${message}`, this.serviceName, metadata, req);
  }

  public databaseConnected(): void {
    this.database('Database connection established');
  }

  public serverReady(port: number): void {
    this.info(`🚀 Server ready on port ${port}`, this.serviceName);
  }

  public serviceRegistered(serviceName: string, port: number): void {
    this.info(`✅ Service ${serviceName} registered on port ${port}`, this.serviceName);
  }

  public serviceUnregistered(serviceName: string): void {
    this.info(`❌ Service ${serviceName} unregistered`, this.serviceName);
  }

  public healthCheck(service: string, status: 'healthy' | 'unhealthy', responseTime?: number): void {
    const message = `Health check for ${service}: ${status}`;
    const metadata = responseTime ? { responseTime: `${responseTime}ms` } : undefined;
    
    if (status === 'healthy') {
      this.info(message, this.serviceName, metadata);
    } else {
      this.warn(message, this.serviceName, metadata);
    }
  }

  public circuitBreaker(service: string, state: 'CLOSED' | 'OPEN' | 'HALF_OPEN', reason?: string): void {
    const message = `Circuit breaker for ${service} is ${state}`;
    const metadata = reason ? { reason } : undefined;
    
    if (state === 'OPEN') {
      this.warn(message, this.serviceName, metadata);
    } else {
      this.info(message, this.serviceName, metadata);
    }
  }

  public metrics(service: string, metrics: Record<string, any>): void {
    this.debug(`Metrics for ${service}`, this.serviceName, metrics);
  }

  public request(method: string, url: string, statusCode: number, responseTime: number, req?: Request): void {
    const message = `${method} ${url} - ${statusCode}`;
    const metadata = {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
    };
    
    if (statusCode >= 400) {
      this.warn(message, this.serviceName, metadata, undefined, req);
    } else {
      this.info(message, this.serviceName, metadata, req);
    }
  }
}

// Create logger instance
export const logger = new Logger('microservice', process.env.LOG_LEVEL as LogLevel || 'info');

export default logger;
