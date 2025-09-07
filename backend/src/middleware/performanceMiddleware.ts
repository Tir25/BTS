import { Request, Response, NextFunction } from 'express';
import { performanceMonitor } from '../services/PerformanceMonitor';

// Performance monitoring middleware
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const operation = `${req.method} ${req.path}`;
  
  // Track the request
  performanceMonitor.trackOperation(
    operation,
    async () => {
      // Store original end function
      const originalEnd = res.end;
      
      // Override end function to capture response time
      res.end = function(chunk?: any, encoding?: any, cb?: any) {
        const duration = Date.now() - startTime;
        
        // Log slow requests
        if (duration > 1000) {
          console.warn(`🐌 Slow API request: ${operation} took ${duration}ms`);
        }
        
        // Call original end function with proper return
        return originalEnd.call(this, chunk, encoding, cb);
      };
      
      next();
    },
    {
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    }
  ).catch((error) => {
    console.error(`❌ Performance monitoring error for ${operation}:`, error);
    next(error);
  });
};

// Database query performance middleware
export const databasePerformanceMiddleware = (operation: string) => {
  return async <T>(queryFn: () => Promise<T>): Promise<T> => {
    return performanceMonitor.trackOperation(
      `database:${operation}`,
      queryFn,
      {
        type: 'database',
        operation,
      }
    );
  };
};

// WebSocket performance tracking
export const websocketPerformanceMiddleware = (event: string) => {
  return async <T>(handlerFn: () => Promise<T>): Promise<T> => {
    return performanceMonitor.trackOperation(
      `websocket:${event}`,
      handlerFn,
      {
        type: 'websocket',
        event,
      }
    );
  };
};
