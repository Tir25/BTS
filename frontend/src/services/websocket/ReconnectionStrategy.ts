// Enhanced WebSocket Reconnection Strategy

export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  resetDelayAfter: number;
  healthCheckInterval: number;
  connectionTimeout: number;
}

export interface ReconnectionState {
  attempts: number;
  lastAttempt: number;
  nextAttempt: number;
  isReconnecting: boolean;
  lastSuccessfulConnection: number;
  consecutiveFailures: number;
  backoffDelay: number;
}

export type ReconnectionEvent = 
  | 'attempting'
  | 'failed'
  | 'succeeded'
  | 'abandoned'
  | 'health-check-failed'
  | 'health-check-passed';

export interface ReconnectionEventHandler {
  (event: ReconnectionEvent, state: ReconnectionState): void;
}

class ReconnectionStrategy {
  private config: ReconnectionConfig;
  private state: ReconnectionState;
  private eventHandlers: ReconnectionEventHandler[] = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;
  private isDestroyed: boolean = false;

  constructor(config: Partial<ReconnectionConfig> = {}) {
    this.config = {
      maxAttempts: 10,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 1.5,
      jitter: true,
      resetDelayAfter: 60000, // 1 minute
      healthCheckInterval: 30000, // 30 seconds
      connectionTimeout: 10000, // 10 seconds
      ...config,
    };

    this.state = {
      attempts: 0,
      lastAttempt: 0,
      nextAttempt: 0,
      isReconnecting: false,
      lastSuccessfulConnection: 0,
      consecutiveFailures: 0,
      backoffDelay: this.config.baseDelay,
    };
  }

  // Add event handler
  addEventHandler(handler: ReconnectionEventHandler): void {
    this.eventHandlers.push(handler);
  }

  // Remove event handler
  removeEventHandler(handler: ReconnectionEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index !== -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  // Emit event to all handlers
  private emitEvent(event: ReconnectionEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event, { ...this.state });
      } catch (error) {
        console.error('❌ Reconnection event handler error:', error);
      }
    });
  }

  // Start reconnection process
  async startReconnection(connectFunction: () => Promise<void>): Promise<boolean> {
    if (this.isDestroyed) {
      return false;
    }

    this.state.isReconnecting = true;
    this.state.attempts = 0;

    while (this.state.attempts < this.config.maxAttempts && !this.isDestroyed) {
      try {
        this.state.attempts++;
        this.state.lastAttempt = Date.now();
        
        this.emitEvent('attempting');

        // Set connection timeout
        const connectionPromise = connectFunction();
        const timeoutPromise = new Promise<never>((_, reject) => {
          this.connectionTimer = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, this.config.connectionTimeout);
        });

        await Promise.race([connectionPromise, timeoutPromise]);

        // Clear timeout
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer);
          this.connectionTimer = null;
        }

        // Connection successful
        this.state.isReconnecting = false;
        this.state.lastSuccessfulConnection = Date.now();
        this.state.consecutiveFailures = 0;
        this.state.backoffDelay = this.config.baseDelay;
        
        this.emitEvent('succeeded');
        this.startHealthCheck(connectFunction);
        
        return true;

      } catch (error) {
        console.error(`❌ Reconnection attempt ${this.state.attempts} failed:`, error);
        
        this.state.consecutiveFailures++;
        this.emitEvent('failed');

        // Clear timeout
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer);
          this.connectionTimer = null;
        }

        // Check if we should abandon reconnection
        if (this.shouldAbandonReconnection()) {
          this.state.isReconnecting = false;
          this.emitEvent('abandoned');
          return false;
        }

        // Calculate next attempt delay
        const delay = this.calculateNextDelay();
        this.state.nextAttempt = Date.now() + delay;

        // Wait before next attempt
        await this.wait(delay);
      }
    }

    // Max attempts reached
    this.state.isReconnecting = false;
    this.emitEvent('abandoned');
    return false;
  }

  // Calculate next delay with exponential backoff and jitter
  private calculateNextDelay(): number {
    // Reset delay if enough time has passed since last successful connection
    if (Date.now() - this.state.lastSuccessfulConnection > this.config.resetDelayAfter) {
      this.state.backoffDelay = this.config.baseDelay;
    }

    // Apply exponential backoff
    this.state.backoffDelay = Math.min(
      this.state.backoffDelay * this.config.backoffMultiplier,
      this.config.maxDelay
    );

    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      const jitterAmount = this.state.backoffDelay * 0.1; // 10% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
      return Math.max(0, this.state.backoffDelay + jitter);
    }

    return this.state.backoffDelay;
  }

  // Check if we should abandon reconnection
  private shouldAbandonReconnection(): boolean {
    // Abandon if too many consecutive failures
    if (this.state.consecutiveFailures >= this.config.maxAttempts) {
      return true;
    }

    // Abandon if we've been trying for too long
    const timeSinceFirstAttempt = Date.now() - this.state.lastAttempt;
    if (timeSinceFirstAttempt > this.config.maxDelay * 10) {
      return true;
    }

    return false;
  }

  // Wait for specified delay
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  // Start health check
  private startHealthCheck(connectFunction: () => Promise<void>): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        // Perform health check (simplified - just try to connect)
        await connectFunction();
        this.emitEvent('health-check-passed');
      } catch (error) {
        console.warn('⚠️ Health check failed:', error);
        this.emitEvent('health-check-failed');
        
        // Start reconnection if health check fails
        if (!this.state.isReconnecting) {
          this.startReconnection(connectFunction);
        }
      }
    }, this.config.healthCheckInterval);
  }

  // Stop health check
  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  // Reset reconnection state
  reset(): void {
    this.state = {
      attempts: 0,
      lastAttempt: 0,
      nextAttempt: 0,
      isReconnecting: false,
      lastSuccessfulConnection: 0,
      consecutiveFailures: 0,
      backoffDelay: this.config.baseDelay,
    };

    this.stopHealthCheck();
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  // Get current state
  getState(): ReconnectionState {
    return { ...this.state };
  }

  // Get next attempt time
  getNextAttemptTime(): number {
    return this.state.nextAttempt;
  }

  // Check if reconnecting
  isReconnecting(): boolean {
    return this.state.isReconnecting;
  }

  // Get connection quality score (0-1)
  getConnectionQuality(): number {
    const timeSinceLastSuccess = Date.now() - this.state.lastSuccessfulConnection;
    const failureRate = this.state.consecutiveFailures / this.config.maxAttempts;
    const timeScore = Math.max(0, 1 - (timeSinceLastSuccess / (this.config.resetDelayAfter * 2)));
    const failureScore = Math.max(0, 1 - failureRate);
    
    return (timeScore + failureScore) / 2;
  }

  // Update configuration
  updateConfig(newConfig: Partial<ReconnectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Destroy strategy
  destroy(): void {
    this.isDestroyed = true;
    this.stopHealthCheck();
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    this.eventHandlers = [];
    this.reset();
  }
}

export const reconnectionStrategy = new ReconnectionStrategy();

