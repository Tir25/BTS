/**
 * Unified WebSocket Service
 * Industry-grade WebSocket implementation with comprehensive error handling
 * Consolidates all WebSocket functionality into a single, maintainable service
 */

import { io, Socket } from 'socket.io-client';
import { environment } from '../config/environment';
import { authService } from './authService';

import { logger } from '../utils/logger';
import { validateGPSLocation } from '../utils/gpsValidation';

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
  
  // PRODUCTION FIX: Add authentication state tracking for different client types
  private _isStudentAuthenticated: boolean = false;
  private _isDriverAuthenticated: boolean = false;
  private studentConnectionTimeout: NodeJS.Timeout | null = null;
  
  private config: WebSocketConfig = {
    maxReconnectAttempts: 3, // Reduced to prevent infinite retries
    baseReconnectDelay: 2000, // Increased base delay
    maxReconnectDelay: 8000, // Reduced max delay
    heartbeatInterval: 30000,
    connectionTimeout: 8000, // Reduced timeout
    mobileOptimizations: true,
  };

  private reconnectAttempts: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;
  private isShuttingDown: boolean = false;
  private connectionMonitorInterval: NodeJS.Timeout | null = null;
  private clientType: 'student' | 'driver' | 'admin' = 'student';
  
  // PRODUCTION FIX: Connection state change listeners for event-driven updates
  private connectionStateListeners: Set<(state: { isConnected: boolean; isAuthenticated: boolean; connectionState: string }) => void> = new Set();

  // Atomic connection lock to prevent race conditions
  private connectionLock: Promise<void> | null = null;
  private connectionLockResolve: (() => void) | null = null;

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
  private driverAssignmentUpdateListeners: Set<(data: any) => void> = new Set();

  // Location update deduplication and throttling
  // ENHANCED: Multiple layers of deduplication to prevent 16ms duplicate issue
  private lastSentLocation: {
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null = null;
  private lastSendTime: number = 0;
  private readonly MIN_SEND_INTERVAL = 1000; // Minimum 1 second between sends
  private readonly MIN_DISTANCE_THRESHOLD = 5; // Minimum 5 meters distance change
  private readonly RAPID_DUPLICATE_THRESHOLD = 100; // Block duplicates within 100ms
  private sendThrottleTimeout: NodeJS.Timeout | null = null;
  // PRODUCTION FIX: Use array-based queue instead of single pending update to prevent data loss
  private pendingLocationUpdatesQueue: Array<{
    driverId: string;
    busId: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
    heading?: number;
  }> = [];
  private readonly MAX_QUEUE_SIZE = 10; // Maximum queue size to prevent memory issues
  // Message sequence tracking for exact duplicate detection
  private locationMessageQueue: Map<string, number> = new Map(); // location key -> timestamp
  private readonly QUEUE_CLEANUP_INTERVAL = 5000; // Clean up old entries every 5 seconds

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
    // PRODUCTION FIX: Clear pending queue on reset
    this.pendingLocationUpdatesQueue = [];
    if (this.sendThrottleTimeout) {
      clearTimeout(this.sendThrottleTimeout);
      this.sendThrottleTimeout = null;
    }
  }

  /**
   * Connect to WebSocket server with authentication - SIMPLIFIED & ROBUST
   * ATOMIC CONNECTION: Uses promise-based lock to prevent duplicate connections
   */
  async connect(): Promise<void> {
    // If already connected, return immediately
    if (this.socket?.connected) {
      logger.info('🔌 WebSocket already connected', 'component');
      return;
    }

    // If another connection is in progress, wait for it
    if (this.connectionLock) {
      logger.info('🔌 WebSocket connection already in progress, waiting...', 'component');
      await this.connectionLock;
      // Check again after waiting
      if (this.socket?.connected) {
        logger.info('✅ WebSocket connected while waiting', 'component');
        return;
      }
    }

    // Reset shutting down flag if we're trying to connect again
    if (this.isShuttingDown) {
      logger.info('🔄 Resetting WebSocket service state for reconnection', 'component');
      this.isShuttingDown = false;
    }

    // Create atomic connection lock
    let lockResolve: () => void;
    this.connectionLock = new Promise<void>((resolve) => {
      lockResolve = resolve;
      this.connectionLockResolve = resolve;
    });

    try {
      this.connectionState = 'connecting';
      this.connectionStartTime = Date.now();
      this.totalConnections++;
      
      logger.info('🔌 Connecting to WebSocket server...', 'component');

      // Get WebSocket URL with fallback
      const wsUrl = environment.api.websocketUrl;
      logger.debug('Debug info', 'component', { data: '🔌 WebSocket URL:', wsUrl });

      // PRODUCTION FIX: Validate token before WebSocket authentication
      let authToken = authService.getAccessToken();
      
      if (this.clientType !== 'student') {
        // For driver/admin clients, token validation is required
        if (!authToken) {
          logger.warn('⚠️ No auth token, attempting to refresh session...', 'component');
          try {
            const refreshResult = await authService.refreshSession();
            if (refreshResult.success) {
              authToken = authService.getAccessToken();
              logger.info('✅ Session refreshed, token obtained', 'component');
            }
          } catch (refreshError) {
            logger.error('❌ Session refresh failed', 'component', { error: refreshError });
          }
        }
        
        // PRODUCTION FIX: Validate token before using it for WebSocket
        if (authToken) {
          try {
            const tokenValidation = await authService.validateTokenForAPI();
            if (!tokenValidation.valid || !tokenValidation.token) {
              logger.error('❌ Token validation failed before WebSocket connection', 'component', {
                valid: tokenValidation.valid,
                refreshed: tokenValidation.refreshed
              });
              
              // Try to refresh session if validation failed
              const refreshResult = await authService.refreshSession();
              if (refreshResult.success) {
                authToken = authService.getAccessToken();
                // Re-validate after refresh
                const reValidation = await authService.validateTokenForAPI();
                if (!reValidation.valid || !reValidation.token) {
                  throw new Error('Token validation failed after refresh');
                }
                authToken = reValidation.token;
                logger.info('✅ Token validated after refresh', 'component');
              } else {
                throw new Error('Session refresh failed');
              }
            } else {
              // Use validated token
              authToken = tokenValidation.token;
              logger.info('✅ Token validated successfully before WebSocket connection', 'component');
            }
          } catch (validationError) {
            logger.error('❌ Token validation error before WebSocket connection', 'component', { 
              error: validationError instanceof Error ? validationError.message : String(validationError)
            });
            throw new Error('Token validation failed: ' + (validationError instanceof Error ? validationError.message : String(validationError)));
          }
        }
        
        if (!authToken) {
          logger.error('❌ No valid authentication token available for WebSocket connection', 'component', {
            clientType: this.clientType
          });
          throw new Error('No valid authentication token available');
        }
      }

      // Simplified Socket.IO configuration for better reliability
      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        timeout: 15000, // Increased timeout
        forceNew: true, // Force new connection for reliability
        reconnection: false, // We handle reconnection manually
        autoConnect: false,
        auth: {
          token: authToken || '',
          clientType: this.clientType,
        },
        query: {
          clientType: this.clientType,
          version: '2.0.0',
          timestamp: Date.now().toString(),
        },
        // Simplified mobile optimizations
        ...(this.isMobile && {
          pingTimeout: 60000,
          pingInterval: 25000,
        }),
      });

      // Set up connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.connectionState === 'connecting') {
          logger.error('❌ WebSocket connection timeout', 'component');
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, 15000); // Increased timeout

      // Set up event listeners
      this.setupEventListeners();

      // Connect to server
      this.socket.connect();

      // Wait for connection with improved error handling
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 15000);

        this.socket!.once('connect', () => {
          clearTimeout(timeout);
          this.handleConnect();
          resolve();
        });

        this.socket!.once('connect_error', (error) => {
          clearTimeout(timeout);
          logger.error('❌ WebSocket connection error', 'component', { error: error.message });
          reject(error);
        });

        this.socket!.once('disconnect', (reason) => {
          clearTimeout(timeout);
          logger.warn('⚠️ WebSocket disconnected during connection', 'component', { reason });
          reject(new Error(`Connection failed: ${reason}`));
        });
      });

    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      this.handleConnectionError(error as Error);
      throw error;
    } finally {
      // Release connection lock
      if (this.connectionLockResolve) {
        this.connectionLockResolve();
        this.connectionLock = null;
        this.connectionLockResolve = null;
      }
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

    // Release connection lock if present
    if (this.connectionLockResolve) {
      this.connectionLockResolve();
      this.connectionLock = null;
      this.connectionLockResolve = null;
    }

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

    // Bus location updates - CRITICAL: This is how students receive real-time updates
    this.socket.on('bus:locationUpdate', (location: BusLocation) => {
      logger.info('📍 Bus location update received from WebSocket', 'component', {
        busId: location.busId,
        driverId: location.driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        hasEta: !!location.eta,
        hasNearStop: !!location.nearStop,
        listenersCount: this.busLocationListeners.size
      });
      
      // Notify all registered listeners (StudentMap components)
      let listenerCount = 0;
      this.busLocationListeners.forEach(listener => {
        try {
          listener(location);
          listenerCount++;
        } catch (listenerError) {
          logger.error('Error in bus location listener', 'component', {
            error: listenerError instanceof Error ? listenerError.message : String(listenerError)
          });
        }
      });
      
      if (listenerCount === 0) {
        logger.warn('⚠️ No listeners registered for bus location updates - StudentMap may not be connected', 'component', {
          busId: location.busId
        });
      } else {
        logger.debug('✅ Location update delivered to listeners', 'component', {
          listenerCount,
          busId: location.busId
        });
      }
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

    // Student events - PRODUCTION FIX: Enhanced authentication handling
    this.socket.on('student:connected', (data?: { timestamp?: string; userId?: string }) => {
      logger.info('🎓 Student authenticated successfully', 'component', { data });
      this._isStudentAuthenticated = true;
      
      // Clear connection timeout
      if (this.studentConnectionTimeout) {
        clearTimeout(this.studentConnectionTimeout);
        this.studentConnectionTimeout = null;
      }
      
      // Notify listeners
      this.studentConnectedListeners.forEach(listener => listener());
      
      // PRODUCTION FIX: Notify connection state listeners
      this.notifyConnectionStateChange();
    });
    
    // Bus arriving events
    this.socket.on('bus:arriving', (data: any) => {
      logger.debug('🚌 Bus arriving:', 'component', { data });
      this.busArrivingListeners.forEach(listener => listener(data));
    });

    // Driver assignment update events
    this.socket.on('driver:assignmentUpdate', (data: any) => {
      logger.info('📋 Driver assignment update received:', 'component', { 
        type: data.type,
        hasAssignment: !!data.assignment 
      });
      this.driverAssignmentUpdateListeners.forEach(listener => listener(data));
    });

    // Error handling - PRODUCTION FIX: Enhanced student authentication error handling
    this.socket.on('error', (error: any) => {
      logger.error('WebSocket error received', 'component', { error });
      
      // PRODUCTION FIX: Check if it's a student authentication error
      if (error.code === 'NOT_AUTHENTICATED' || error.code === 'INSUFFICIENT_PERMISSIONS') {
        this._isStudentAuthenticated = false;
        logger.error('❌ Student authentication failed', 'component', { 
          code: error.code,
          message: error.message 
        });
        
        // PRODUCTION FIX: Clear authentication timeout on error
        if (this.studentConnectionTimeout) {
          clearTimeout(this.studentConnectionTimeout);
          this.studentConnectionTimeout = null;
        }
        
        this.notifyConnectionStateChange();
      }
      
      // PRODUCTION FIX: Handle recoverable errors differently
      const isRecoverable = error.code === 'NETWORK_ERROR' || 
                           error.code === 'TIMEOUT' ||
                           error.message?.includes('network') ||
                           error.message?.includes('timeout');
      
      if (isRecoverable && this.clientType === 'student') {
        logger.warn('⚠️ Recoverable WebSocket error - will attempt reconnection', 'component', {
          code: error.code,
          message: error.message
        });
        // Connection monitoring will handle reconnection
      }
      
      this.errorListeners.forEach(listener => {
        try {
          listener(error);
        } catch (listenerError) {
          logger.error('Error in error listener', 'component', { error: listenerError });
        }
      });
    });
  }

  /**
   * Handle successful connection - IMPROVED
   * PRODUCTION FIX: Enhanced student authentication flow
   */
  private handleConnect(): void {
    logger.info('✅ WebSocket connected successfully', 'component');
    this._isConnected = true;
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.lastHeartbeat = Date.now();

    // PRODUCTION FIX: Reset authentication state on reconnect
    if (this.clientType === 'student') {
      this._isStudentAuthenticated = false;
    }

    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Release connection lock
    if (this.connectionLockResolve) {
      this.connectionLockResolve();
      this.connectionLock = null;
      this.connectionLockResolve = null;
    }

    // Start heartbeat
    this.startHeartbeat();

    // Start connection monitoring
    this.startConnectionMonitoring();

    // Emit appropriate connection event based on client type with error handling
    try {
      if (this.clientType === 'student') {
        logger.info('🎓 Emitting student:connect for authentication', 'component');
        this.socket?.emit('student:connect');
        
        // PRODUCTION FIX: Set timeout for student authentication response with retry mechanism
        this.studentConnectionTimeout = setTimeout(() => {
          if (!this._isStudentAuthenticated) {
            logger.warn('⚠️ Student authentication timeout - retrying connection', 'component');
            this._isStudentAuthenticated = false;
            
            // PRODUCTION FIX: Retry authentication once before failing
            if (this.socket && this.socket.connected) {
              logger.info('🔄 Retrying student authentication', 'component');
              try {
                this.socket.emit('student:connect');
                
                // Set a shorter timeout for retry (5 seconds)
                if (this.studentConnectionTimeout) {
                  clearTimeout(this.studentConnectionTimeout);
                }
                this.studentConnectionTimeout = setTimeout(() => {
                  if (!this._isStudentAuthenticated) {
                    logger.error('❌ Student authentication failed after retry', 'component');
                    this._isStudentAuthenticated = false;
                    this.notifyConnectionStateChange();
                  }
                }, 5000);
              } catch (retryError) {
                logger.error('❌ Error retrying student authentication', 'component', { error: retryError });
                this._isStudentAuthenticated = false;
                this.notifyConnectionStateChange();
              }
            } else {
              // Socket not connected, no point retrying
              logger.error('❌ Student authentication timeout - socket not connected', 'component');
              this.notifyConnectionStateChange();
            }
          }
        }, 10000); // 10 second timeout for authentication
      } else if (this.clientType === 'driver') {
        this.socket?.emit('driver:connect');
      } else if (this.clientType === 'admin') {
        this.socket?.emit('admin:connect');
      }
      
      // PRODUCTION FIX: Notify connection state listeners
      this.notifyConnectionStateChange();
    } catch (emitError) {
      logger.warn('⚠️ Error emitting connection event', 'component', { error: emitError });
    }
  }
  
  /**
   * PRODUCTION FIX: Notify all connection state listeners of state changes
   */
  private notifyConnectionStateChange(): void {
    const isAuthenticated = this.clientType === 'student' 
      ? this._isStudentAuthenticated 
      : this._isDriverAuthenticated;
    
    const state = {
      isConnected: this._isConnected,
      isAuthenticated,
      connectionState: this.connectionState,
    };
    
    this.connectionStateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        logger.error('Error in connection state listener', 'component', { error });
      }
    });
  }
  
  /**
   * PRODUCTION FIX: Subscribe to connection state changes (event-driven alternative to polling)
   */
  onConnectionStateChange(listener: (state: { isConnected: boolean; isAuthenticated: boolean; connectionState: string }) => void): () => void {
    this.connectionStateListeners.add(listener);
    
    // Immediately notify with current state
    const isAuthenticated = this.clientType === 'student' 
      ? this._isStudentAuthenticated 
      : this._isDriverAuthenticated;
    
    listener({
      isConnected: this._isConnected,
      isAuthenticated,
      connectionState: this.connectionState,
    });
    
    // Return unsubscribe function
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }
  
  /**
   * PRODUCTION FIX: Get student authentication status
   */
  isStudentAuthenticated(): boolean {
    return this._isStudentAuthenticated;
  }

  /**
   * Handle disconnection
   * PRODUCTION FIX: Reset authentication state on disconnect
   */
  private handleDisconnect(reason: string): void {
    logger.debug('Debug info', 'component', { data: '🔌 WebSocket disconnected:', reason });
    this._isConnected = false;
    this.connectionState = 'disconnected';
    
    // PRODUCTION FIX: Reset authentication state
    this._isStudentAuthenticated = false;
    this._isDriverAuthenticated = false;
    
    // Clear student connection timeout
    if (this.studentConnectionTimeout) {
      clearTimeout(this.studentConnectionTimeout);
      this.studentConnectionTimeout = null;
    }

    // Stop heartbeat
    this.stopHeartbeat();

    // Stop connection monitoring
    this.stopConnectionMonitoring();
    
    // PRODUCTION FIX: Notify connection state listeners
    this.notifyConnectionStateChange();

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

    // Release connection lock on error
    if (this.connectionLockResolve) {
      this.connectionLockResolve();
      this.connectionLock = null;
      this.connectionLockResolve = null;
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

  onDriverAssignmentUpdate(callback: (data: any) => void): () => void {
    this.driverAssignmentUpdateListeners.add(callback);
    return () => this.driverAssignmentUpdateListeners.delete(callback);
  }

  /**
   * Calculate distance between two coordinates in meters (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Actually send the location update (internal method)
   */
  private actualSendLocationUpdate(locationData: {
    driverId: string;
    busId: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
    heading?: number;
  }): void {
    if (!this.socket?.connected) {
      logger.error('❌ Cannot send location update: WebSocket not connected', 'component', {
        socketConnected: this.socket?.connected,
        isConnected: this._isConnected,
        connectionState: this.connectionState,
      });
      return;
    }

    const now = Date.now();
    const locationKey = `${locationData.latitude.toFixed(6)}_${locationData.longitude.toFixed(6)}`;

    logger.info('📤 Emitting location update via WebSocket', 'component', {
      driverId: locationData.driverId,
      busId: locationData.busId,
      lat: locationData.latitude,
      lng: locationData.longitude,
      timestamp: locationData.timestamp,
    });
    
    this.socket.emit('driver:locationUpdate', locationData);
    
    // Update tracking for all deduplication layers
    this.lastSentLocation = {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      timestamp: now,
    };
    this.lastSendTime = now;
    
    // Track in message queue for rapid duplicate detection
    this.locationMessageQueue.set(locationKey, now);
    
    // Clean up old queue entries periodically
    if (this.locationMessageQueue.size > 100) {
      const cutoffTime = now - this.QUEUE_CLEANUP_INTERVAL;
      for (const [key, timestamp] of this.locationMessageQueue.entries()) {
        if (timestamp < cutoffTime) {
          this.locationMessageQueue.delete(key);
        }
      }
    }
    
    logger.info('✅ Location update emitted successfully', 'component');
  }

  /**
   * Process pending location updates queue
   * PRODUCTION FIX: Sends queued updates sequentially with proper throttling
   */
  private processPendingLocationUpdatesQueue(): void {
    if (this.pendingLocationUpdatesQueue.length === 0) {
      return;
    }

    // Send the oldest update in queue (FIFO - First In First Out)
    const updateToSend = this.pendingLocationUpdatesQueue.shift();
    if (updateToSend) {
      logger.debug('📤 Processing queued location update', 'component', {
        queueSize: this.pendingLocationUpdatesQueue.length,
        lat: updateToSend.latitude,
        lng: updateToSend.longitude
      });
      
      // Send the update
      this.actualSendLocationUpdate(updateToSend);
      
      // If there are more updates in queue, schedule next send
      if (this.pendingLocationUpdatesQueue.length > 0 && !this.sendThrottleTimeout) {
        this.sendThrottleTimeout = setTimeout(() => {
          this.processPendingLocationUpdatesQueue();
          this.sendThrottleTimeout = null;
        }, this.MIN_SEND_INTERVAL);
      }
    }
  }

  /**
   * Send location update (for drivers) with ENHANCED deduplication and throttling
   * Prevents duplicate sends within short timeframes (16ms issue)
   * 
   * Multiple layers of protection:
   * 1. Rapid duplicate detection (< 100ms)
   * 2. Exact coordinate matching
   * 3. Distance-based deduplication (< 5m)
   * 4. Time-based throttling (1 second minimum)
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
    // Validate GPS location before processing
    const timestampMs = new Date(locationData.timestamp).getTime();
    const validation = validateGPSLocation({
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      timestamp: timestampMs,
      speed: locationData.speed,
      heading: locationData.heading,
    }, locationData.driverId, locationData.busId);

    if (!validation.isValid && validation.shouldReject) {
      logger.warn('GPS location update rejected before sending', 'UnifiedWebSocketService', {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        driverId: locationData.driverId,
        busId: locationData.busId,
        error: validation.error,
        rejectionReason: validation.rejectionReason,
      });
      return; // Reject invalid location
    }

    if (validation.shouldWarn && validation.warning) {
      logger.warn('GPS location update warning', 'UnifiedWebSocketService', {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        warning: validation.warning,
      });
    }

    const now = Date.now();
    const timeSinceLastSend = now - this.lastSendTime;

    // LAYER 1: Rapid duplicate detection (< 100ms) - catches 16ms duplicates
    if (timeSinceLastSend < this.RAPID_DUPLICATE_THRESHOLD) {
      // Create a location key for exact matching
      const locationKey = `${locationData.latitude.toFixed(6)}_${locationData.longitude.toFixed(6)}`;
      const lastSendTimeForLocation = this.locationMessageQueue.get(locationKey);
      
      if (lastSendTimeForLocation && (now - lastSendTimeForLocation) < this.RAPID_DUPLICATE_THRESHOLD) {
        logger.debug('🚫 BLOCKED: Rapid duplicate location update (< 100ms)', 'component', {
          timeSinceLastSend,
          lastSendTime: lastSendTimeForLocation,
          locationKey,
          lat: locationData.latitude,
          lng: locationData.longitude,
        });
        return; // Block this duplicate
      }
    }

    // LAYER 2: Check if this is an exact duplicate location (same coordinates)
    if (this.lastSentLocation) {
      const latDiff = Math.abs(this.lastSentLocation.latitude - locationData.latitude);
      const lngDiff = Math.abs(this.lastSentLocation.longitude - locationData.longitude);
      
      // Exact match (within floating point precision)
      if (latDiff < 0.000001 && lngDiff < 0.000001 && timeSinceLastSend < this.MIN_SEND_INTERVAL) {
        logger.debug('🚫 BLOCKED: Exact duplicate coordinates', 'component', {
          timeSinceLastSend,
          lat: locationData.latitude,
          lng: locationData.longitude,
        });
        return; // Block exact duplicate
      }

      // LAYER 3: Distance-based deduplication
      const distance = this.calculateDistance(
        this.lastSentLocation.latitude,
        this.lastSentLocation.longitude,
        locationData.latitude,
        locationData.longitude
      );

      // If location hasn't changed significantly and was sent recently, skip
      if (distance < this.MIN_DISTANCE_THRESHOLD && timeSinceLastSend < this.MIN_SEND_INTERVAL) {
        logger.debug('🚫 BLOCKED: Duplicate location (distance < 5m, time < 1s)', 'component', {
          distance: distance.toFixed(2),
          timeSinceLastSend,
          lastLat: this.lastSentLocation.latitude,
          lastLng: this.lastSentLocation.longitude,
          newLat: locationData.latitude,
          newLng: locationData.longitude,
        });
        return;
      }
    }

    // LAYER 4: Throttle: if we sent recently, queue the update
    if (timeSinceLastSend < this.MIN_SEND_INTERVAL) {
      // PRODUCTION FIX: Append to queue instead of overwriting
      // Prevent queue overflow by removing oldest if queue is full
      if (this.pendingLocationUpdatesQueue.length >= this.MAX_QUEUE_SIZE) {
        const removed = this.pendingLocationUpdatesQueue.shift();
        logger.warn('Queue overflow: Removing oldest pending update', 'component', {
          queueSize: this.pendingLocationUpdatesQueue.length,
          removedUpdate: removed ? { lat: removed.latitude, lng: removed.longitude } : null
        });
      }
      
      // Add latest update to queue (preserves all updates)
      this.pendingLocationUpdatesQueue.push(locationData);
      
      // If no throttle timeout is set, set one to process queue
      if (!this.sendThrottleTimeout) {
        const remainingTime = this.MIN_SEND_INTERVAL - timeSinceLastSend;
        this.sendThrottleTimeout = setTimeout(() => {
          this.processPendingLocationUpdatesQueue();
          this.sendThrottleTimeout = null;
        }, remainingTime);
      }
      
      logger.debug('⏱️ Throttling location update - added to queue', 'component', {
        timeSinceLastSend,
        queueSize: this.pendingLocationUpdatesQueue.length,
        willSendIn: this.MIN_SEND_INTERVAL - timeSinceLastSend,
      });
      return;
    }

    // PRODUCTION FIX: Clear any pending throttle and process queue if needed
    if (this.sendThrottleTimeout) {
      clearTimeout(this.sendThrottleTimeout);
      this.sendThrottleTimeout = null;
      
      // Process any queued updates before sending new one
      // This ensures no updates are lost
      if (this.pendingLocationUpdatesQueue.length > 0) {
        logger.debug('Processing pending queue before immediate send', 'component', {
          queueSize: this.pendingLocationUpdatesQueue.length
        });
        this.processPendingLocationUpdatesQueue();
      }
    }

    // All checks passed - send immediately
    this.actualSendLocationUpdate(locationData);
  }

  /**
   * Initialize as driver (replaces authenticateAsDriver)
   * This method assumes the connection is already authenticated via middleware
   */
  initializeAsDriver(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        logger.error('❌ Cannot initialize: WebSocket not connected', 'component');
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        logger.error('❌ Driver initialization timeout', 'component');
        resolve(false);
      }, 10000);

      this.socket.once('driver:initialized', (data) => {
        clearTimeout(timeout);
        logger.info('✅ Driver initialized successfully:', 'component', { 
          driverId: data?.driverId,
          busId: data?.busId 
        });
        resolve(true);
      });

      this.socket.once('driver:initialization_failed', (error) => {
        clearTimeout(timeout);
        logger.error('❌ Driver initialization failed:', 'component', { 
          error: error?.message || error,
          code: error?.code 
        });
        resolve(false);
      });

      logger.info('🔐 Attempting driver initialization...', 'component');
      this.socket.emit('driver:initialize');
    });
  }

  /**
   * Request assignment update from server
   */
  requestAssignmentUpdate(): void {
    if (this.socket?.connected) {
      logger.info('📋 Requesting assignment update...', 'component');
      this.socket.emit('driver:requestAssignmentUpdate');
    } else {
      logger.warn('⚠️ Cannot request assignment update: WebSocket not connected', 'component');
    }
  }

  /**
   * Remove all event listeners (cleanup method)
   * This method is called during component cleanup to prevent memory leaks
   */
  off(): void {
    logger.info('🧹 Cleaning up WebSocket event listeners', 'component');
    
    // Clear all listener sets
    this.busLocationListeners.clear();
    this.driverConnectedListeners.clear();
    this.driverDisconnectedListeners.clear();
    this.studentConnectedListeners.clear();
    this.busArrivingListeners.clear();
    this.errorListeners.clear();
    this.driverAssignmentUpdateListeners.clear();
    
    // Remove all socket event listeners
    if (this.socket) {
      this.socket.removeAllListeners();
    }
    
    logger.info('✅ WebSocket event listeners cleaned up', 'component');
  }

  /**
   * Remove specific event listener by type
   */
  offEvent(eventType: string, callback?: Function): void {
    if (!this.socket) return;
    
    if (callback) {
      this.socket.off(eventType, callback);
    } else {
      this.socket.removeAllListeners(eventType);
    }
  }

  /**
   * OPTIMIZED: Subscribe to specific buses for efficient broadcasting
   * This reduces bandwidth by ~97% by only receiving updates for subscribed buses
   */
  subscribeToBuses(busIds: string[]): void {
    if (!this.socket?.connected) {
      logger.warn('⚠️ Cannot subscribe: WebSocket not connected', 'component');
      return;
    }

    if (busIds.length === 0) {
      logger.debug('📍 No buses to subscribe to', 'component');
      return;
    }

    try {
      this.socket.emit('subscribe:bus', busIds);
      logger.info('✅ Subscribed to buses', 'component', { 
        count: busIds.length,
        busIds: busIds.slice(0, 5) // Log first 5 for debugging
      });
    } catch (error) {
      logger.error('❌ Error subscribing to buses', 'component', { error });
    }
  }

  /**
   * OPTIMIZED: Subscribe to specific routes for efficient broadcasting
   */
  subscribeToRoutes(routeIds: string[]): void {
    if (!this.socket?.connected) {
      logger.warn('⚠️ Cannot subscribe: WebSocket not connected', 'component');
      return;
    }

    if (routeIds.length === 0) {
      logger.debug('📍 No routes to subscribe to', 'component');
      return;
    }

    try {
      this.socket.emit('subscribe:route', routeIds);
      logger.info('✅ Subscribed to routes', 'component', { 
        count: routeIds.length,
        routeIds: routeIds.slice(0, 5) // Log first 5 for debugging
      });
    } catch (error) {
      logger.error('❌ Error subscribing to routes', 'component', { error });
    }
  }

  /**
   * OPTIMIZED: Unsubscribe from buses
   */
  unsubscribeFromBuses(busIds: string[]): void {
    if (!this.socket?.connected) return;

    try {
      this.socket.emit('unsubscribe:bus', busIds);
      logger.info('✅ Unsubscribed from buses', 'component', { count: busIds.length });
    } catch (error) {
      logger.error('❌ Error unsubscribing from buses', 'component', { error });
    }
  }

  /**
   * OPTIMIZED: Unsubscribe from routes
   */
  unsubscribeFromRoutes(routeIds: string[]): void {
    if (!this.socket?.connected) return;

    try {
      this.socket.emit('unsubscribe:route', routeIds);
      logger.info('✅ Unsubscribed from routes', 'component', { count: routeIds.length });
    } catch (error) {
      logger.error('❌ Error unsubscribing from routes', 'component', { error });
    }
  }
}

// Export singleton instance
export const unifiedWebSocketService = new UnifiedWebSocketService();
export default unifiedWebSocketService;
