/**
 * Custom Error Classes for the Bus Tracking System
 * Following the Coding Standards & Best Practices Guide
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    context?: Record<string, unknown>
  ) {
    super(message, 400, true, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    context?: Record<string, unknown>
  ) {
    super(message, 401, true, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Access denied',
    context?: Record<string, unknown>
  ) {
    super(message, 403, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    context?: Record<string, unknown>
  ) {
    super(message, 404, true, context);
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource conflict',
    context?: Record<string, unknown>
  ) {
    super(message, 409, true, context);
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    context?: Record<string, unknown>
  ) {
    super(message, 500, true, context);
  }
}

export class WebSocketError extends AppError {
  constructor(
    message: string = 'WebSocket operation failed',
    context?: Record<string, unknown>
  ) {
    super(message, 500, true, context);
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    context?: Record<string, unknown>
  ) {
    super(message, 429, true, context);
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string = 'External service error',
    context?: Record<string, unknown>
  ) {
    super(`${service}: ${message}`, 502, true, { service, ...context });
  }
}

// Error handler utility functions
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

export const createErrorResponse = (error: Error) => {
  if (error instanceof AppError) {
    return {
      error: {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: error.timestamp,
        context: error.context,
      },
    };
  }

  // For non-operational errors, return generic message
  return {
    error: {
      name: 'InternalServerError',
      message: 'Something went wrong',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    },
  };
};

// Error logging utility
export const logError = (error: Error, context?: Record<string, unknown>) => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
  };

  if (error instanceof AppError) {
    console.error('🚨 Operational Error:', errorInfo);
  } else {
    console.error('💥 Non-Operational Error:', errorInfo);
  }
};
