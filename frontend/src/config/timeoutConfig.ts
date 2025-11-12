/**
 * Centralized Timeout Configuration
 * All timeout values for the application are defined here for consistency and maintainability
 */

export interface TimeoutConfig {
  // Authentication timeouts
  auth: {
    signIn: number; // Sign in timeout in milliseconds
    signOut: number; // Sign out timeout in milliseconds
    sessionRefresh: number; // Session refresh timeout in milliseconds
    tokenValidation: number; // Token validation timeout in milliseconds
    sessionSetting: number; // Session setting timeout in milliseconds
  };
  
  // API request timeouts
  api: {
    default: number; // Default API request timeout
    longRunning: number; // Long-running operations timeout
    shortRunning: number; // Short-running operations timeout
    busAssignment: number; // Bus assignment fetch timeout
    healthCheck: number; // Health check timeout
  };
  
  // WebSocket timeouts
  websocket: {
    connection: number; // Connection timeout
    authentication: number; // Authentication timeout
    heartbeat: number; // Heartbeat interval
    reconnect: number; // Reconnection timeout
  };
  
  // Retry configuration
  retry: {
    maxAttempts: number; // Maximum retry attempts
    baseDelay: number; // Base delay between retries in milliseconds
    maxDelay: number; // Maximum delay between retries in milliseconds
    backoffMultiplier: number; // Exponential backoff multiplier
  };
  
  // Session management
  session: {
    refreshBeforeExpiry: number; // Refresh session this many milliseconds before expiry
    checkInterval: number; // Interval to check session expiry in milliseconds
  };
}

/**
 * Production-grade timeout configuration
 * Optimized for reliability and user experience
 */
export const timeoutConfig: TimeoutConfig = {
  auth: {
    signIn: 10000, // 10 seconds - enough for network variability
    signOut: 5000, // 5 seconds - logout should be fast
    sessionRefresh: 8000, // 8 seconds - session refresh timeout
    tokenValidation: 8000, // 8 seconds - increased for reliability (was 5s)
    sessionSetting: 10000, // 10 seconds - session setting is critical
  },
  
  api: {
    default: 15000, // 15 seconds - default for most API calls
    longRunning: 30000, // 30 seconds - for heavy operations
    shortRunning: 5000, // 5 seconds - for quick operations
    busAssignment: 8000, // 8 seconds - bus assignment fetch
    healthCheck: 3000, // 3 seconds - health checks should be fast
  },
  
  websocket: {
    connection: 10000, // 10 seconds - WebSocket connection timeout
    authentication: 8000, // 8 seconds - WebSocket authentication timeout
    heartbeat: 30000, // 30 seconds - heartbeat interval
    reconnect: 15000, // 15 seconds - reconnection timeout
  },
  
  retry: {
    maxAttempts: 3, // Maximum 3 retry attempts
    baseDelay: 1000, // Start with 1 second delay
    maxDelay: 10000, // Maximum 10 seconds delay
    backoffMultiplier: 2, // Double the delay on each retry
  },
  
  session: {
    refreshBeforeExpiry: 5 * 60 * 1000, // Refresh 5 minutes before expiry
    checkInterval: 60 * 1000, // Check every minute
  },
};

/**
 * Calculate retry delay using exponential backoff
 * @param attempt - Current retry attempt (0-indexed)
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(attempt: number): number {
  const { baseDelay, maxDelay, backoffMultiplier } = timeoutConfig.retry;
  const delay = baseDelay * Math.pow(backoffMultiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Create a timeout promise that rejects after specified duration
 * @param ms - Timeout duration in milliseconds
 * @param message - Optional error message
 * @returns Promise that rejects after timeout
 */
export function createTimeoutPromise(
  ms: number,
  message: string = `Operation timed out after ${ms}ms`
): Promise<never> {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Execute a promise with timeout
 * @param promise - Promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Optional error message
 * @returns Promise that resolves or rejects based on timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  const timeoutPromise = createTimeoutPromise(
    timeoutMs,
    errorMessage || `Operation timed out after ${timeoutMs}ms`
  );
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of attempts
 * @param context - Context for logging (optional)
 * @returns Promise that resolves on success or rejects after max attempts
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = timeoutConfig.retry.maxAttempts,
  context?: string
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on the last attempt
      if (attempt === maxAttempts - 1) {
        throw lastError;
      }
      
      // Calculate delay before next retry
      const delay = calculateRetryDelay(attempt);
      
      if (context) {
        console.log(
          `⚠️ ${context} failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delay}ms...`,
          lastError.message
        );
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Retry failed');
}

export default timeoutConfig;

