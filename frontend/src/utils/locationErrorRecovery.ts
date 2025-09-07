import { errorHandler } from './errorHandler';

export interface LocationError {
  type: 'gps' | 'network' | 'permission' | 'timeout' | 'invalid_data' | 'websocket';
  message: string;
  timestamp: number;
  retryable: boolean;
  context?: Record<string, unknown>;
}

export interface LocationRecoveryOptions {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  fallbackToStatic: boolean;
  notifyUser: boolean;
}

export class LocationErrorRecovery {
  private retryCount = 0;
  private lastErrorTime = 0;
  private isRecovering = false;
  private recoveryCallbacks: Array<(error: LocationError) => void> = [];
  private successCallbacks: Array<() => void> = [];

  constructor(
    private options: LocationRecoveryOptions = {
      maxRetries: 5,
      retryDelay: 2000,
      exponentialBackoff: true,
      fallbackToStatic: true,
      notifyUser: true,
    }
  ) {}

  // Handle location-related errors
  handleLocationError(error: LocationError): Promise<boolean> {
    return new Promise((resolve) => {
      this.logLocationError(error);
      
      // Notify callbacks
      this.recoveryCallbacks.forEach(callback => callback(error));

      if (!error.retryable || this.retryCount >= this.options.maxRetries) {
        this.handleNonRetryableError(error);
        resolve(false);
        return;
      }

      this.scheduleRetry(error).then(success => {
        if (success) {
          this.onRecoverySuccess();
        }
        resolve(success);
      });
    });
  }

