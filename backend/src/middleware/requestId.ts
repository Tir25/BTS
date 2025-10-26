import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Extend Express Request interface to include request ID
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Request correlation ID middleware
 * Generates a unique ID for each request to enable tracing and debugging
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate a unique request ID
  req.id = uuidv4();
  
  // Set the request ID in response headers for client tracking
  res.setHeader('X-Request-ID', req.id);
  
  // Add request ID to response locals for logging
  res.locals.requestId = req.id;
  
  logger.info(`Request ${req.id}: ${req.method} ${req.originalUrl}`, 'requestId', {
    method: req.method,
    url: req.originalUrl
  }, req);
  
  next();
};

/**
 * Middleware to add request ID to error responses
 */
export const addRequestIdToError = (req: Request, res: Response, next: NextFunction): void => {
  const originalJson = res.json;
  
  res.json = function(obj: any) {
    // Add request ID to error responses
    if (obj && (obj.error || obj.success === false)) {
      obj.requestId = req.id;
    }
    return originalJson.call(this, obj);
  };
  
  next();
};
