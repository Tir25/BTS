/**
 * Error types and error creators
 */

export interface AppError extends Error {
  code: string;
  statusCode?: number;
  isOperational?: boolean;
  userMessage?: string;
}

export class CustomError extends Error implements AppError {
  public code: string;
  public statusCode: number;
  public isOperational: boolean;
  public userMessage: string;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    userMessage?: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.userMessage = userMessage || message;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error creators
export const createNetworkError = (message: string = 'Network connection failed') =>
  new CustomError(message, 'NETWORK_ERROR', 0, 'Please check your internet connection');

export const createValidationError = (message: string = 'Invalid data provided') =>
  new CustomError(message, 'VALIDATION_ERROR', 400, 'Please check your input and try again');

export const createAuthenticationError = (message: string = 'Authentication failed') => {
  // PRODUCTION FIX: Import translateError to preserve meaningful error messages
  // For authentication errors, we want to preserve specific messages like "Invalid email or password"
  let userMessage: string;
  
  // Check if message is meaningful (not generic) - if so, use it as userMessage
  // Otherwise, use a generic message
  if (message && message !== 'Authentication failed' && !message.includes('401') && !message.includes('Unauthorized')) {
    // Message is specific (e.g., "Invalid email or password") - use it directly
    userMessage = message;
  } else {
    // Generic authentication error - use generic message
    userMessage = 'Please log in again';
  }
  
  return new CustomError(message, 'AUTH_ERROR', 401, userMessage);
};

export const createAuthorizationError = (message: string = 'Access denied') =>
  new CustomError(message, 'AUTHZ_ERROR', 403, 'You do not have permission for this action');

export const createNotFoundError = (message: string = 'Resource not found') =>
  new CustomError(message, 'NOT_FOUND', 404, 'The requested resource was not found');

export const createConflictError = (message: string = 'Resource already exists') =>
  new CustomError(message, 'CONFLICT', 409, 'This resource already exists');

export const createRateLimitError = (message: string = 'Too many requests') =>
  new CustomError(message, 'RATE_LIMIT', 429, 'Please wait a moment before trying again');

export const createServerError = (message: string = 'Server error') =>
  new CustomError(message, 'SERVER_ERROR', 500, 'Something went wrong. Please try again later');

export const createServiceUnavailableError = (message: string = 'Service unavailable') =>
  new CustomError(message, 'SERVICE_UNAVAILABLE', 503, 'Service is temporarily unavailable');

