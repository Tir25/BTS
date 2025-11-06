import { io, Socket } from 'socket.io-client';
import { environment } from '../../config/environment';
import { logger } from '../../utils/logger';
import { authService } from '../authService';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface ConnectionStats {
  isConnected: boolean;
  connectionState: ConnectionState;
  reconnectAttempts: number;
  lastHeartbeat: number;
  uptime: number;
  totalConnections: number;
  failedConnections: number;
}

interface WebSocketConfig {
  maxReconnectAttempts: number;
  baseReconnectDelay: number;
  maxReconnectDelay: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  mobileOptimizations: boolean;
}

/**
 * Connection manager for WebSocket
 * Handles connection lifecycle, reconnection, and heartbeat
 */
export class ConnectionManager {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private clientType: 'student' | 'driver' | 'admin' = 'student';
  
  /**
   * Get client type
   */
  getClientType(): 'student' | 'driver' | 'admin' {
    return this.clientType;
  }
  private isShuttingDown: boolean = false;
  private reconnectAttempts: number = 0;
  private lastHeartbeat: number = 0;
  private connectionStartTime: number = 0;
  private totalConnections: number = 0;
  private failedConnections: number = 0;
  private connectionLock: Promise<void> | null = null;
  
  private config: WebSocketConfig = {
    maxReconnectAttempts: 5,
    baseReconnectDelay: 1000,
    maxReconnectDelay: 10000,
    heartbeatInterval: 30000,
    connectionTimeout: 15000,
    mobileOptimizations: true,
  };

  private timers: {
    heartbeat?: NodeJS.Timeout;
    connection?: NodeJS.Timeout;
    reconnect?: NodeJS.Timeout;
  } = {};

  private connectionStateListeners: Set<(state: { 
    isConnected: boolean; 
    isAuthenticated: boolean; 
    connectionState: ConnectionState;
    error?: string;
  }) => void> = new Set();

  private isMobile: boolean = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  constructor() {
    // Mobile-specific optimizations
    if (this.isMobile) {
      this.config.heartbeatInterval = 60000; // 1 minute for mobile
      this.config.connectionTimeout = 20000; // 20 seconds for mobile
      this.config.maxReconnectAttempts = 10; // More attempts for mobile
    }
  }

  /**
   * Set client type for proper authentication
   */
  setClientType(type: 'student' | 'driver' | 'admin'): void {
    this.clientType = type;
  }

  /**
   * Reset connection state for reconnection
   */
  resetState(): void {
    this.reconnectAttempts = 0;
    this.isShuttingDown = false;
    this.lastHeartbeat = 0;
  }

  /**
   * Atomic connection with race condition elimination
   */
  async connect(): Promise<void> {
    // Atomic check - if already connected, return immediately
    if (this.connectionState === 'connected' && this.socket?.connected) {
      logger.info('🔌 WebSocket already connected', 'component');
      return;
    }

    // Atomic lock - prevent concurrent connections
    if (this.connectionLock) {
      logger.info('🔌 WebSocket connection in progress, waiting...', 'component');
      await this.connectionLock;
      return;
    }

    // Create atomic connection lock
    this.connectionLock = this.performConnection();
    
    try {
      await this.connectionLock;
    } finally {
      this.connectionLock = null;
    }
  }

  /**
   * Internal connection method with atomic operations
   */
  private async performConnection(): Promise<void> {
    try {
      this.updateConnectionState('connecting');
      this.connectionStartTime = Date.now();
      this.totalConnections++;
      
      logger.info('🔌 Connecting to WebSocket server...', 'component');

      const authToken = await this.getValidAuthToken();
      this.socket = this.createSocket(authToken);
      
      await this.connectWithTimeout();
      
      logger.info('✅ WebSocket connected successfully', 'component');
      
    } catch (error) {
      logger.error('❌ WebSocket connection failed', 'component', { error });
      this.updateConnectionState('error', error instanceof Error ? error.message : 'Connection failed');
      this.failedConnections++;
      throw error;
    }
  }

  /**
   * Get authentication token
   */
  private async getValidAuthToken(): Promise<string | null> {
    const token = authService.getAccessToken();
    
    if (!token) {
      if (this.clientType === 'student') {
        logger.info('🎓 Student connecting without authentication (anonymous mode)', 'component');
        return null;
      }
      
      logger.warn('⚠️ No auth token available for WebSocket', 'component');
      return null;
    }

    logger.info('🔐 Using authentication token for WebSocket', 'component', {
      clientType: this.clientType,
      hasToken: !!token
    });

    return token;
  }

