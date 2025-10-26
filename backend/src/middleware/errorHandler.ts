import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Enhanced global error handler with comprehensive error classification
export const globalErrorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;
  let errorCode = 'INTERNAL_ERROR';

  // Enhanced error classification
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
    errorCode = 'APP_ERROR';
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
  }

  // Enhanced error logging with correlation ID
  const requestId = req.headers['x-request-id'] || 'unknown';
  logger.error('Error occurred', 'error', {
    requestId,
    message: error.message,
    stack: error.stack,
    statusCode,
    errorCode,
    isOperational,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString()
  });

  // Enhanced error response with correlation ID
  const errorResponse = {
    error: message,
    status: statusCode,
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
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Unhandled promise rejection handler
export const unhandledRejectionHandler = (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection', 'error', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });
  
  // Gracefully exit the process
  process.exit(1);
};

// Uncaught exception handler
export const uncaughtExceptionHandler = (error: Error) => {
  logger.error('Uncaught Exception', 'error', {
    message: error.message,
    stack: error.stack
  });
  
  // Gracefully exit the process
  process.exit(1);
};

// Enhanced database error handler with comprehensive error mapping
export const databaseErrorHandler = (error: any) => {
  if (error.code === '23505') { // Unique constraint violation
    return new AppError('Duplicate entry', 409);
  }
  if (error.code === '23503') { // Foreign key constraint violation
    return new AppError('Referenced record not found', 400);
  }
  if (error.code === '23502') { // Not null constraint violation
    return new AppError('Required field missing', 400);
  }
  if (error.code === '42P01') { // Table doesn't exist
    return new AppError('Database table not found', 500);
  }
  if (error.code === 'ECONNREFUSED') {
    return new AppError('Database connection failed', 503);
  }
  if (error.code === '23514') { // Check constraint violation
    return new AppError('Data validation failed', 400);
  }
  if (error.code === '23506') { // Exclusion constraint violation
    return new AppError('Data conflict', 409);
  }
  if (error.code === '42P07') { // Relation already exists
    return new AppError('Resource already exists', 409);
  }
  if (error.code === '42P16') { // Invalid column reference
    return new AppError('Invalid data reference', 400);
  }
  
  return new AppError('Database error', 500);
};

// Standardized error response utility
export const createErrorResponse = (
  message: string,
  statusCode: number = 500,
  code: string = 'ERROR',
  details?: any
) => {
  return {
    error: message,
    status: statusCode,
    code,
    timestamp: new Date().toISOString(),
    ...(details && { details })
  };
};

// Validation error handler
export const validationErrorHandler = (errors: any[]) => {
  const message = 'Validation failed';
  const details = errors.map(error => ({
    field: error.path || error.field,
    message: error.message,
    value: error.value
  }));
  
  return new AppError(message, 400, true);
};

// Authentication error handler
export const authErrorHandler = (message: string = 'Authentication failed') => {
  return new AppError(message, 401, true);
};

// Authorization error handler
export const authorizationErrorHandler = (message: string = 'Insufficient permissions') => {
  return new AppError(message, 403, true);
};

// Not found error handler
export const notFoundErrorHandler = (resource: string = 'Resource') => {
  return new AppError(`${resource} not found`, 404, true);
};

// Rate limit error handler
export const rateLimitErrorHandler = (message: string = 'Too many requests') => {
  return new AppError(message, 429, true);
};