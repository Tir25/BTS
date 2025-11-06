import { logger } from '../logger';
import { AppError } from './errorTypes';

/**
 * Error logger
 * Handles error logging with consistent formatting
 */
export class ErrorLogger {
  /**
   * Log a general error
   */
  logError(error: AppError, context?: string): void {
    logger.error(
      `Error in ${context || 'unknown context'}`,
      context || 'error-handler',
      {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
      }
    );
  }

  /**
   * Log an API error
   */
  logApiError(error: AppError, endpoint?: string): void {
    logger.error(
      `API Error in ${endpoint || 'unknown endpoint'}`,
      'api-error-handler',
      {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        endpoint,
        stack: error.stack,
      }
    );
  }

  /**
   * Log a WebSocket error
   */
  logWebSocketError(error: AppError, context?: string): void {
    logger.error(
      `WebSocket Error in ${context || 'unknown context'}`,
      'websocket-error-handler',
      {
        error: error.message,
        code: error.code,
        context,
      }
    );
  }

  /**
   * Log a location error
   */
  logLocationError(error: AppError): void {
    logger.error(
      'Location Error',
      'location-error-handler',
      {
        error: error.message,
        code: error.code,
        stack: error.stack,
      }
    );
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

