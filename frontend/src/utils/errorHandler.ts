/**
 * Centralized Error Handling Utilities
 * Provides consistent error handling across the frontend application
 */

// Re-export error types and creators
export type { AppError } from './errorHandler/errorTypes';
export { CustomError, createNetworkError, createValidationError, createAuthenticationError, createAuthorizationError, createNotFoundError, createConflictError, createRateLimitError, createServerError, createServiceUnavailableError } from './errorHandler/errorTypes';

// Import classifiers and loggers
import { errorClassifier } from './errorHandler/errorClassifier';
import { errorLogger } from './errorHandler/errorLogger';

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
    const appError = errorClassifier.classifyError(error);
    errorLogger.logError(appError, context);
    return appError;
  }

  // Handle API errors
  handleApiError(error: unknown, endpoint?: string): AppError {
    const appError = errorClassifier.classifyApiError(error);
    errorLogger.logApiError(appError, endpoint);
    return appError;
  }

  // Handle WebSocket errors
  handleWebSocketError(error: unknown, context?: string): AppError {
    const appError = errorClassifier.classifyWebSocketError(error);
    errorLogger.logWebSocketError(appError, context);
    return appError;
  }

  // Handle location errors
  handleLocationError(error: unknown): AppError {
    const appError = errorClassifier.classifyLocationError(error);
    errorLogger.logLocationError(appError);
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
