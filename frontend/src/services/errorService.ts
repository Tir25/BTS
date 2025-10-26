/**
 * Centralized Error Service
 * Provides consistent error handling for API calls and other services
 */

import { errorHandler, AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

export interface ErrorServiceConfig {
  retryAttempts?: number;
  retryDelay?: number;
  showNotifications?: boolean;
  logErrors?: boolean;
}

export class ErrorService {
  private static instance: ErrorService;
  private config: ErrorServiceConfig;

  constructor(config: ErrorServiceConfig = {}) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      showNotifications: true,
      logErrors: true,
      ...config,
    };
  }

  static getInstance(config?: ErrorServiceConfig): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService(config);
    }
    return ErrorService.instance;
  }

  // Handle API errors with retry logic
  async handleApiCall<T>(
    apiCall: () => Promise<T>,
    context?: string,
    retryAttempts?: number
  ): Promise<T> {
    const maxAttempts = retryAttempts ?? this.config.retryAttempts ?? 3;
    let lastError: AppError | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await apiCall();
        
        if (this.config.logErrors) {
          logger.info(
            `API call successful on attempt ${attempt}`,
            context || 'api-call',
            { attempt, maxAttempts }
          );
        }
        
        return result;
      } catch (error) {
        lastError = errorHandler.handleApiError(error, context);
        
        if (this.config.logErrors) {
          logger.error(
            `API call failed on attempt ${attempt}`,
            context || 'api-call',
            {
              attempt,
              maxAttempts,
              error: lastError.message,
              code: lastError.code,
              isOperational: lastError.isOperational,
            }
          );
        }

        // Don't retry for certain error types
        if (!this.shouldRetry(lastError)) {
          break;
        }

        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          break;
        }

        // Wait before retrying
        await this.delay(this.config.retryDelay ?? 1000);
      }
    }

    // All retry attempts failed
    if (this.config.showNotifications && lastError) {
      this.showErrorNotification(lastError);
    }

    throw lastError || new Error('API call failed after all retry attempts');
  }

  // Handle WebSocket errors
  handleWebSocketError(error: unknown, context?: string): AppError {
    const appError = errorHandler.handleWebSocketError(error, context);
    
    if (this.config.logErrors) {
      logger.error(
        'WebSocket error handled',
        context || 'websocket',
        {
          error: appError.message,
          code: appError.code,
        }
      );
    }

    if (this.config.showNotifications) {
      this.showErrorNotification(appError);
    }

    return appError;
  }

  // Handle location errors
  handleLocationError(error: unknown): AppError {
    const appError = errorHandler.handleLocationError(error);
    
    if (this.config.logErrors) {
      logger.error(
        'Location error handled',
        'location',
        {
          error: appError.message,
          code: appError.code,
        }
      );
    }

    if (this.config.showNotifications) {
      this.showErrorNotification(appError);
    }

    return appError;
  }

  // Handle general errors
  handleError(error: unknown, context?: string): AppError {
    const appError = errorHandler.handleError(error, context);
    
    if (this.config.logErrors) {
      logger.error(
        'General error handled',
        context || 'general',
        {
          error: appError.message,
          code: appError.code,
          isOperational: appError.isOperational,
        }
      );
    }

    if (this.config.showNotifications) {
      this.showErrorNotification(appError);
    }

    return appError;
  }

  // Check if error should trigger a retry
  private shouldRetry(error: AppError): boolean {
    // Don't retry for client errors (4xx) except 429 (rate limit)
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return error.statusCode === 429; // Only retry on rate limit
    }

    // Don't retry for certain error codes
    const nonRetryableCodes = [
      'AUTH_ERROR',
      'AUTHZ_ERROR',
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'CONFLICT',
    ];

    return !nonRetryableCodes.includes(error.code);
  }

  // Delay utility
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Show error notification to user
  private showErrorNotification(error: AppError): void {
    // This would integrate with your notification system
    // For now, we'll use console.warn as a placeholder
    logger.warn('Warning', 'component', { data: `Error Notification: ${error.userMessage || error.message}` });
    
    // In a real implementation, you might:
    // - Show a toast notification
    // - Display an error modal
    // - Update a global error state
    // - Send to an error reporting service
  }

  // Update configuration
  updateConfig(newConfig: Partial<ErrorServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): ErrorServiceConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const errorService = ErrorService.getInstance();

// Convenience functions
export const handleApiCall = <T>(
  apiCall: () => Promise<T>,
  context?: string,
  retryAttempts?: number
) => errorService.handleApiCall(apiCall, context, retryAttempts);

export const handleWebSocketError = (error: unknown, context?: string) =>
  errorService.handleWebSocketError(error, context);

export const handleLocationError = (error: unknown) =>
  errorService.handleLocationError(error);

export const handleError = (error: unknown, context?: string) =>
  errorService.handleError(error, context);
