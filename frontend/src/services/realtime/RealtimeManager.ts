import { connectionPool, ConnectionStatus } from './ConnectionPool';
import { supabaseRealtimeService, RealtimeSubscription } from './SupabaseRealtimeService';
import { sseService } from './SSEService';
import { environment } from '../../config/environment';
import { logError } from '../../utils/errorHandler';

export interface RealtimeConfig {
  enableWebSocket: boolean;
  enableSupabaseRealtime: boolean;
  enableSSE: boolean;
  priority: 'websocket' | 'supabase' | 'sse' | 'hybrid';
  fallbackStrategy: 'websocket' | 'supabase' | 'sse';
}

export interface RealtimeEvent {
  type: string;
  source: 'websocket' | 'supabase' | 'sse';
  data: any;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

export interface RealtimeHealth {
  websocket: { healthy: boolean; details: any };
  supabase: { healthy: boolean; details: any };
  sse: { healthy: boolean; details: any };
  overall: boolean;
}

class RealtimeManager {
  private config: RealtimeConfig;
  private eventListeners: Map<string, ((event: RealtimeEvent) => void)[]> = new Map();
  private isInitialized: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<RealtimeConfig>) {
    this.config = {
      enableWebSocket: true,
      enableSupabaseRealtime: true,
      enableSSE: true,
      priority: 'hybrid',
      fallbackStrategy: 'websocket',
      ...config,
    };
  }

