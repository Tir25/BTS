/**
 * Circuit Breaker Middleware
 * Implements the Circuit Breaker pattern for fault tolerance
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

class CircuitBreaker {
  private breakers: Map<string, CircuitBreakerState> = new Map();
  private readonly failureThreshold: number;
  private readonly timeout: number;
  private readonly retryTimeout: number;
  private readonly successThreshold: number;

  constructor(
    failureThreshold: number = 5,
    timeout: number = 60000,
    retryTimeout: number = 30000,
    successThreshold: number = 3
  ) {
    this.failureThreshold = failureThreshold;
    this.timeout = timeout;
    this.retryTimeout = retryTimeout;
    this.successThreshold = successThreshold;
  }

  private getBreakerState(serviceName: string): CircuitBreakerState {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
      });
    }
    return this.breakers.get(serviceName)!;
  }

  private updateBreakerState(serviceName: string, state: CircuitBreakerState): void {
    this.breakers.set(serviceName, state);
  }

  private canExecute(serviceName: string): boolean {
    const state = this.getBreakerState(serviceName);
    const now = Date.now();

    switch (state.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        if (now - state.lastFailureTime > this.retryTimeout) {
          // Transition to HALF_OPEN
          this.updateBreakerState(serviceName, {
            ...state,
            state: 'HALF_OPEN',
            successCount: 0,
          });
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        return true;
      
      default:
        return false;
    }
  }

  private onSuccess(serviceName: string): void {
    const state = this.getBreakerState(serviceName);
    
    if (state.state === 'HALF_OPEN') {
      const newSuccessCount = state.successCount + 1;
      if (newSuccessCount >= this.successThreshold) {
        // Transition to CLOSED
        this.updateBreakerState(serviceName, {
          state: 'CLOSED',
          failureCount: 0,
          lastFailureTime: 0,
          successCount: 0,
        });
        logger.info(`Circuit breaker for ${serviceName} closed after successful recovery`, 'circuitBreaker');
      } else {
        this.updateBreakerState(serviceName, {
          ...state,
          successCount: newSuccessCount,
        });
      }
    } else {
      // Reset failure count on success
      this.updateBreakerState(serviceName, {
        ...state,
        failureCount: 0,
      });
    }
  }

  private onFailure(serviceName: string): void {
    const state = this.getBreakerState(serviceName);
    const now = Date.now();
    const newFailureCount = state.failureCount + 1;

    if (newFailureCount >= this.failureThreshold) {
      // Transition to OPEN
      this.updateBreakerState(serviceName, {
        state: 'OPEN',
        failureCount: newFailureCount,
        lastFailureTime: now,
        successCount: 0,
      });
      logger.warn(`Circuit breaker for ${serviceName} opened due to ${newFailureCount} failures`, 'circuitBreaker');
    } else {
      this.updateBreakerState(serviceName, {
        ...state,
        failureCount: newFailureCount,
        lastFailureTime: now,
      });
    }
  }

  public async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (!this.canExecute(serviceName)) {
      const state = this.getBreakerState(serviceName);
      logger.warn(`Circuit breaker for ${serviceName} is ${state.state}, executing fallback`, 'circuitBreaker');
      
      if (fallback) {
        return fallback();
      }
      
      throw new Error(`Circuit breaker for ${serviceName} is ${state.state}`);
    }

    try {
      const result = await operation();
      this.onSuccess(serviceName);
      return result;
    } catch (error) {
      this.onFailure(serviceName);
      
      if (fallback) {
        logger.warn(`Operation failed for ${serviceName}, executing fallback`, 'circuitBreaker', { 
          error: (error as Error).message 
        });
        return fallback();
      }
      
      throw error;
    }
  }

  public getState(serviceName: string): CircuitBreakerState {
    return this.getBreakerState(serviceName);
  }

  public reset(serviceName: string): void {
    this.updateBreakerState(serviceName, {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
    });
    logger.info(`Circuit breaker for ${serviceName} reset`, 'circuitBreaker');
  }
}

// Global circuit breaker instance
export const circuitBreaker = new CircuitBreaker();

// Middleware for Express
export const circuitBreakerMiddleware = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const state = circuitBreaker.getState(serviceName);
    
    if (state.state === 'OPEN') {
      const now = Date.now();
      if (now - state.lastFailureTime > circuitBreaker['retryTimeout']) {
        // Allow request to proceed (transition to HALF_OPEN)
        next();
      } else {
        res.status(503).json({
          success: false,
          error: 'Service temporarily unavailable',
          message: 'Circuit breaker is open. Please try again later.',
          code: 'CIRCUIT_BREAKER_OPEN',
          retryAfter: Math.ceil((state.lastFailureTime + circuitBreaker['retryTimeout'] - now) / 1000),
        });
      }
    } else {
      next();
    }
  };
};

// Circuit breaker for external service calls
export const withCircuitBreaker = <T>(
  serviceName: string,
  operation: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> => {
  return circuitBreaker.execute(serviceName, operation, fallback);
};

export default circuitBreaker;
