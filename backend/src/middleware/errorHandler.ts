import { Request, Response, NextFunction } from 'express';
import { AppError, isOperationalError, createErrorResponse, logError } from '../utils/errors';
import { initializeEnvironment } from '../config/environment';

const config = initializeEnvironment();

/**
 * Enhanced Error Handling Middleware
 * Follows the Coding Standards & Best Practices Guide
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error with context
  logError(error, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Handle different types of errors
  if (error instanceof AppError) {
    // Operational errors - send error response
    const errorResponse = createErrorResponse(error);
    
    // Don't expose sensitive information in production
    if (config.nodeEnv === 'production') {
      // Remove context in production
      delete errorResponse.error.context;
    }

    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle validation errors from express-validator
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: {
        name: 'ValidationError',
        message: 'Request validation failed',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        details: error.message,
      },
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: {
        name: 'AuthenticationError',
        message: 'Invalid token',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      error: {
        name: 'AuthenticationError',
        message: 'Token expired',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Handle database connection errors
  if (error.name === 'DatabaseConnectionError') {
    res.status(503).json({
      error: {
        name: 'ServiceUnavailableError',
        message: 'Database service unavailable',
        statusCode: 503,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Handle rate limiting errors
  if (error.name === 'TooManyRequestsError') {
    res.status(429).json({
      error: {
        name: 'RateLimitError',
        message: 'Too many requests',
        statusCode: 429,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Handle CORS errors
  if (error.message.includes('CORS')) {
    res.status(403).json({
      error: {
        name: 'CORSError',
        message: 'CORS policy violation',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Default error handler for unknown errors
  const statusCode = 500;
  const message = config.nodeEnv === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(statusCode).json({
    error: {
      name: 'InternalServerError',
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      ...(config.nodeEnv === 'development' && { stack: error.stack }),
    },
  });
};

/**
 * Async error wrapper to catch async errors in route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      name: 'NotFoundError',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        '/',
        '/health',
        '/health/detailed',
        '/buses',
        '/routes',
        '/admin',
        '/storage',
        '/locations',
        '/sse',
      ],
    },
  });
};

/**
 * Global uncaught exception handler
 */
export const setupGlobalErrorHandlers = () => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logError(error, { type: 'uncaughtException' });
    
    // Exit the process as the application is in an undefined state
    console.error('💥 Uncaught Exception! Shutting down...');
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logError(new Error(`Unhandled Rejection: ${reason}`), { 
      type: 'unhandledRejection',
      promise: promise.toString(),
    });
    
    // Exit the process as the application is in an undefined state
    console.error('💥 Unhandled Rejection! Shutting down...');
    process.exit(1);
  });

  // Handle SIGTERM signal
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
  });

  // Handle SIGINT signal
  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received. Shutting down gracefully...');
    process.exit(0);
  });
};