  // Initialize all real-time services
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 RealtimeManager already initialized');
      return;
    }

    console.log('🚀 Initializing RealtimeManager...');

    try {
      // Initialize real-time services with fallback strategy
      const initPromises = [];

      // Initialize Supabase Realtime first (most reliable)
      if (this.config.enableSupabaseRealtime) {
        initPromises.push(
          this.initializeSupabaseRealtime().catch(error => {
            console.warn('⚠️ Supabase Realtime initialization failed:', error);
            return null;
          })
        );
      }

      // Initialize WebSocket (may fail if backend is down)
      if (this.config.enableWebSocket) {
        initPromises.push(
          this.initializeWebSocket().catch(error => {
            console.warn('⚠️ WebSocket initialization failed:', error);
            return null;
          })
        );
      }

      // Initialize SSE (optional)
      if (this.config.enableSSE) {
        initPromises.push(
          this.initializeSSE().catch(error => {
            console.warn('⚠️ SSE initialization failed:', error);
            return null;
          })
        );
      }

      // Wait for all initialization attempts
      const results = await Promise.allSettled(initPromises);
      
      // Count successful initializations
      const successfulInits = results.filter(result => 
        result.status === 'fulfilled' && result.value !== null
      ).length;

      if (successfulInits === 0) {
        console.warn('⚠️ No real-time services initialized successfully');
      } else {
        console.log(`✅ RealtimeManager initialized with ${successfulInits} service(s)`);
      }

      this.isInitialized = true;
      this.startHealthCheck();
      
    } catch (error) {
      console.error('❌ Failed to initialize RealtimeManager:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  private async initializeWebSocket(): Promise<void> {
    console.log('🔌 Initializing WebSocket connection pool...');
    
    try {
      // Check if backend is available first
      const backendUrl = environment.api.url;
      console.log('🔌 Checking backend availability at:', backendUrl);

      const response = await fetch(backendUrl + '/health');
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.statusText}`);
      }
      const healthStatus = await response.json();
      console.log('✅ Backend health check successful:', healthStatus);

      // Connect to high-priority connections first
      await connectionPool.connect('location-updates');
      await connectionPool.connect('general-updates');
      
      // Set up event listeners for WebSocket
      this.setupWebSocketListeners();
      
      console.log('✅ WebSocket connections established successfully');
    } catch (error) {
      console.warn('⚠️ WebSocket initialization failed, falling back to Supabase Realtime:', error);
      logError(error instanceof Error ? error : new Error('WebSocket initialization failed'), {
        service: 'websocket',
        operation: 'initialize',
      }, 'high');
      // Continue with other real-time services
    }
  }

  private async initializeSupabaseRealtime(): Promise<void> {
    console.log('🔌 Initializing Supabase Realtime...');
    
    // Set up Supabase Realtime subscriptions
    this.setupSupabaseRealtimeListeners();
  }

  private async initializeSSE(): Promise<void> {
    console.log('🔌 Initializing SSE...');
    
    try {
      await sseService.connect();
      this.setupSSEListeners();
    } catch (error) {
      console.warn('⚠️ SSE initialization failed:', error);
      // Continue with other real-time services
    }
  }

  private setupWebSocketListeners(): void {
    // Bus location updates
    connectionPool.on('location-updates', 'bus:locationUpdate', (data: any) => {
      this.handleEvent('bus-location-update', 'websocket', data, 'high');
    });

    // Driver connections
    connectionPool.on('general-updates', 'driver:connected', (data: any) => {
      this.handleEvent('driver-connected', 'websocket', data, 'medium');
    });

    connectionPool.on('general-updates', 'driver:disconnected', (data: any) => {
      this.handleEvent('driver-disconnected', 'websocket', data, 'medium');
    });

    // Bus arrivals
    connectionPool.on('general-updates', 'bus:arriving', (data: any) => {
      this.handleEvent('bus-arriving', 'websocket', data, 'high');
    });
  }

  private setupSupabaseRealtimeListeners(): void {
    // Subscribe to bus location updates
    supabaseRealtimeService.subscribeToBusLocations((payload) => {
      this.handleEvent('bus-location-update', 'supabase', payload, 'high');
    });

    // Subscribe to bus updates
    supabaseRealtimeService.subscribeToBusUpdates((payload) => {
      this.handleEvent('bus-update', 'supabase', payload, 'medium');
    });

    // Subscribe to route updates
    supabaseRealtimeService.subscribeToRouteUpdates((payload) => {
      this.handleEvent('route-update', 'supabase', payload, 'medium');
    });

    // Subscribe to driver assignments
    supabaseRealtimeService.subscribeToDriverAssignments((payload) => {
      this.handleEvent('driver-assignment-update', 'supabase', payload, 'medium');
    });
  }

  private setupSSEListeners(): void {
    // Subscribe to SSE events
    sseService.subscribe('bus-location-update', (event) => {
      this.handleEvent('bus-location-update', 'sse', event.data, 'high');
    });

    sseService.subscribe('bus-status-update', (event) => {
      this.handleEvent('bus-status-update', 'sse', event.data, 'medium');
    });

    sseService.subscribe('route-update', (event) => {
      this.handleEvent('route-update', 'sse', event.data, 'medium');
    });

    sseService.subscribe('system-notification', (event) => {
      this.handleEvent('system-notification', 'sse', event.data, 'low');
    });
  }

  private handleEvent(
    type: string,
    source: 'websocket' | 'supabase' | 'sse',
    data: any,
    priority: 'high' | 'medium' | 'low'
  ): void {
    const event: RealtimeEvent = {
      type,
      source,
      data,
      timestamp: Date.now(),
      priority,
    };

    console.log(`📡 Realtime event: ${type} from ${source} (${priority} priority)`, event);

    // Notify all listeners for this event type
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`❌ Error in realtime event listener for ${type}:`, error);
        }
      });
    }
  }

  // Subscribe to real-time events
  on(eventType: string, callback: (event: RealtimeEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  // Unsubscribe from real-time events
  off(eventType: string, callback: (event: RealtimeEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Emit event through WebSocket
  emit(event: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const connectionName = priority === 'high' ? 'location-updates' : 'general-updates';
    connectionPool.emit(connectionName, event, data);
  }

  // Get connection status for all services
  getConnectionStatus(): {
    websocket: ConnectionStatus[];
    supabase: RealtimeSubscription[];
    sse: { isConnected: boolean; readyState: number };
  } {
    return {
      websocket: connectionPool.getAllConnectionStatus(),
      supabase: supabaseRealtimeService.getActiveSubscriptions(),
      sse: sseService.getConnectionStatus(),
    };
  }

  // Health check for all services
  async healthCheck(): Promise<RealtimeHealth> {
    const [websocketHealth, supabaseHealth, sseHealth] = await Promise.all([
      this.checkWebSocketHealth(),
      supabaseRealtimeService.healthCheck(),
      sseService.healthCheck(),
    ]);

    const overall = websocketHealth.healthy || supabaseHealth.healthy || sseHealth.healthy;

    return {
      websocket: websocketHealth,
      supabase: supabaseHealth,
      sse: sseHealth,
      overall,
    };
  }

  private async checkWebSocketHealth(): Promise<{ healthy: boolean; details: any }> {
    const statuses = connectionPool.getAllConnectionStatus();
    const healthy = statuses.some(status => status.isConnected);
    
    return {
      healthy,
      details: {
        connections: statuses,
        totalConnections: statuses.length,
        connectedConnections: statuses.filter(s => s.isConnected).length,
      },
    };
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.healthCheck();
        
        if (!health.overall) {
          console.warn('⚠️ Realtime health check failed:', health);
          await this.handleHealthFailure();
        } else {
          console.log('✅ Realtime health check passed');
        }
      } catch (error) {
        console.error('❌ Error during realtime health check:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private async handleHealthFailure(): Promise<void> {
    console.log('🔄 Attempting to recover from realtime health failure...');
    
    // Try to reconnect failed services
    if (this.config.enableWebSocket) {
      try {
        await connectionPool.connect('location-updates');
        await connectionPool.connect('general-updates');
      } catch (error) {
        console.error('❌ Failed to reconnect WebSocket:', error);
      }
    }

    if (this.config.enableSSE) {
      try {
        await sseService.connect();
      } catch (error) {
        console.error('❌ Failed to reconnect SSE:', error);
      }
    }
  }

  // Configure real-time services
  configure(config: Partial<RealtimeConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ RealtimeManager configuration updated:', this.config);
  }

  // Get current configuration
  getConfig(): RealtimeConfig {
    return { ...this.config };
  }

  // Cleanup and destroy all connections
  destroy(): void {
    console.log('🧹 Destroying RealtimeManager...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    connectionPool.destroy();
    supabaseRealtimeService.destroy();
    sseService.destroy();
    
    this.eventListeners.clear();
    this.isInitialized = false;
    
    console.log('✅ RealtimeManager destroyed');
  }
}

export const realtimeManager = new RealtimeManager();
export default realtimeManager;