  // Schedule retry with exponential backoff
  private async scheduleRetry(error: LocationError): Promise<boolean> {
    if (this.isRecovering) {
      return false;
    }

    this.isRecovering = true;
    this.retryCount++;
    this.lastErrorTime = Date.now();

    const delay = this.calculateRetryDelay();
    
    console.log(`🔄 Scheduling location error recovery (attempt ${this.retryCount}/${this.options.maxRetries}) in ${delay}ms`);

    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const success = await this.attemptRecovery(error);
          this.isRecovering = false;
          resolve(success);
        } catch (recoveryError) {
          console.error('❌ Recovery attempt failed:', recoveryError);
          this.isRecovering = false;
          resolve(false);
        }
      }, delay);
    });
  }

  // Attempt to recover from the error
  private async attemptRecovery(error: LocationError): Promise<boolean> {
    try {
      switch (error.type) {
        case 'gps':
          return await this.recoverGPSError();
        case 'network':
          return await this.recoverNetworkError();
        case 'permission':
          return await this.recoverPermissionError();
        case 'timeout':
          return await this.recoverTimeoutError();
        case 'invalid_data':
          return await this.recoverInvalidDataError();
        case 'websocket':
          return await this.recoverWebSocketError();
        default:
          return false;
      }
    } catch (recoveryError) {
      console.error('❌ Recovery attempt failed:', recoveryError);
      return false;
    }
  }

  // GPS-specific recovery
  private async recoverGPSError(): Promise<boolean> {
    console.log('🛰️ Attempting GPS error recovery...');
    
    // Check if geolocation is available
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      return false;
    }

    // Try to get current position with timeout
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        console.error('❌ GPS recovery timeout');
        resolve(false);
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        () => {
          clearTimeout(timeoutId);
          console.log('✅ GPS recovery successful');
          resolve(true);
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error('❌ GPS recovery failed:', error);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }

  // Network-specific recovery
  private async recoverNetworkError(): Promise<boolean> {
    console.log('🌐 Attempting network error recovery...');
    
    try {
      // Test network connectivity
      const response = await fetch('/api/health', {
        method: 'GET',
        timeout: 5000,
      } as RequestInit);
      
      if (response.ok) {
        console.log('✅ Network recovery successful');
        return true;
      }
      
      console.error('❌ Network recovery failed: HTTP', response.status);
      return false;
    } catch (error) {
      console.error('❌ Network recovery failed:', error);
      return false;
    }
  }

  // Permission-specific recovery
  private async recoverPermissionError(): Promise<boolean> {
    console.log('🔐 Attempting permission error recovery...');
    
    // Check if permissions API is available
    if (!navigator.permissions) {
      console.log('⚠️ Permissions API not available');
      return false;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      
      if (permission.state === 'granted') {
        console.log('✅ Permission recovery successful');
        return true;
      }
      
      console.log('⚠️ Permission still not granted:', permission.state);
      return false;
    } catch (error) {
      console.error('❌ Permission recovery failed:', error);
      return false;
    }
  }

  // Timeout-specific recovery
  private async recoverTimeoutError(): Promise<boolean> {
    console.log('⏱️ Attempting timeout error recovery...');
    
    // Try with shorter timeout and less accuracy
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        console.error('❌ Timeout recovery failed');
        resolve(false);
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        () => {
          clearTimeout(timeoutId);
          console.log('✅ Timeout recovery successful');
          resolve(true);
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error('❌ Timeout recovery failed:', error);
          resolve(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000,
        }
      );
    });
  }

  // Invalid data recovery
  private async recoverInvalidDataError(): Promise<boolean> {
    console.log('📊 Attempting invalid data recovery...');
    
    // Clear any cached location data
    try {
      localStorage.removeItem('lastKnownLocation');
      sessionStorage.removeItem('cachedLocation');
      console.log('✅ Invalid data recovery successful (cache cleared)');
      return true;
    } catch (error) {
      console.error('❌ Invalid data recovery failed:', error);
      return false;
    }
  }

  // WebSocket-specific recovery
  private async recoverWebSocketError(): Promise<boolean> {
    console.log('🔌 Attempting WebSocket error recovery...');
    
    // This would typically involve reconnecting to WebSocket
    // For now, we'll just return true as the WebSocket service handles its own reconnection
    return true;
  }

  // Handle non-retryable errors
  private handleNonRetryableError(error: LocationError): void {
    console.error('❌ Non-retryable location error:', error);
    
    if (this.options.fallbackToStatic) {
      this.enableStaticMode();
    }

    if (this.options.notifyUser) {
      this.notifyUserOfError(error);
    }
  }

  // Enable static mode (fallback)
  private enableStaticMode(): void {
    console.log('📱 Enabling static mode as fallback');
    // This would typically involve switching to static map data
    // or cached location information
  }

  // Notify user of error
  private notifyUserOfError(error: LocationError): void {
    const errorMessage = this.getUserFriendlyErrorMessage(error);
    
    // You could integrate with a notification system here
    console.warn('⚠️ User notification:', errorMessage);
  }

  // Get user-friendly error message
  private getUserFriendlyErrorMessage(error: LocationError): string {
    switch (error.type) {
      case 'gps':
        return 'Unable to access your location. Please check your device settings.';
      case 'network':
        return 'Network connection issue. Please check your internet connection.';
      case 'permission':
        return 'Location permission denied. Please enable location access in your browser.';
      case 'timeout':
        return 'Location request timed out. Please try again.';
      case 'invalid_data':
        return 'Invalid location data received. Please refresh the page.';
      case 'websocket':
        return 'Real-time connection lost. Some features may be limited.';
      default:
        return 'An unexpected error occurred with location services.';
    }
  }

  // Calculate retry delay with exponential backoff
  private calculateRetryDelay(): number {
    if (!this.options.exponentialBackoff) {
      return this.options.retryDelay;
    }

    const baseDelay = this.options.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, this.retryCount - 1);
    const maxDelay = 30000; // 30 seconds max

    return Math.min(exponentialDelay, maxDelay);
  }

  // Log location error
  private logLocationError(error: LocationError): void {
    errorHandler.logError(new Error(error.message), {
      service: 'map',
      operation: `location_${error.type}_error`,
    }, 'medium');
  }

  // On recovery success
  private onRecoverySuccess(): void {
    console.log('✅ Location error recovery successful');
    this.retryCount = 0;
    this.lastErrorTime = 0;
    
    // Notify success callbacks
    this.successCallbacks.forEach(callback => callback());
  }

  // Add recovery callback
  onRecovery(callback: (error: LocationError) => void): void {
    this.recoveryCallbacks.push(callback);
  }

  // Add success callback
  onSuccess(callback: () => void): void {
    this.successCallbacks.push(callback);
  }

  // Reset retry count
  reset(): void {
    this.retryCount = 0;
    this.lastErrorTime = 0;
    this.isRecovering = false;
  }

  // Get current status
  getStatus(): {
    retryCount: number;
    isRecovering: boolean;
    lastErrorTime: number;
  } {
    return {
      retryCount: this.retryCount,
      isRecovering: this.isRecovering,
      lastErrorTime: this.lastErrorTime,
    };
  }
}

// Export singleton instance
export const locationErrorRecovery = new LocationErrorRecovery();
