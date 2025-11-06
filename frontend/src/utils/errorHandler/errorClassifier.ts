import { CustomError, AppError, createNetworkError, createAuthenticationError, createAuthorizationError, createNotFoundError, createConflictError, createRateLimitError, createServerError, createServiceUnavailableError } from './errorTypes';
import { translateError } from '../errorMessageTranslator';

/**
 * Error classifier
 * Classifies and converts errors into AppError instances
 */
export class ErrorClassifier {
  /**
   * Classify a generic error into an AppError
   */
  classifyError(error: unknown): AppError {
    if (error instanceof CustomError) {
      return error;
    } else if (error instanceof Error) {
      return new CustomError(
        error.message,
        'UNKNOWN_ERROR',
        500,
        'An unexpected error occurred'
      );
    } else {
      return new CustomError(
        String(error),
        'UNKNOWN_ERROR',
        500,
        'An unexpected error occurred'
      );
    }
  }

  /**
   * Classify an API error based on error message patterns
   */
  classifyApiError(error: unknown): AppError {
    if (error instanceof CustomError) {
      return error;
    } else if (error instanceof Error) {
      // Check for specific error patterns and use translated messages
      if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        return createNetworkError(error.message);
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return createAuthenticationError(error.message);
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        return createAuthorizationError(error.message);
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        return createNotFoundError(error.message);
      } else if (error.message.includes('409') || error.message.includes('Conflict')) {
        return createConflictError(error.message);
      } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        return createRateLimitError(error.message);
      } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        return createServerError(error.message);
      } else if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
        return createServiceUnavailableError(error.message);
      } else {
        return new CustomError(
          error.message,
          'API_ERROR',
          500,
          translateError(error.message, 'Request failed. Please try again.')
        );
      }
    } else {
      return new CustomError(
        String(error),
        'API_ERROR',
        500,
        translateError(String(error), 'Request failed. Please try again.')
      );
    }
  }

  /**
   * Classify a WebSocket error
   */
  classifyWebSocketError(error: unknown): AppError {
    if (error instanceof CustomError) {
      return error;
    } else if (error instanceof Error) {
      if (error.message.includes('connection')) {
        return createNetworkError('WebSocket connection failed');
      } else if (error.message.includes('timeout')) {
        return new CustomError(
          'WebSocket connection timeout',
          'WEBSOCKET_TIMEOUT',
          0,
          'Connection timed out. Please try again.'
        );
      } else {
        return new CustomError(
          error.message,
          'WEBSOCKET_ERROR',
          0,
          'Connection error occurred'
        );
      }
    } else {
      return new CustomError(
        String(error),
        'WEBSOCKET_ERROR',
        0,
        'Connection error occurred'
      );
    }
  }

  /**
   * Classify a location error
   */
  classifyLocationError(error: unknown): AppError {
    if (error instanceof GeolocationPositionError) {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          return new CustomError(
            'Location access denied',
            'LOCATION_PERMISSION_DENIED',
            0,
            'Please allow location access to use this feature'
          );
        case error.POSITION_UNAVAILABLE:
          return new CustomError(
            'Location unavailable',
            'LOCATION_UNAVAILABLE',
            0,
            'Location information is not available'
          );
        case error.TIMEOUT:
          return new CustomError(
            'Location timeout',
            'LOCATION_TIMEOUT',
            0,
            'Location request timed out. Please try again.'
          );
        default:
          return new CustomError(
            'Location error',
            'LOCATION_ERROR',
            0,
            'Failed to get location information'
          );
      }
    } else if (error instanceof Error) {
      return new CustomError(
        error.message,
        'LOCATION_ERROR',
        0,
        'Failed to get location information'
      );
    } else {
      return new CustomError(
        String(error),
        'LOCATION_ERROR',
        0,
        'Failed to get location information'
      );
    }
  }
}

// Export singleton instance
export const errorClassifier = new ErrorClassifier();

