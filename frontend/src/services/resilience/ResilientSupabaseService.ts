/**
 * Resilient Supabase Service
 * Wraps Supabase queries with retry logic, error handling, and graceful degradation
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import { standardBackoff, quickBackoff } from './ExponentialBackoff';
import { supabaseCircuitBreaker } from './CircuitBreaker';
import { logger } from '../../utils/logger';
import { errorHandler, createNetworkError } from '../../utils/errorHandler';

export interface SupabaseQueryOptions {
  timeout?: number;
  retryOnFailure?: boolean;
  useCircuitBreaker?: boolean;
  maxRetries?: number;
  fallbackData?: any;
}

export interface SupabaseQueryResult<T> {
  data: T | null;
  error: Error | null;
  fromCache?: boolean;
  retries?: number;
}

class ResilientSupabaseService {
  private client: SupabaseClient;
  private defaultTimeout: number = 10000; // 10 seconds
  private isOnline: boolean = navigator.onLine;

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
    this.setupNetworkListeners();
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    const onlineHandler = () => {
      this.isOnline = true;
      logger.info('🌐 Network connection restored', 'ResilientSupabase');
    };

    const offlineHandler = () => {
      this.isOnline = false;
      logger.warn('📴 Network connection lost', 'ResilientSupabase');
    };

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
  }

  /**
   * Check if error is retriable (network errors, timeouts, etc.)
   */
  private isRetriableError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || String(error);
    const errorCode = error.code || '';

    // Network errors are retriable
    if (
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('Network request failed') ||
      errorMessage.includes('network') ||
      errorCode === 'NETWORK_ERROR'
    ) {
      return true;
    }

    // Timeout errors are retriable
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('TIMEOUT') ||
      errorCode === 'TIMEOUT'
    ) {
      return true;
    }

    // 5xx server errors are retriable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // 408 Request Timeout is retriable
    if (error.status === 408) {
      return true;
    }

    // 429 Too Many Requests is retriable
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Execute Supabase query with resilience
   */
  async query<T>(
    queryFn: () => Promise<{ data: T | null; error: any }> | { data: T | null; error: any },
    options: SupabaseQueryOptions = {}
  ): Promise<SupabaseQueryResult<T>> {
    const {
      timeout = this.defaultTimeout,
      retryOnFailure = true,
      useCircuitBreaker = true,
      maxRetries = 3,
      fallbackData = null,
    } = options;

    // Check network status
    if (!this.isOnline) {
      logger.warn('📴 Offline - cannot execute Supabase query', 'ResilientSupabase');
      return {
        data: fallbackData,
        error: createNetworkError('No internet connection'),
        fromCache: false,
      };
    }

    // Wrap query with timeout and better error handling
    const queryWithTimeout = async (): Promise<{ data: T | null; error: any }> => {
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      let queryAborted = false;
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          queryAborted = true;
          const timeoutError = new Error(`Query timeout after ${timeout}ms`);
          // Add timeout flag to error for better error handling
          (timeoutError as any).isTimeout = true;
          (timeoutError as any).timeoutMs = timeout;
          reject(timeoutError);
        }, timeout);
      });

      try {
        const queryResult = queryFn();
        // Handle both Promise and direct return
        const result = queryResult instanceof Promise ? await queryResult : queryResult;
        
        // PRODUCTION FIX: Use Promise.race but ensure timeout is cleared if query completes first
        const finalResult = await Promise.race([
          Promise.resolve(result).then(data => {
            // Clear timeout if query completes before timeout
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
              timeoutHandle = null;
            }
            return data;
          }),
          timeoutPromise
        ]);
        
        return finalResult;
      } catch (error) {
        // Clear timeout on error
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        
        // Re-throw timeout errors as-is, wrap other errors
        if (queryAborted || (error as any)?.isTimeout) {
          throw error;
        }
        
        // Wrap other errors
        throw error instanceof Error ? error : new Error(String(error));
      } finally {
        // Safety: ensure timeout is always cleared
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
      }
    };

    // Execute with circuit breaker if enabled
    if (useCircuitBreaker) {
      try {
        const result = await supabaseCircuitBreaker.execute(
          () => queryWithTimeout(),
          fallbackData !== null ? () => Promise.resolve({ data: fallbackData, error: null }) : undefined
        );

        if (result.error && this.isRetriableError(result.error) && retryOnFailure) {
          return await this.retryQuery(
            async () => {
              const maybePromise = queryFn();
              return maybePromise instanceof Promise ? await maybePromise : maybePromise;
            },
            options
          );
        }

        return {
          data: result.data,
          error: result.error ? new Error(result.error.message || String(result.error)) : null,
          retries: 0,
        };
      } catch (error) {
        const appError = errorHandler.handleError(error, 'ResilientSupabase-query');
        return {
          data: fallbackData,
          error: appError,
          retries: 0,
        };
      }
    }

    // Execute without circuit breaker
    if (retryOnFailure) {
      return await this.retryQuery(
        async () => {
          const maybePromise = queryFn();
          return maybePromise instanceof Promise ? await maybePromise : maybePromise;
        },
        options
      );
    }

    try {
      const result = await queryWithTimeout();
      return {
        data: result.data,
        error: result.error ? new Error(result.error.message || String(result.error)) : null,
        retries: 0,
      };
    } catch (error) {
      const appError = errorHandler.handleError(error, 'ResilientSupabase-query');
      return {
        data: fallbackData,
        error: appError,
        retries: 0,
      };
    }
  }

  /**
   * Retry query with exponential backoff
   */
  private async retryQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options: SupabaseQueryOptions
  ): Promise<SupabaseQueryResult<T>> {
    const { timeout = this.defaultTimeout, maxRetries = 3, fallbackData = null } = options;

    const queryWithTimeout = async (): Promise<{ data: T | null; error: any }> => {
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Query timeout after ${timeout}ms`));
        }, timeout);
      });

      try {
        const result = await Promise.race([queryFn(), timeoutPromise]);
        return result;
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
      }
    };

    const backoff = maxRetries <= 3 ? quickBackoff : standardBackoff;

    const result = await backoff.execute(
      async () => {
        const queryResult = await queryWithTimeout();
        if (queryResult.error && !this.isRetriableError(queryResult.error)) {
          // Non-retriable error - throw immediately
          throw queryResult.error;
        }
        if (queryResult.error) {
          // Retriable error - throw to trigger retry
          throw queryResult.error;
        }
        return queryResult;
      },
      (attempt, delay, error) => {
        logger.info(`🔄 Retrying Supabase query (attempt ${attempt}/${maxRetries})`, 'ResilientSupabase', {
          delay: `${delay}ms`,
          error: error.message || String(error),
        });
      }
    );

    if (result.success && result.result) {
      return {
        data: result.result.data,
        error: result.result.error ? new Error(result.result.error.message || String(result.result.error)) : null,
        retries: result.attempts - 1,
      };
    }

    // All retries failed
    logger.error(`❌ Supabase query failed after ${result.attempts} attempts`, 'ResilientSupabase', {
      error: result.error?.message || String(result.error),
    });

    return {
      data: fallbackData,
      error: result.error || new Error('Query failed after retries'),
      retries: result.attempts,
    };
  }

  /**
   * Execute multiple Supabase queries with resilience
   */
  async batchQuery<T>(
    queries: Array<() => Promise<{ data: T | null; error: any }>>,
    options: SupabaseQueryOptions = {}
  ): Promise<Array<SupabaseQueryResult<T>>> {
    const results = await Promise.allSettled(
      queries.map((query) => this.query(query, options))
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        data: options.fallbackData || null,
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        retries: 0,
      };
    });
  }

  /**
   * Check Supabase connection health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const result = await this.query(
        async () => {
          const { data, error } = await this.client
            .from('user_profiles')
            .select('count')
            .limit(1);
          return { data, error };
        },
        {
          timeout: 5000,
          retryOnFailure: false,
          useCircuitBreaker: false,
        }
      );

      return result.error === null;
    } catch (error) {
      logger.error('Supabase health check failed', 'ResilientSupabase', { error });
      return false;
    }
  }
}

// Export singleton instance
export const resilientSupabase = new ResilientSupabaseService();

// Export utility functions
export const resilientQuery = <T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options?: SupabaseQueryOptions
) => resilientSupabase.query(queryFn, options);

export default ResilientSupabaseService;

