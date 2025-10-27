/**
 * Centralized Error Handling Utilities
 * Provides consistent error handling across the frontend application
 */

import { logger } from './logger';
import { translateError } from './errorMessageTranslator';

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

// Predefined error types
export const createNetworkError = (message: string = 'Network connection failed') =>
  new CustomError(message, 'NETWORK_ERROR', 0, 'Please check your internet connection');

export const createValidationError = (message: string = 'Invalid data provided') =>
  new CustomError(message, 'VALIDATION_ERROR', 400, 'Please check your input and try again');

export const createAuthenticationError = (message: string = 'Authentication failed') =>
  new CustomError(message, 'AUTH_ERROR', 401, 'Please log in again');

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

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle different types of errors
  handleError(error: unknown, context?: string): AppError {
    let appError: AppError;

    if (error instanceof CustomError) {
      appError = error;
    } else if (error instanceof Error) {
      // Convert generic Error to AppError
      appError = new CustomError(
        error.message,
        'UNKNOWN_ERROR',
        500,
        'An unexpected error occurred'
      );
    } else {
      // Handle non-Error objects
      appError = new CustomError(
        String(error),
        'UNKNOWN_ERROR',
        500,
        'An unexpected error occurred'
      );
    }

    // Log the error
    logger.error(
      `Error in ${context || 'unknown context'}`,
      context || 'error-handler',
      {
        error: appError.message,
        code: appError.code,
        statusCode: appError.statusCode,
        stack: appError.stack,
      }
    );

    return appError;
  }

  // Handle API errors
  handleApiError(error: unknown, endpoint?: string): AppError {
    let appError: AppError;

    if (error instanceof CustomError) {
      appError = error;
    } else if (error instanceof Error) {
      // Check for specific error patterns and use translated messages
      if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        appError = createNetworkError(error.message);
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        appError = createAuthenticationError(error.message);
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        appError = createAuthorizationError(error.message);
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        appError = createNotFoundError(error.message);
      } else if (error.message.includes('409') || error.message.includes('Conflict')) {
        appError = createConflictError(error.message);
      } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        appError = createRateLimitError(error.message);
      } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        appError = createServerError(error.message);
      } else if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
        appError = createServiceUnavailableError(error.message);
      } else {
        appError = new CustomError(
          error.message,
          'API_ERROR',
          500,
          translateError(error.message, 'Request failed. Please try again.')
        );
      }
    } else {
      appError = new CustomError(
        String(error),
        'API_ERROR',
        500,
        translateError(String(error), 'Request failed. Please try again.')
      );
    }

    // Log the API error
    logger.error(
      `API Error in ${endpoint || 'unknown endpoint'}`,
      'api-error-handler',
      {
        error: appError.message,
        code: appError.code,
        statusCode: appError.statusCode,
        endpoint,
        stack: appError.stack,
      }
    );

    return appError;
  }

  // Handle WebSocket errors
  handleWebSocketError(error: unknown, context?: string): AppError {
    let appError: AppError;

    if (error instanceof CustomError) {
      appError = error;
    } else if (error instanceof Error) {
      if (error.message.includes('connection')) {
        appError = createNetworkError('WebSocket connection failed');
      } else if (error.message.includes('timeout')) {
        appError = new CustomError(
          'WebSocket connection timeout',
          'WEBSOCKET_TIMEOUT',
          0,
          'Connection timed out. Please try again.'
        );
      } else {
        appError = new CustomError(
          error.message,
          'WEBSOCKET_ERROR',
          0,
          'Connection error occurred'
        );
      }
    } else {
      appError = new CustomError(
        String(error),
        'WEBSOCKET_ERROR',
        0,
        'Connection error occurred'
      );
    }

    // Log the WebSocket error
    logger.error(
      `WebSocket Error in ${context || 'unknown context'}`,
      'websocket-error-handler',
      {
        error: appError.message,
        code: appError.code,
        context,
      }
    );

    return appError;
  }

  // Handle location errors
  handleLocationError(error: unknown): AppError {
    let appError: AppError;

    if (error instanceof GeolocationPositionError) {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          appError = new CustomError(
            'Location access denied',
            'LOCATION_PERMISSION_DENIED',
            0,
            'Please allow location access to use this feature'
          );
          break;
        case error.POSITION_UNAVAILABLE:
          appError = new CustomError(
            'Location unavailable',
            'LOCATION_UNAVAILABLE',
            0,
            'Location information is not available'
          );
          break;
        case error.TIMEOUT:
          appError = new CustomError(
            'Location timeout',
            'LOCATION_TIMEOUT',
            0,
            'Location request timed out. Please try again.'
          );
          break;
        default:
          appError = new CustomError(
            'Location error',
            'LOCATION_ERROR',
            0,
            'Failed to get location information'
          );
      }
    } else if (error instanceof Error) {
      appError = new CustomError(
        error.message,
        'LOCATION_ERROR',
        0,
        'Failed to get location information'
      );
    } else {
      appError = new CustomError(
        String(error),
        'LOCATION_ERROR',
        0,
        'Failed to get location information'
      );
    }

    // Log the location error
    logger.error(
      'Location Error',
      'location-error-handler',
      {
        error: appError.message,
        code: appError.code,
        stack: appError.stack,
      }
    );

    return appError;
  }

  // Get user-friendly error message
  getUserMessage(error: AppError): string {
    return error.userMessage || error.message;
  }

  // Check if error is operational (can be handled gracefully)
  isOperational(error: AppError): boolean {
    return error.isOperational !== false;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export const handleError = (error: unknown, context?: string) =>
  errorHandler.handleError(error, context);

export const handleApiError = (error: unknown, endpoint?: string) =>
  errorHandler.handleApiError(error, endpoint);

export const handleWebSocketError = (error: unknown, context?: string) =>
  errorHandler.handleWebSocketError(error, context);

export const handleLocationError = (error: unknown) =>
  errorHandler.handleLocationError(error);

export const getUserMessage = (error: AppError) =>
  errorHandler.getUserMessage(error);

export const isOperational = (error: AppError) =>
  errorHandler.isOperational(error);

// Legacy compatibility function
export const logError = (error: unknown, context?: string) => {
  const appError = errorHandler.handleError(error, context);
  return appError;
};
