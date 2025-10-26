import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const responseTime = endTime - startTime;
    
    // Log performance metrics
    logger.info('Request completed', 'performance', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      memoryUsage: {
        rss: `${Math.round((endMemory.rss - startMemory.rss) / 1024 / 1024)}MB`,
        heapUsed: `${Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024)}MB`
      },
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  next();
};

// Memory usage monitoring
export const memoryMonitor = (req: Request, res: Response, next: NextFunction) => {
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024)
  };
  
  // Log memory usage if it's high (aligned with server thresholds)
  if (memoryUsageMB.heapUsed > 300) { // 300MB threshold - aligned with server monitoring
    logger.warn('High memory usage detected in request', 'performance', {
      ...memoryUsageMB,
      path: req.path,
      method: req.method
    });
  }
  
  // Add memory info to response headers
  res.setHeader('X-Memory-Usage', JSON.stringify(memoryUsageMB));
  
  next();
};

// Request size limiting
export const requestSizeLimit = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      logger.warn('Request size exceeded', 'performance', {
        contentLength,
        maxSize,
        ip: req.ip,
        path: req.path
      });
      return res.status(413).json({ error: 'Request entity too large' });
    }
    
    next();
  };
};

// Response compression monitoring
export const compressionMonitor = (req: Request, res: Response, next: NextFunction) => {
  const originalWrite = res.write;
  const originalEnd = res.end;
  let responseSize = 0;
  
  res.write = function(chunk: any, encoding?: any, cb?: any) {
    if (chunk) {
      responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    }
    return originalWrite.call(this, chunk, encoding, cb);
  };
  
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    if (chunk) {
      responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    }
    
    // Log large responses
    if (responseSize > 1024 * 1024) { // 1MB threshold
      logger.warn('Large response detected', 'performance', {
        path: req.path,
        responseSize: `${Math.round(responseSize / 1024)}KB`,
        statusCode: res.statusCode
      });
    }
    
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  next();
};
