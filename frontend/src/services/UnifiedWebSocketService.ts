/**
 * Unified WebSocket Service
 * Industry-grade WebSocket implementation with comprehensive error handling
 * Consolidates all WebSocket functionality into a single, maintainable service
 */

import { io, Socket } from 'socket.io-client';
import { environment } from '../config/environment';
import { authService } from './authService';

import { logger } from '../utils/logger';

export interface BusLocation {
  busId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  eta?: {
    estimated_arrival_minutes: number;
    distance_remaining: number;
    is_near_stop: boolean;
  };
}

interface WebSocketConfig {
  maxReconnectAttempts: number;
  baseReconnectDelay: number;
  maxReconnectDelay: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  mobileOptimizations: boolean;
}

interface ConnectionStats {
  isConnected: boolean;
  connectionState: string;
  reconnectAttempts: number;
  lastHeartbeat: number;
  uptime: number;
  totalConnections: number;
  failedConnections: number;
}

class UnifiedWebSocketService {
  private socket: Socket | null = null;
  private _isConnected: boolean = false;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  
  private config: WebSocketConfig = {
    maxReconnectAttempts: 5,
    baseReconnectDelay: 1000,
    maxReconnectDelay: 10000,
    heartbeatInterval: 30000,
    connectionTimeout: 10000,
    mobileOptimizations: true,
  };

  private reconnectAttempts: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;
  private isShuttingDown: boolean = false;
  private connectionMonitorInterval: NodeJS.Timeout | null = null;
  private clientType: 'student' | 'driver' | 'admin' = 'student';

  // Connection statistics
  private totalConnections: number = 0;
  private failedConnections: number = 0;
  private connectionStartTime: number = 0;

  // Mobile detection
  private isMobile: boolean = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Event listeners with proper cleanup
  private busLocationListeners: Set<(location: BusLocation) => void> = new Set();
  private driverConnectedListeners: Set<(data: any) => void> = new Set();
  private driverDisconnectedListeners: Set<(data: any) => void> = new Set();
  private studentConnectedListeners: Set<() => void> = new Set();
  private busArrivingListeners: Set<(data: any) => void> = new Set();
  private errorListeners: Set<(error: any) => void> = new Set();

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
   * Reset service state for reconnection
   */
  resetState(): void {
    this.reconnectAttempts = 0;
    this.isShuttingDown = false;
    this.lastHeartbeat = 0;
  }

  /**
   * Connect to WebSocket server with authentication
   */
  async connect(): Promise<void> {
    if (this.socket?.connected || this.connectionState === 'connecting') {
      logger.info('🔌 WebSocket already connected or connecting', 'component');
      return;
    }

    // Reset shutting down flag if we're trying to connect again
    if (this.isShuttingDown) {
      logger.info('🔄 Resetting WebSocket service state for reconnection', 'component');
      this.isShuttingDown = false;
    }

    try {
      this.connectionState = 'connecting';
      this.connectionStartTime = Date.now();
      this.totalConnections++;
      
      logger.info('🔌 Connecting to WebSocket server...', 'component');

      // Get WebSocket URL with fallback
      const wsUrl = environment.api.websocketUrl;
      logger.debug('Debug info', 'component', { data: '🔌 WebSocket URL:', wsUrl });

      // Get authentication token (optional for student connections)
      const authToken = authService.getAccessToken();
      if (!authToken && this.clientType !== 'student') {
        throw new Error('No authentication token available');
      }

      // Production-optimized Socket.IO configuration
      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: this.config.connectionTimeout,
        forceNew: false,
        reconnection: false, // We handle reconnection manually for better control
        autoConnect: false,
        ...(authToken && {
          auth: {
            token: authToken,
          },
        }),
        query: {
          clientType: this.clientType,
          version: '2.0.0',
          timestamp: Date.now().toString(),
          mobile: this.isMobile.toString(),
        },
        extraHeaders: {
          'User-Agent': `BusTrackingStudent/2.0.0 (${this.isMobile ? 'Mobile' : 'Desktop'})`,
        },
        // Mobile-specific optimizations
        ...(this.isMobile && {
          pingTimeout: 60000,
          pingInterval: 25000,
          upgradeTimeout: 10000,
        }),
      });

