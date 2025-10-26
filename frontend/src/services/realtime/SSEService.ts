import { environment } from '../../config/environment';
import { logError } from '../../utils/errorHandler';
import { logger } from '../../utils/logger';
import { safeJsonParse } from '../../utils/jsonUtils';

import {
  detectBrowser,
  logFirefoxDebugInfo,
} from '../../utils/firefoxCompatibility';

export interface SSEConfig {
  url: string;
  retryInterval: number;
  maxRetries: number;
  timeout: number;
}

export interface SSEEvent {
  type: string;
  data: any;
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
      url: `${environment.api.baseUrl}/sse`,
      retryInterval: 5000,
      maxRetries: 5,
      timeout: 30000,
      ...config,
    };
  }

  // Connect to SSE endpoint
  async connect(): Promise<void> {
    if (this.eventSource) {
      logger.info('🔌 SSE already connected', 'component');
      return;
    }

    try {
      logger.info('🔌 Connecting to SSE endpoint...', 'component');

      // Create a URL object to ensure proper URL formatting
      const sseUrl = new URL(this.config.url, window.location.origin);

      logger.debug('Debug info', 'component', { data: `🔌 Connecting to SSE endpoint at: ${sseUrl.toString()}` });

      // Log Firefox debug info if needed
      logFirefoxDebugInfo();

      // Firefox-specific EventSource configuration
      const browser = detectBrowser();
      let eventSourceOptions: EventSourceInit = {};

      if (browser.isFirefox) {
        logger.info('🦊 Firefox detected - using Firefox-specific EventSource configuration', 'component');
        // Firefox doesn't support withCredentials for EventSource
        eventSourceOptions = {};
      } else {
        // For other browsers, try without credentials for better compatibility
        eventSourceOptions = {
          withCredentials: false,
        };
      }

      logger.debug('Debug info', 'component', { data: '🔌 EventSource options:', eventSourceOptions });

      // Create EventSource with browser-specific configuration
      try {
        this.eventSource = new EventSource(
          sseUrl.toString(),
          eventSourceOptions
        );
      } catch (error) {
        logger.error('Error occurred', 'component', { error });

        // Fallback: try without any options
        try {
          logger.info('🔄 Trying fallback EventSource without options...', 'component');
          this.eventSource = new EventSource(sseUrl.toString());
        } catch (fallbackError) {
          logger.error('Error occurred', 'component', { error: '❌ Fallback EventSource also failed:', fallbackError });
          throw fallbackError;
        }
      }

      this.setupEventListeners();
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      this.scheduleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    // Connection opened
    this.eventSource.onopen = () => {
      logger.info('✅ SSE connection opened', 'component');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    };

    // Connection error
    this.eventSource.onerror = (error) => {
      logger.error('Error occurred', 'component', { error });
      this.isConnected = false;

      // Log error with context
      logError(
        error,
        'SSE connection error'
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
    this.eventSource.addEventListener('bus-location-update', (event) => {
      const parseResult = safeJsonParse(event.data, null, 'bus-location-update');
      if (parseResult.success && parseResult.data) {
        this.handleEvent('bus-location-update', parseResult.data);
      } else {
        logger.warn('Failed to parse SSE data for bus-location-update', 'sse-service', {
          error: parseResult.error,
          data: event.data?.substring(0, 100)
        });
      }
    });

    // Bus status updates
    this.eventSource.addEventListener('bus-status-update', (event) => {
      const parseResult = safeJsonParse(event.data, null, 'bus-status-update');
      if (parseResult.success && parseResult.data) {
        this.handleEvent('bus-status-update', parseResult.data);
      } else {
        logger.warn('Failed to parse SSE data for bus-status-update', 'sse-service', {
          error: parseResult.error,
          data: event.data?.substring(0, 100)
        });
      }
    });

    // Route updates
    this.eventSource.addEventListener('route-update', (event) => {
      const parseResult = safeJsonParse(event.data, null, 'route-update');
      if (parseResult.success && parseResult.data) {
        this.handleEvent('route-update', parseResult.data);
      } else {
        logger.warn('Failed to parse SSE data for route-update', 'sse-service', {
          error: parseResult.error,
          data: event.data?.substring(0, 100)
        });
      }
    });

    // System notifications
    this.eventSource.addEventListener('system-notification', (event) => {
      const parseResult = safeJsonParse(event.data, null, 'system-notification');
      if (parseResult.success && parseResult.data) {
        this.handleEvent('system-notification', parseResult.data);
      } else {
        logger.warn('Failed to parse SSE data for system-notification', 'sse-service', {
          error: parseResult.error,
          data: event.data?.substring(0, 100)
        });
      }
    });

    // Generic message handler
    this.eventSource.addEventListener('message', (event) => {
      const parseResult = safeJsonParse(event.data, null, 'message');
      if (parseResult.success && parseResult.data) {
        this.handleEvent('message', parseResult.data);
      } else {
        logger.warn('Failed to parse SSE data for message', 'sse-service', {
          error: parseResult.error,
          data: event.data?.substring(0, 100)
        });
      }
    });
  }

  private handleEvent(eventType: string, data: any): void {
    const sseEvent: SSEEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
    };

    logger.debug('Debug info', 'component', { data: `📡 SSE Event received: ${eventType}`, sseEvent });

    // Notify all subscribers for this event type
    for (const subscription of this.subscriptions.values()) {
      if (subscription.eventType === eventType && subscription.isActive) {
        try {
          subscription.callback(sseEvent);
        } catch (error) {
          logger.error(`❌ Error in SSE subscription callback for ${eventType}:`, 'component', { error });
        }
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('❌ Max SSE reconnection attempts reached', 'component');

      // Log final failure
      logError(
        new Error('Max SSE reconnection attempts reached'),
        'Max SSE reconnection attempts reached'
      );

      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.debug('Debug info', 'component', { data: `🔄 Scheduling SSE reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})` });

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
    logger.info('🔌 SSE subscription created', 'component', { data: `${eventType}: ${subscriptionId}` });

    return subscriptionId;
  }

  // Unsubscribe from specific subscription
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.isActive = false;
      this.subscriptions.delete(subscriptionId);
      logger.info('🔌 SSE subscription removed', 'component', { data: subscriptionId });
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
    logger.info('🔌 SSE disconnected', 'component');
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
        (sub) => sub.isActive
      ).length,
    };
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
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
