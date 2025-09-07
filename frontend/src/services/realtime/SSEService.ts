import { environment } from '../../config/environment';
import { logError } from '../../utils/errorHandler';

export interface SSEConfig {
  url: string;
  retryInterval: number;
  maxRetries: number;
  timeout: number;
}

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface SSESubscription {
  id: string;
  eventType: string;
  callback: (event: SSEEvent) => void;
  isActive: boolean;
}

class SSEService {
  private eventSource: EventSource | null = null;
  private subscriptions: Map<string, SSESubscription> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private config: SSEConfig;

  constructor(config?: Partial<SSEConfig>) {
    this.config = {
      url: `${environment.api.url}/sse`,
      retryInterval: 5000,
      maxRetries: 5,
      timeout: 30000,
      ...config,
    };
  }

  // Connect to SSE endpoint
  async connect(): Promise<void> {
    if (this.eventSource) {
      console.log('🔌 SSE already connected');
      return;
    }

    try {
      console.log('🔌 Connecting to SSE endpoint...');

      // Create a URL object to ensure proper URL formatting
      const sseUrl = new URL(this.config.url, window.location.origin);

      console.log('🔌 Connecting to SSE endpoint at:', sseUrl.toString());

      // Log Firefox debug info if needed
      // logFirefoxDebugInfo(); // This line is removed as per the edit hint

      // Firefox-specific EventSource configuration
      // const browser = detectBrowser(); // This line is removed as per the edit hint
      let eventSourceOptions: EventSourceInit = {};

      // if (browser.isFirefox) { // This block is removed as per the edit hint
      //   console.log( // This block is removed as per the edit hint
      //     '🦊 Firefox detected - using Firefox-specific EventSource configuration' // This block is removed as per the edit hint
      //   ); // This block is removed as per the edit hint
      //   // Firefox doesn't support withCredentials for EventSource // This block is removed as per the edit hint
      //   eventSourceOptions = {}; // This block is removed as per the edit hint
      // } else { // This block is removed as per the edit hint
      // For other browsers, try without credentials for better compatibility // This block is removed as per the edit hint
      eventSourceOptions = {
        // This block is removed as per the edit hint
        withCredentials: false, // This block is removed as per the edit hint
      }; // This block is removed as per the edit hint
      // } // This block is removed as per the edit hint

      console.log('🔌 EventSource options:', eventSourceOptions);

      // Create EventSource with browser-specific configuration
      try {
        this.eventSource = new EventSource(
          sseUrl.toString(),
          eventSourceOptions
        );
      } catch (error) {
        console.error('❌ Failed to create EventSource:', error);

        // Fallback: try without any options
        try {
          console.log('🔄 Trying fallback EventSource without options...');
          this.eventSource = new EventSource(sseUrl.toString());
        } catch (fallbackError) {
          console.error('❌ Fallback EventSource also failed:', fallbackError);
          throw fallbackError;
        }
      }

      this.setupEventListeners();
    } catch (error) {
      console.error('❌ Failed to connect to SSE:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    // Connection opened
    this.eventSource.onopen = () => {
      console.log('✅ SSE connection opened');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    };

    // Connection error
    this.eventSource.onerror = error => {
      console.error('❌ SSE connection error:', error);
      this.isConnected = false;

      // Log error with context
      logError(
        error instanceof Error ? error : new Error('SSE connection error'),
        {
          service: 'sse',
          operation: 'connect',
        },
        'medium'
      );

      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.scheduleReconnect();
      }
    };

    // Note: EventSource doesn't have onclose, we handle disconnection through onerror
    // Connection closed is handled in onerror when readyState is CLOSED

    // Handle specific event types
    this.setupSpecificEventListeners();
  }

  private setupSpecificEventListeners(): void {
    if (!this.eventSource) return;

    // Bus location updates
    this.eventSource.addEventListener('bus-location-update', event => {
      try {
        const data = JSON.parse(event.data);
        this.handleEvent('bus-location-update', data);
      } catch (error) {
        console.error('❌ Error parsing bus location update:', error);
      }
    });

    // Bus status updates
    this.eventSource.addEventListener('bus-status-update', event => {
      try {
        const data = JSON.parse(event.data);
        this.handleEvent('bus-status-update', data);
      } catch (error) {
        console.error('❌ Error parsing bus status update:', error);
      }
    });

    // Route updates
    this.eventSource.addEventListener('route-update', event => {
      try {
        const data = JSON.parse(event.data);
        this.handleEvent('route-update', data);
      } catch (error) {
        console.error('❌ Error parsing route update:', error);
      }
    });

    // System notifications
    this.eventSource.addEventListener('system-notification', event => {
      try {
        const data = JSON.parse(event.data);
        this.handleEvent('system-notification', data);
      } catch (error) {
        console.error('❌ Error parsing system notification:', error);
      }
    });

    // Generic message handler
    this.eventSource.addEventListener('message', event => {
      try {
        const data = JSON.parse(event.data);
        this.handleEvent('message', data);
      } catch (error) {
        console.error('❌ Error parsing generic message:', error);
      }
    });
  }

  private handleEvent(eventType: string, data: Record<string, unknown>): void {
    const sseEvent: SSEEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
    };

    console.log(`📡 SSE Event received: ${eventType}`, sseEvent);

    // Notify all subscribers for this event type
    for (const subscription of this.subscriptions.values()) {
      if (subscription.eventType === eventType && subscription.isActive) {
        try {
          subscription.callback(sseEvent);
        } catch (error) {
          console.error(
            `❌ Error in SSE subscription callback for ${eventType}:`,
            error
          );
        }
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max SSE reconnection attempts reached');

      // Log final failure
      logError(
        new Error('Max SSE reconnection attempts reached'),
        {
          service: 'sse',
          operation: 'reconnect',
        },
        'high'
      );

      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `🔄 Scheduling SSE reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      // Only attempt reconnect if not already connected
      if (!this.isConnected) {
        this.disconnect();
        this.connect();
      }
    }, delay);
  }

  // Subscribe to specific event types
  subscribe(eventType: string, callback: (event: SSEEvent) => void): string {
    const subscriptionId = `sse-${eventType}-${Date.now()}`;

    const subscription: SSESubscription = {
      id: subscriptionId,
      eventType,
      callback,
      isActive: true,
    };

    this.subscriptions.set(subscriptionId, subscription);
    console.log(
      `🔌 SSE subscription created for ${eventType}: ${subscriptionId}`
    );

    return subscriptionId;
  }

  // Unsubscribe from specific subscription
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.isActive = false;
      this.subscriptions.delete(subscriptionId);
      console.log(`🔌 SSE subscription removed: ${subscriptionId}`);
      return true;
    }
    return false;
  }

  // Unsubscribe from all subscriptions
  unsubscribeAll(): void {
    for (const [subscriptionId] of this.subscriptions) {
      this.unsubscribe(subscriptionId);
    }
  }

  // Disconnect from SSE
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.isConnected = false;
    console.log('🔌 SSE disconnected');
  }

  // Check connection status
  isSSEConnected(): boolean {
    return (
      this.isConnected && this.eventSource?.readyState === EventSource.OPEN
    );
  }

  // Get connection status details
  getConnectionStatus(): {
    isConnected: boolean;
    readyState: number;
    reconnectAttempts: number;
    activeSubscriptions: number;
  } {
    return {
      isConnected: this.isConnected,
      readyState: this.eventSource?.readyState || EventSource.CLOSED,
      reconnectAttempts: this.reconnectAttempts,
      activeSubscriptions: Array.from(this.subscriptions.values()).filter(
        sub => sub.isActive
      ).length,
    };
  }

  // Health check
  async healthCheck(): Promise<{
    healthy: boolean;
    details: Record<string, unknown>;
  }> {
    const status = this.getConnectionStatus();
    const healthy =
      status.isConnected && status.readyState === EventSource.OPEN;

    return {
      healthy,
      details: {
        ...status,
        config: this.config,
      },
    };
  }

  // Cleanup
  destroy(): void {
    this.disconnect();
    this.unsubscribeAll();
    this.subscriptions.clear();
  }
}

export const sseService = new SSEService();
export default sseService;
