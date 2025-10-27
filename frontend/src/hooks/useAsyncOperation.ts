import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../utils/logger';

export interface UseAsyncOperationOptions {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseAsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retryCount: number;
}

export interface UseAsyncOperationResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Custom hook for managing async operations with loading state coordination
 * Prevents race conditions and provides consistent loading states
 */
export function useAsyncOperation<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions = {}
): UseAsyncOperationResult<T> {
  const {
    timeout = 30000,
    retryCount: maxRetries = 0,
    retryDelay = 1000,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<UseAsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      // Cancel any previous operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const currentController = abortControllerRef.current;

      // Set loading state
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));
      }

      try {
        // Set timeout
        timeoutRef.current = setTimeout(() => {
          if (currentController && !currentController.signal.aborted) {
            currentController.abort();
            const timeoutError = new Error('Operation timed out');
            if (mountedRef.current) {
              setState((prev) => ({
                ...prev,
                loading: false,
                error: timeoutError,
                retryCount: prev.retryCount,
              }));
            }
            if (onError) onError(timeoutError);
            logger.error('Async operation timed out', 'useAsyncOperation', { timeout });
          }
        }, timeout);

        // Execute async function
        const result = await asyncFunction(...args, currentController.signal);

        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Update state on success
        if (mountedRef.current && !currentController.signal.aborted) {
          setState({
            data: result,
            loading: false,
            error: null,
            retryCount: 0,
          });
          if (onSuccess) onSuccess();
        }

        return result;
      } catch (error) {
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Check if operation was aborted
        if (currentController.signal.aborted) {
          return null;
        }

        const errorObj = error instanceof Error ? error : new Error(String(error));

        // Retry logic
        if (mountedRef.current && state.retryCount < maxRetries) {
          setState((prev) => ({
            ...prev,
            retryCount: prev.retryCount + 1,
          }));

          logger.warn(`Retrying async operation (attempt ${state.retryCount + 1}/${maxRetries})`, 'useAsyncOperation', {
            error: errorObj.message,
          });

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay));

          // Retry operation
          return execute(...args);
        }

        // Update state on final failure
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: errorObj,
            retryCount: prev.retryCount,
          }));
        }

        if (onError) onError(errorObj);
        logger.error('Async operation failed', 'useAsyncOperation', { error: errorObj.message });

        return null;
      }
    },
    [asyncFunction, timeout, maxRetries, retryDelay, onSuccess, onError, state.retryCount]
  );

  const reset = useCallback(() => {
    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Reset state
    if (mountedRef.current) {
      setState({
        data: null,
        loading: false,
        error: null,
        retryCount: 0,
      });
    }
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    execute,
    reset,
  };
}

export default useAsyncOperation;
