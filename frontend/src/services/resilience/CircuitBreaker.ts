import { logger } from '../../utils/logger';

// Circuit Breaker Pattern Implementation
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time in ms to wait before attempting recovery
  expectedErrors: string[]; // Error patterns that should not count as failures
  monitorInterval: number; // Interval to check circuit state
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  currentState: CircuitState;
  failureCount: number;
}

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private nextAttemptTime?: number;
  private totalRequests: number = 0;
  private successfulRequests: number = 0;
  private failedRequests: number = 0;
  private monitorTimer?: NodeJS.Timeout;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      expectedErrors: [],
      monitorInterval: 30000, // 30 seconds
    }
  ) {
    this.startMonitoring();
  }

  // Execute a function with circuit breaker protection
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        logger.warn('🚨 Circuit breaker is OPEN, using fallback', 'component', { data: this.name });
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);

      // If we have a fallback, use it
      if (fallback) {
        logger.debug('Debug info', 'component', { data: `🔄 Using fallback for '${this.name}' due to error:`, error });
        return fallback();
      }

      throw error;
    }
  }

  private onSuccess(): void {
    this.successfulRequests++;
    this.lastSuccessTime = Date.now();
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.transitionToClosed();
    }
  }

  private onFailure(error: any): void {
    this.failedRequests++;
    this.lastFailureTime = Date.now();

    // Check if this is an expected error
    const errorMessage = error?.message || error?.toString() || '';
    const isExpectedError = this.config.expectedErrors.some((pattern) =>
      errorMessage.includes(pattern)
    );

    if (!isExpectedError) {
      this.failureCount++;

      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  private transitionToOpen(): void {
    if (this.state !== 'OPEN') {
      logger.warn('🚨 Circuit breaker transitioning to OPEN', 'component', { data: this.name });
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    }
  }

  private transitionToHalfOpen(): void {
    logger.info('🔄 Circuit breaker transitioning to HALF_OPEN', 'component', { data: this.name });
    this.state = 'HALF_OPEN';
  }

  private transitionToClosed(): void {
    logger.info('✅ Circuit breaker transitioning to CLOSED', 'component', { data: this.name });
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttemptTime = undefined;
  }

  private shouldAttemptReset(): boolean {
    return (
      this.nextAttemptTime !== undefined && Date.now() >= this.nextAttemptTime
    );
  }

  private startMonitoring(): void {
    this.monitorTimer = setInterval(() => {
      this.logMetrics();
    }, this.config.monitorInterval);
  }

  private logMetrics(): void {
    const metrics = this.getMetrics();
    logger.debug('Debug info', 'component', { 
      data: `📊 Circuit Breaker '${this.name}' Metrics:`,
      metrics: {
        state: metrics.currentState,
        successRate: metrics.totalRequests > 0
            ? (
                (metrics.successfulRequests / metrics.totalRequests) *
                100
              ).toFixed(2) + '%'
            : '0%',
        failureCount: metrics.failureCount,
        totalRequests: metrics.totalRequests
      }
    });
  }

  // Get current circuit metrics
  getMetrics(): CircuitMetrics {
    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      currentState: this.state,
      failureCount: this.failureCount,
    };
  }

  // Reset circuit to closed state
  reset(): void {
    logger.info('🔄 Resetting circuit breaker', 'component', { data: this.name });
    this.transitionToClosed();
  }

  // Clean up resources
  destroy(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
    }
  }
}

// Circuit Breaker Registry
class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  create(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (this.breakers.has(name)) {
      return this.breakers.get(name)!;
    }

    const breaker = new CircuitBreaker(name, config);
    this.breakers.set(name, breaker);
    return breaker;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  reset(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }

  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
  }

  destroy(): void {
    this.breakers.forEach((breaker) => breaker.destroy());
    this.breakers.clear();
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Pre-configured circuit breakers
export const apiCircuitBreaker = circuitBreakerRegistry.create('api', {
  failureThreshold: 3,
  recoveryTimeout: 30000, // 30 seconds
  expectedErrors: ['401', '403', '404'], // Don't count auth/not found as failures
  monitorInterval: 15000, // 15 seconds
});

export const websocketCircuitBreaker = circuitBreakerRegistry.create(
  'websocket',
  {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    expectedErrors: [],
    monitorInterval: 30000, // 30 seconds
  }
);

export const supabaseCircuitBreaker = circuitBreakerRegistry.create(
  'supabase',
  {
    failureThreshold: 3,
    recoveryTimeout: 45000, // 45 seconds
    expectedErrors: ['401', '403'],
    monitorInterval: 20000, // 20 seconds
  }
);

export default CircuitBreaker;
