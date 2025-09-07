// Optimized WebSocket Service with enhanced performance

import { io, Socket } from 'socket.io-client';
import { environment } from '../../config/environment';
import { BusLocation as TypesBusLocation } from '../../types';
import { webSocketOptimizer, OptimizedMessage } from './WebSocketOptimizer';
import { reconnectionStrategy, ReconnectionEventHandler } from './ReconnectionStrategy';

export interface BusLocation extends TypesBusLocation {
  // This interface extends the main BusLocation type from types/index.ts
  // to ensure compatibility across the application
}

export interface OptimizedWebSocketConfig {
  compressionEnabled: boolean;
  messageQueueEnabled: boolean;
  reconnectionEnabled: boolean;
  heartbeatEnabled: boolean;
  performanceMonitoring: boolean;
}

class OptimizedWebSocketService {
  public socket: Socket | null = null;
  private _isConnected: boolean = false;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private config: OptimizedWebSocketConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private performanceMetrics: Map<string, number> = new Map();
  private isShuttingDown: boolean = false;

  // Event listeners
  private busLocationListeners: ((location: BusLocation) => void)[] = [];
  private driverConnectedListeners: ((data: Record<string, unknown>) => void)[] = [];
  private driverDisconnectedListeners: ((data: Record<string, unknown>) => void)[] = [];
  private studentConnectedListeners: (() => void)[] = [];
  private busArrivingListeners: ((data: Record<string, unknown>) => void)[] = [];

  constructor(config: Partial<OptimizedWebSocketConfig> = {}) {
    this.config = {
      compressionEnabled: true,
      messageQueueEnabled: true,
      reconnectionEnabled: true,
      heartbeatEnabled: true,
      performanceMonitoring: true,
      ...config,
    };

    this.setupReconnectionHandlers();
    this.setupPageVisibilityHandlers();
    this.setupPerformanceMonitoring();
  }

  // Setup reconnection event handlers
  private setupReconnectionHandlers(): void {
    if (!this.config.reconnectionEnabled) return;

    const reconnectionHandler: ReconnectionEventHandler = (event, state) => {
      console.log(`🔄 Reconnection event: ${event}`, state);
      
      switch (event) {
        case 'attempting':
          this.connectionState = 'reconnecting';
          break;
        case 'succeeded':
          this.connectionState = 'connected';
          this._isConnected = true;
          break;
        case 'failed':
        case 'abandoned':
          this.connectionState = 'disconnected';
          this._isConnected = false;
          break;
      }
    };

    reconnectionStrategy.addEventHandler(reconnectionHandler);
  }

