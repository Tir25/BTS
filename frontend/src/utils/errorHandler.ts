/**
 * Centralized error handling utility for consistent error management across the application
 */

// Standard error types for consistent categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

// Error severity levels
export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

// Structured error object
export interface AppError {
  type: ErrorType;
  message: string;
  severity: ErrorSeverity;
  originalError?: Error | unknown;
  code?: string;
  context?: Record<string, any>;
  timestamp: string;
}

// Error response from API
export interface ErrorResponse {
  success: boolean;
  error?: string;
  message?: string;
  status?: number;
  code?: string;
}

/**
 * Create a standardized application error
 */
export function createError(
  type: ErrorType,
  message: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  originalError?: Error | unknown,
  context?: Record<string, any>,
  code?: string
): AppError {
  return {
    type,
    message,
    severity,
    originalError,
    context,
    code,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle API errors with consistent formatting
 */
export function handleApiError(
  error: unknown,
  defaultMessage = 'An unexpected error occurred'
): AppError {
  // Handle standard Error objects
  if (error instanceof Error) {
    return createError(
      ErrorType.UNKNOWN,
      error.message || defaultMessage,
      ErrorSeverity.ERROR,
      error
    );
  }

  // Handle API error responses
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as ErrorResponse;
    
    if (errorObj.error || errorObj.message) {
      // Determine error type based on status code or other properties
      let errorType = ErrorType.UNKNOWN;
      let severity = ErrorSeverity.ERROR;
      
      if (errorObj.status) {
        if (errorObj.status === 401) {
          errorType = ErrorType.AUTHENTICATION;
        } else if (errorObj.status === 403) {
          errorType = ErrorType.AUTHORIZATION;
        } else if (errorObj.status === 404) {
          errorType = ErrorType.NOT_FOUND;
          severity = ErrorSeverity.WARNING;
        } else if (errorObj.status === 400 || errorObj.status === 422) {
          errorType = ErrorType.VALIDATION;
        } else if (errorObj.status >= 500) {
          errorType = ErrorType.SERVER;
          severity = ErrorSeverity.CRITICAL;
        }
      }
      
      return createError(
        errorType,
        errorObj.message || errorObj.error || defaultMessage,
        severity,
        error,
        { response: errorObj },
        errorObj.code
      );
    }
  }

  // Handle network errors
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    (error.message.includes('network') || error.message.includes('fetch'))
  ) {
    return createError(
      ErrorType.NETWORK,
      'Network error. Please check your connection.',
      ErrorSeverity.WARNING,
      error
    );
  }

  // Handle timeout errors
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.includes('timeout')
  ) {
    return createError(
      ErrorType.TIMEOUT,
      'Request timed out. Please try again.',
      ErrorSeverity.WARNING,
      error
    );
  }

  // Default case for unknown errors
  return createError(
    ErrorType.UNKNOWN,
    defaultMessage,
    ErrorSeverity.ERROR,
    error
  );
}

/**
 * Log error with consistent formatting
 */
export function logError(error: AppError): void {
  const { type, message, severity, originalError, context, code, timestamp } = error;
  
  // Prepare log data
  const logData = {
    type,
    message,
    severity,
    code,
    timestamp,
    context,
  };
  
  // Log based on severity
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      console.error('❌ CRITICAL ERROR:', logData, originalError);
      // In production, you might want to send this to an error tracking service
      break;
    case ErrorSeverity.ERROR:
      console.error('❌ ERROR:', logData, originalError);
      break;
    case ErrorSeverity.WARNING:
      console.warn('⚠️ WARNING:', logData, originalError);
      break;
    case ErrorSeverity.INFO:
      console.info('ℹ️ INFO:', logData, originalError);
      break;
    default:
      console.error('❓ UNKNOWN ERROR:', logData, originalError);
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  // Return custom message based on error type
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Network connection issue. Please check your internet connection and try again.';
    case ErrorType.AUTHENTICATION:
      return 'Authentication failed. Please log in again.';
    case ErrorType.AUTHORIZATION:
      return 'You do not have permission to perform this action.';
    case ErrorType.VALIDATION:
      return error.message || 'Please check your input and try again.';
    case ErrorType.SERVER:
      return 'Server error. Our team has been notified and is working on it.';
    case ErrorType.NOT_FOUND:
      return 'The requested resource was not found.';
    case ErrorType.TIMEOUT:
      return 'The request timed out. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Handle error and return standardized response
 */
export function handleError(
  error: unknown,
  defaultMessage = 'An unexpected error occurred'
): { success: false; error: AppError; data: null } {
  const appError = handleApiError(error, defaultMessage);
  logError(appError);
  
  return {
    success: false,
    error: appError,
    data: null,
  };
}

export default {
  createError,
  handleApiError,
  logError,
  getUserFriendlyMessage,
  handleError,
  ErrorType,
  ErrorSeverity,
};
