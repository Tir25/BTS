import { useCallback, useState } from 'react';
import { logger } from '../utils/logger';
import { errorHandler, CustomError, AppError } from '../utils/errorHandler';

interface DriverErrorState {
  error: string | null;
  errorCode: string | null;
  isRetrying: boolean;
  retryCount: number;
}

interface DriverErrorActions {
  handleError: (error: unknown, context: string) => void;
  clearError: () => void;
  retry: () => Promise<void>;
  setRetrying: (isRetrying: boolean) => void;
}

interface UseDriverErrorHandlerOptions {
  maxRetries?: number;
  onError?: (error: AppError, context: string) => void;
  onRetry?: () => Promise<void>;
}

export function useDriverErrorHandler(
  options: UseDriverErrorHandlerOptions = {}
): DriverErrorState & DriverErrorActions {
  const { maxRetries = 3, onError, onRetry } = options;
  
  const [errorState, setErrorState] = useState<DriverErrorState>({
    error: null,
    errorCode: null,
    isRetrying: false,
    retryCount: 0,
  });

  const handleError = useCallback((error: unknown, context: string) => {
    const appError = errorHandler.handleError(error, `DriverErrorHandler-${context}`);
    
    logger.error(`Driver error in ${context}`, 'driver-error-handler', {
      error: appError.message,
      code: appError.code,
      context,
      retryCount: errorState.retryCount,
    });

    setErrorState(prev => ({
      ...prev,
      error: appError.userMessage || appError.message,
      errorCode: appError.code,
    }));

    // Call custom error handler if provided
    if (onError) {
      onError(appError, context);
    }
  }, [errorState.retryCount, onError]);

  const clearError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      error: null,
      errorCode: null,
    }));
  }, []);

  const retry = useCallback(async () => {
    if (errorState.retryCount >= maxRetries) {
      logger.warn('Max retries reached', 'driver-error-handler', {
        retryCount: errorState.retryCount,
        maxRetries,
      });
      return;
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
    }));

    try {
      if (onRetry) {
        await onRetry();
      }
      
      // Clear error on successful retry
      setErrorState(prev => ({
        ...prev,
        error: null,
        errorCode: null,
        isRetrying: false,
      }));
      
      logger.info('Retry successful', 'driver-error-handler', {
        retryCount: errorState.retryCount + 1,
      });
    } catch (err) {
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
      }));
      
      handleError(err, 'retry');
    }
  }, [errorState.retryCount, maxRetries, onRetry, handleError]);

  const setRetrying = useCallback((isRetrying: boolean) => {
    setErrorState(prev => ({
      ...prev,
      isRetrying,
    }));
  }, []);

  return {
    ...errorState,
    handleError,
    clearError,
    retry,
    setRetrying,
  };
}

// Convenience hook for specific driver error types
export function useDriverLocationError() {
  return useDriverErrorHandler({
    maxRetries: 2,
    onError: (error) => {
      logger.error('Location error occurred', 'driver-location-error', {
        error: error.message,
        code: error.code,
      });
    },
  });
}

export function useDriverWebSocketError() {
  return useDriverErrorHandler({
    maxRetries: 5,
    onError: (error) => {
      logger.error('WebSocket error occurred', 'driver-websocket-error', {
        error: error.message,
        code: error.code,
      });
    },
  });
}

export function useDriverAuthError() {
  return useDriverErrorHandler({
    maxRetries: 1,
    onError: (error) => {
      logger.error('Authentication error occurred', 'driver-auth-error', {
        error: error.message,
        code: error.code,
      });
    },
  });
}
