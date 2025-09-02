// Exponential Backoff Implementation
export interface BackoffConfig {
  initialDelay: number; // Initial delay in ms
  maxDelay: number; // Maximum delay in ms
  multiplier: number; // Multiplier for each retry
  maxAttempts: number; // Maximum number of attempts
  jitter: boolean; // Whether to add random jitter
  jitterFactor: number; // Jitter factor (0-1)
}

export interface BackoffResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

class ExponentialBackoff {
  private attemptCount: number = 0;
  private startTime: number = 0;

  constructor(
    private config: BackoffConfig = {
      initialDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      multiplier: 2,
      maxAttempts: 5,
      jitter: true,
      jitterFactor: 0.1,
    }
  ) {}

  // Execute a function with exponential backoff
  async execute<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, delay: number, error: Error) => void
  ): Promise<BackoffResult<T>> {
    this.attemptCount = 0;
    this.startTime = Date.now();

    while (this.attemptCount < this.config.maxAttempts) {
      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts: this.attemptCount + 1,
          totalTime: Date.now() - this.startTime,
        };
      } catch (error) {
        this.attemptCount++;
        
        if (this.attemptCount >= this.config.maxAttempts) {
          return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            attempts: this.attemptCount,
            totalTime: Date.now() - this.startTime,
          };
        }

        const delay = this.calculateDelay();
        
        if (onRetry) {
          onRetry(this.attemptCount, delay, error instanceof Error ? error : new Error(String(error)));
        }

        console.log(`🔄 Retry attempt ${this.attemptCount}/${this.config.maxAttempts} in ${delay}ms`);
        
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: new Error('Max retry attempts exceeded'),
      attempts: this.attemptCount,
      totalTime: Date.now() - this.startTime,
    };
  }

  // Calculate delay for current attempt
  private calculateDelay(): number {
    const baseDelay = Math.min(
      this.config.initialDelay * Math.pow(this.config.multiplier, this.attemptCount - 1),
      this.config.maxDelay
    );

    if (!this.config.jitter) {
      return baseDelay;
    }

    // Add jitter to prevent thundering herd
    const jitterRange = baseDelay * this.config.jitterFactor;
    const jitter = (Math.random() - 0.5) * jitterRange;
    
    return Math.max(0, baseDelay + jitter);
  }

  // Sleep for specified duration
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Reset backoff state
  reset(): void {
    this.attemptCount = 0;
    this.startTime = 0;
  }

  // Get current attempt count
  getAttemptCount(): number {
    return this.attemptCount;
  }

  // Get remaining attempts
  getRemainingAttempts(): number {
    return Math.max(0, this.config.maxAttempts - this.attemptCount);
  }
}

// Pre-configured backoff strategies
export const quickBackoff = new ExponentialBackoff({
  initialDelay: 500,
  maxDelay: 5000,
  multiplier: 1.5,
  maxAttempts: 3,
  jitter: true,
  jitterFactor: 0.1,
});

export const standardBackoff = new ExponentialBackoff({
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  maxAttempts: 5,
  jitter: true,
  jitterFactor: 0.15,
});

export const aggressiveBackoff = new ExponentialBackoff({
  initialDelay: 2000,
  maxDelay: 60000,
  multiplier: 2.5,
  maxAttempts: 7,
  jitter: true,
  jitterFactor: 0.2,
});

export const websocketBackoff = new ExponentialBackoff({
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  maxAttempts: 10,
  jitter: true,
  jitterFactor: 0.1,
});

export default ExponentialBackoff;
