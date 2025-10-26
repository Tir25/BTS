/**
 * Monitoring Middleware
 * Tracks request metrics and performance for comprehensive monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/MonitoringService';
import { logger } from '../utils/logger';

/**
 * Request monitoring middleware
 */
export const requestMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const isError = res.statusCode >= 400;
    
    // Record request metrics
    monitoringService.recordRequest(responseTime, isError);
    
    // Log performance metrics for slow requests
    if (responseTime > 1000) { // 1 second
      logger.warn('Slow request detected', 'monitoring', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  next();
};

/**
 * Error monitoring middleware
 */
export const errorMonitoring = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // Record error metrics
  monitoringService.recordRequest(0, true);
  
  // Log error details
  logger.error('Request error', 'monitoring', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next(error);
};

/**
 * Memory monitoring middleware
 */
export const memoryMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  
  // Log high memory usage
  if (heapUsedMB > 300) { // 300MB threshold
    logger.warn('High memory usage detected', 'monitoring', {
      heapUsedMB,
      path: req.path,
      method: req.method,
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      }
    });
  }
  
  next();
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  
  // Override res.end to capture performance metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log performance metrics
    logger.debug('Request performance', 'monitoring', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      ip: req.ip
    });
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  next();
};