  // Setup page visibility handlers
  private setupPageVisibilityHandlers(): void {
    if (typeof window === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseActivity();
      } else {
        this.resumeActivity();
      }
    });

    window.addEventListener('beforeunload', () => {
      this.gracefulShutdown();
    });
  }

  // Setup performance monitoring
  private setupPerformanceMonitoring(): void {
    if (!this.config.performanceMonitoring) return;

    setInterval(() => {
      this.logPerformanceMetrics();
    }, 30000); // Log every 30 seconds
  }

  // Get WebSocket URL with optimization
  private getWebSocketUrl(): string {
    const baseUrl = environment.api.websocketUrl;
    
    // Add optimization parameters only if they don't interfere with Socket.IO
    const params = new URLSearchParams();
    if (this.config.heartbeatEnabled) {
      params.set('heartbeat', 'true');
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    const url = params.toString() ? `${baseUrl}${separator}${params.toString()}` : baseUrl;
    console.log(`🔌 Optimized WebSocket URL: ${url}`);
    return url;
  }

  // Connect with optimizations
  async connect(): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Service is shutting down');
    }

    if (this.socket?.connected) {
      console.log('✅ WebSocket already connected');
      return;
    }

    this.connectionState = 'connecting';
    console.log('🔄 Connecting to WebSocket with optimizations...');

    const connectFunction = async () => {
      return new Promise<void>((resolve, reject) => {
        const url = this.getWebSocketUrl();
        
        this.socket = io(url, {
          transports: ['websocket'],
          upgrade: false,
          rememberUpgrade: false,
          timeout: 10000,
          forceNew: true,
          // Optimization options
          // compression: this.config.compressionEnabled, // Not supported in current version
          // Add performance monitoring
          ...(this.config.performanceMonitoring && {
            query: {
              performance: 'true',
              timestamp: Date.now().toString(),
            },
          }),
        });

        // Connection timeout
        const connectionTimeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket.on('connect', () => {
          clearTimeout(connectionTimeout);
          this.handleConnect();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(connectionTimeout);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          this.handleDisconnect(reason);
        });

        this.socket.on('error', (error) => {
          this.handleError(error);
        });

        // Setup optimized event listeners
        this.setupOptimizedEventListeners();
      });
    };

    if (this.config.reconnectionEnabled) {
      await reconnectionStrategy.startReconnection(connectFunction);
    } else {
      await connectFunction();
    }
  }

  // Setup optimized event listeners
  private setupOptimizedEventListeners(): void {
    if (!this.socket) return;

    // Bus location updates with compression handling
    this.socket.on('bus:locationUpdate', async (data: any) => {
      try {
        // Handle compressed messages
        const message = await this.handleIncomingMessage(data);
        this.busLocationListeners.forEach(listener => {
          try {
            listener(message.data);
          } catch (error) {
            console.error('❌ Bus location listener error:', error);
          }
        });
        
        this.updatePerformanceMetric('messagesReceived', 1);
      } catch (error) {
        console.error('❌ Failed to process bus location update:', error);
      }
    });

    // Driver events
    this.socket.on('driver:connected', (data: any) => {
      this.driverConnectedListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('❌ Driver connected listener error:', error);
        }
      });
    });

    this.socket.on('driver:disconnected', (data: any) => {
      this.driverDisconnectedListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('❌ Driver disconnected listener error:', error);
        }
      });
    });

    // Student events
    this.socket.on('student:connected', () => {
      this.studentConnectedListeners.forEach(listener => {
        try {
          listener();
        } catch (error) {
          console.error('❌ Student connected listener error:', error);
        }
      });
    });

    // Bus arriving events
    this.socket.on('bus:arriving', (data: any) => {
      this.busArrivingListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('❌ Bus arriving listener error:', error);
        }
      });
    });
  }

  // Handle incoming messages (decompression, validation, etc.)
  private async handleIncomingMessage(data: any): Promise<OptimizedMessage> {
    const message: OptimizedMessage = {
      id: data.id || `msg_${Date.now()}`,
      type: data.type || 'unknown',
      data: data.data || data,
      timestamp: data.timestamp || Date.now(),
      compressed: data.compressed || false,
      priority: data.priority || 'normal',
    };

    // Decompress if needed
    if (message.compressed) {
      return await webSocketOptimizer.decompressMessage(message);
    }

    return message;
  }

  // Send optimized message
  async sendMessage(type: string, data: any, priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    const message = webSocketOptimizer.createMessage(type, data, priority);
    
    if (this.config.messageQueueEnabled) {
      webSocketOptimizer.queueMessage(message);
      await webSocketOptimizer.processMessageQueue(async (msg) => {
        this.socket!.emit(msg.type, msg);
        this.updatePerformanceMetric('messagesSent', 1);
      });
    } else {
      const optimizedMessage = await webSocketOptimizer.compressMessage(message);
      this.socket.emit(optimizedMessage.type, optimizedMessage);
      this.updatePerformanceMetric('messagesSent', 1);
    }
  }

  // Handle connection
  private handleConnect(): void {
    console.log('✅ WebSocket connected with optimizations');
    this._isConnected = true;
    this.connectionState = 'connected';
    
    if (this.config.heartbeatEnabled) {
      this.startHeartbeat();
    }

    reconnectionStrategy.reset();
    this.updatePerformanceMetric('connections', 1);
  }

  // Handle disconnection
  private handleDisconnect(reason: string): void {
    console.log('❌ WebSocket disconnected:', reason);
    this._isConnected = false;
    this.connectionState = 'disconnected';
    
    this.stopHeartbeat();
    this.updatePerformanceMetric('disconnections', 1);
  }

  // Handle errors
  private handleError(error: unknown): void {
    console.error('❌ WebSocket error:', error);
    this.updatePerformanceMetric('errors', 1);
  }

  // Start heartbeat
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.sendMessage('ping', { timestamp: Date.now() }, 'low');
      }
    }, 30000); // 30 seconds
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Pause activity when page is hidden
  private pauseActivity(): void {
    console.log('⏸️ Pausing WebSocket activity');
    this.stopHeartbeat();
  }

  // Resume activity when page is visible
  private resumeActivity(): void {
    console.log('▶️ Resuming WebSocket activity');
    if (this._isConnected && this.config.heartbeatEnabled) {
      this.startHeartbeat();
    }
  }

  // Graceful shutdown
  private gracefulShutdown(): void {
    console.log('🔄 Gracefully shutting down WebSocket...');
    this.isShuttingDown = true;
    
    this.stopHeartbeat();
    reconnectionStrategy.destroy();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Update performance metric
  private updatePerformanceMetric(metric: string, value: number): void {
    if (!this.config.performanceMonitoring) return;
    
    const current = this.performanceMetrics.get(metric) || 0;
    this.performanceMetrics.set(metric, current + value);
  }

  // Log performance metrics
  private logPerformanceMetrics(): void {
    if (!this.config.performanceMonitoring) return;

    const metrics = Object.fromEntries(this.performanceMetrics);
    const wsMetrics = webSocketOptimizer.getMetrics();
    const reconnectionState = reconnectionStrategy.getState();

    console.log('📊 WebSocket Performance Metrics:', {
      ...metrics,
      ...wsMetrics,
      reconnectionState,
      connectionQuality: reconnectionStrategy.getConnectionQuality(),
    });
  }

  // Public API methods
  disconnect(): void {
    this.gracefulShutdown();
  }

  isConnected(): boolean {
    return this._isConnected && this.socket?.connected === true;
  }

  getConnectionState(): 'disconnected' | 'connecting' | 'connected' | 'reconnecting' {
    return this.connectionState;
  }

  // Event listener management
  onBusLocationUpdate(callback: (location: BusLocation) => void): void {
    this.busLocationListeners.push(callback);
  }

  onDriverConnected(callback: (data: Record<string, unknown>) => void): void {
    this.driverConnectedListeners.push(callback);
  }

  onDriverDisconnected(callback: (data: Record<string, unknown>) => void): void {
    this.driverDisconnectedListeners.push(callback);
  }

  onStudentConnected(callback: () => void): void {
    this.studentConnectedListeners.push(callback);
  }

  onBusArriving(callback: (data: Record<string, unknown>) => void): void {
    this.busArrivingListeners.push(callback);
  }

  // Get performance metrics
  getPerformanceMetrics(): Record<string, any> {
    return {
      ...Object.fromEntries(this.performanceMetrics),
      ...webSocketOptimizer.getMetrics(),
      reconnectionState: reconnectionStrategy.getState(),
      connectionQuality: reconnectionStrategy.getConnectionQuality(),
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<OptimizedWebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const optimizedWebSocketService = new OptimizedWebSocketService();