      // Set up connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.connectionState === 'connecting') {
          logger.error('❌ WebSocket connection timeout', 'component');
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, this.config.connectionTimeout);

      // Set up event listeners
      this.setupEventListeners();

      // Connect to server
      this.socket.connect();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.config.connectionTimeout);

        this.socket!.once('connect', () => {
          clearTimeout(timeout);
          this.handleConnect();
          resolve();
        });

        this.socket!.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('🔌 Disconnecting from WebSocket server...', 'component');

    // Clear timeouts and intervals
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this._isConnected = false;
    this.connectionState = 'disconnected';
    this.lastHeartbeat = 0;

    logger.info('🔌 WebSocket disconnected', 'component');
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('connect_error', this.handleConnectionError.bind(this));
    this.socket.on('error', this.handleError.bind(this));

    // Bus location updates
    this.socket.on('bus:locationUpdate', (location: BusLocation) => {
      logger.debug('Debug info', 'component', { data: '📍 Bus location update received:', location });
      this.busLocationListeners.forEach(listener => listener(location));
    });

    // Driver events
    this.socket.on('driver:connected', (data: any) => {
      logger.debug('🚌 Driver connected:', 'component', { data });
      this.driverConnectedListeners.forEach(listener => listener(data));
    });

    this.socket.on('driver:disconnected', (data: any) => {
      logger.debug('🚌 Driver disconnected:', 'component', { data });
      this.driverDisconnectedListeners.forEach(listener => listener(data));
    });

    // Student events
    this.socket.on('student:connected', () => {
      logger.info('🎓 Student connected', 'component');
      this.studentConnectedListeners.forEach(listener => listener());
    });

    // Bus arriving events
    this.socket.on('bus:arriving', (data: any) => {
      logger.debug('🚌 Bus arriving:', 'component', { data });
      this.busArrivingListeners.forEach(listener => listener(data));
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      logger.error('Error occurred', 'component', { error });
      this.errorListeners.forEach(listener => listener(error));
    });
  }

  /**
   * Handle successful connection
   */
  private handleConnect(): void {
    logger.info('✅ WebSocket connected successfully', 'component');
    this._isConnected = true;
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.lastHeartbeat = Date.now();

    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Start heartbeat
    this.startHeartbeat();

    // Start connection monitoring
    this.startConnectionMonitoring();

    // Emit student connection event
    if (this.clientType === 'student') {
      this.socket?.emit('student:connect');
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(reason: string): void {
    logger.debug('Debug info', 'component', { data: '🔌 WebSocket disconnected:', reason });
    this._isConnected = false;
    this.connectionState = 'disconnected';

    // Stop heartbeat
    this.stopHeartbeat();

    // Stop connection monitoring
    this.stopConnectionMonitoring();

    // Attempt reconnection if not shutting down
    if (!this.isShuttingDown && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.attemptReconnection();
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    logger.error('Error occurred', 'component', { error });
    this.failedConnections++;
    this.connectionState = 'disconnected';
    this._isConnected = false;

    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Attempt reconnection if not shutting down
    if (!this.isShuttingDown && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.attemptReconnection();
    }
  }

  /**
   * Handle general errors
   */
  private handleError(error: Error): void {
    logger.error('Error occurred', 'component', { error });
    this.errorListeners.forEach(listener => listener(error));
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    if (this.isShuttingDown) return;

    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;

    const delay = Math.min(
      this.config.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    logger.info('🔄 Attempting reconnection', 'component', { data: `${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms` });

    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.connect().catch(error => {
          logger.error('Error occurred', 'component', { error });
        });
      }
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        this.lastHeartbeat = Date.now();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Start connection monitoring
   */
  private startConnectionMonitoring(): void {
    this.stopConnectionMonitoring(); // Clear any existing monitoring

    this.connectionMonitorInterval = setInterval(() => {
      if (this.socket?.connected) {
        const now = Date.now();
        const timeSinceLastHeartbeat = now - this.lastHeartbeat;
        
        if (timeSinceLastHeartbeat > this.config.heartbeatInterval * 2) {
          logger.warn('⚠️ WebSocket connection appears stale, attempting reconnection', 'component');
          this.handleDisconnect('stale_connection');
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop connection monitoring
   */
  private stopConnectionMonitoring(): void {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this._isConnected && this.socket?.connected === true;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): ConnectionStats {
    return {
      isConnected: this._isConnected,
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0,
      totalConnections: this.totalConnections,
      failedConnections: this.failedConnections,
    };
  }

  /**
   * Event listener management
   */
  onBusLocationUpdate(callback: (location: BusLocation) => void): () => void {
    this.busLocationListeners.add(callback);
    return () => this.busLocationListeners.delete(callback);
  }

  onDriverConnected(callback: (data: any) => void): () => void {
    this.driverConnectedListeners.add(callback);
    return () => this.driverConnectedListeners.delete(callback);
  }

  onDriverDisconnected(callback: (data: any) => void): () => void {
    this.driverDisconnectedListeners.add(callback);
    return () => this.driverDisconnectedListeners.delete(callback);
  }

  onStudentConnected(callback: () => void): () => void {
    this.studentConnectedListeners.add(callback);
    return () => this.studentConnectedListeners.delete(callback);
  }

  onBusArriving(callback: (data: any) => void): () => void {
    this.busArrivingListeners.add(callback);
    return () => this.busArrivingListeners.delete(callback);
  }

  onError(callback: (error: any) => void): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  /**
   * Send location update (for drivers)
   */
  sendLocationUpdate(locationData: {
    driverId: string;
    busId: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
    heading?: number;
  }): void {
    if (this.socket?.connected) {
      this.socket.emit('driver:locationUpdate', locationData);
    } else {
      logger.warn('⚠️ Cannot send location update: WebSocket not connected', 'component');
    }
  }

  /**
   * Authenticate as driver
   */
  authenticateAsDriver(token: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        logger.error('❌ Cannot authenticate: WebSocket not connected', 'component');
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        logger.error('❌ Authentication timeout', 'component');
        resolve(false);
      }, 10000);

      this.socket.once('driver:authenticated', (data) => {
        clearTimeout(timeout);
        logger.debug('✅ Driver authenticated:', 'component', { data });
        resolve(true);
      });

      this.socket.once('driver:authentication_failed', (error) => {
        clearTimeout(timeout);
        logger.error('Error occurred', 'component', { error });
        resolve(false);
      });

      this.socket.emit('driver:authenticate', { token });
    });
  }
}

// Export singleton instance
export const unifiedWebSocketService = new UnifiedWebSocketService();
export default unifiedWebSocketService;
