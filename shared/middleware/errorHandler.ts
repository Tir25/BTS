/**
 * Shared Error Handler for Microservices
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;

  constructor(
    message: string, 
    statusCode: number = 500, 
    isOperational: boolean = true,
    code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Enhanced global error handler
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;
  let errorCode = 'INTERNAL_ERROR';

  // Enhanced error classification
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
    errorCode = error.code;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errorCode = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    errorCode = 'CAST_ERROR';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errorCode = 'JWT_ERROR';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    errorCode = 'JWT_EXPIRED';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
    errorCode = 'UPLOAD_ERROR';
  } else if (error.name === 'SyntaxError') {
    statusCode = 400;
    message = 'Invalid JSON syntax';
    errorCode = 'SYNTAX_ERROR';
  } else if (error.name === 'TypeError') {
    statusCode = 400;
    message = 'Type error';
    errorCode = 'TYPE_ERROR';
  } else if (error.name === 'ReferenceError') {
    statusCode = 500;
    message = 'Reference error';
    errorCode = 'REFERENCE_ERROR';
  } else if (error.message?.includes('ECONNREFUSED')) {
    statusCode = 503;
    message = 'Database connection failed';
    errorCode = 'DB_CONNECTION_ERROR';
  } else if (error.message?.includes('timeout')) {
    statusCode = 408;
    message = 'Request timeout';
    errorCode = 'TIMEOUT_ERROR';
  } else if (error.message?.includes('ENOTFOUND')) {
    statusCode = 503;
    message = 'Service unavailable';
    errorCode = 'SERVICE_UNAVAILABLE';
  } else if (error.message?.includes('CIRCUIT_BREAKER')) {
    statusCode = 503;
    message = 'Service temporarily unavailable';
    errorCode = 'CIRCUIT_BREAKER_OPEN';
  }

  // Enhanced error logging with correlation ID
  const requestId = (req as any).id;
  
  logger.error('Request error', 'errorHandler', {
    error: error.message,
    stack: error.stack,
    statusCode,
    errorCode,
    isOperational,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  }, error, req);

  // Error response
  const errorResponse = {
    success: false,
    error: message,
    code: errorCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    requestId
  };

  // Add stack trace in development only
  if (process.env.NODE_ENV === 'development') {
    (errorResponse as any).stack = error.stack;
    (errorResponse as any).details = {
      name: error.name,
      message: error.message
    };
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, true, 'ROUTE_NOT_FOUND');
  next(error);
};

// Unhandled promise rejection handler
export const unhandledRejectionHandler = (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection', 'errorHandler', { 
    reason: String(reason), 
    promise: String(promise) 
  });
};

// Uncaught exception handler
export const uncaughtExceptionHandler = (error: Error) => {
  logger.fatal('Uncaught Exception', 'errorHandler', { 
    error: error.message,
    stack: error.stack 
  });
  process.exit(1);
};

export default errorHandler;