  /**
   * Create socket with optimized configuration
   */
  private createSocket(authToken: string | null): Socket {
    const wsUrl = environment.api.websocketUrl;
    
    return io(wsUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      timeout: this.config.connectionTimeout,
      forceNew: true,
      reconnection: false, // We handle reconnection manually
      autoConnect: false,
      auth: {
        token: authToken || (this.clientType === 'student' ? null : ''),
        clientType: this.clientType,
      },
      query: {
        clientType: this.clientType,
        version: '3.0.0',
        timestamp: Date.now().toString(),
      },
      ...(this.isMobile && {
        pingTimeout: 60000,
        pingInterval: 25000,
      }),
    });
  }

  /**
   * Connection with single timeout
   */
  private async connectWithTimeout(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.timers.connection = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      const cleanup = () => {
        if (this.timers.connection) {
          clearTimeout(this.timers.connection);
          this.timers.connection = undefined;
        }
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        this.socket?.off('disconnect', onDisconnect);
      };

      const onConnect = () => {
        cleanup();
        resolve();
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onDisconnect = (reason: string) => {
        cleanup();
        reject(new Error(`Connection failed: ${reason}`));
      };

      this.socket?.once('connect', onConnect);
      this.socket?.once('connect_error', onError);
      this.socket?.once('disconnect', onDisconnect);

      this.socket?.connect();
    });
  }

  /**
   * Atomic state update with event notification
   */
  updateConnectionState(state: ConnectionState, error?: string): void {
    this.connectionState = state;
    
    this.connectionStateListeners.forEach(listener => {
      try {
        listener({
          isConnected: state === 'connected',
          isAuthenticated: false, // This will be updated by the service
          connectionState: state,
          error
        });
      } catch (listenerError) {
        logger.error('Error in connection state listener', 'component', { error: listenerError });
      }
    });
  }

  /**
   * Cleanup all timers atomically
   */
  private cleanupTimers(): void {
    Object.values(this.timers).forEach(timer => {
      if (timer) {
        clearTimeout(timer);
      }
    });
    this.timers = {};
  }

  /**
   * Simplified disconnect with atomic cleanup
   */
  disconnect(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('🔌 Disconnecting from WebSocket server...', 'component');

    this.cleanupTimers();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateConnectionState('disconnected');
    this.lastHeartbeat = 0;

    logger.info('🔌 WebSocket disconnected', 'component');
  }

  /**
   * Start heartbeat
   */
  startHeartbeat(): void {
    this.stopHeartbeat();

    this.timers.heartbeat = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        this.lastHeartbeat = Date.now();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat(): void {
    if (this.timers.heartbeat) {
      clearInterval(this.timers.heartbeat);
      this.timers.heartbeat = undefined;
    }
  }

  /**
   * Simplified reconnection with exponential backoff
   */
  attemptReconnection(onReconnect: () => Promise<void>): void {
    if (this.isShuttingDown) return;

    this.updateConnectionState('reconnecting');
    this.reconnectAttempts++;

    const delay = Math.min(
      this.config.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    logger.info('🔄 Attempting reconnection', 'component', { 
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
      delay: `${delay}ms`
    });

    this.timers.reconnect = setTimeout(() => {
      if (!this.isShuttingDown) {
        onReconnect().catch(error => {
          logger.error('❌ Reconnection failed', 'component', { error });
        });
      }
    }, delay);
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.connectionState === 'connected' && this.socket?.connected === true;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): ConnectionStats {
    return {
      isConnected: this.connectionState === 'connected',
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0,
      totalConnections: this.totalConnections,
      failedConnections: this.failedConnections,
    };
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(listener: (state: { 
    isConnected: boolean; 
    isAuthenticated: boolean; 
    connectionState: ConnectionState;
    error?: string;
  }) => void): () => void {
    this.connectionStateListeners.add(listener);
    
    listener({
      isConnected: this.connectionState === 'connected',
      isAuthenticated: false,
      connectionState: this.connectionState,
    });
    
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  /**
   * Check if should attempt reconnection
   */
  shouldAttemptReconnection(): boolean {
    return !this.isShuttingDown && this.reconnectAttempts < this.config.maxReconnectAttempts;
  }

  /**
   * Reset reconnect attempts
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();

