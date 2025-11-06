/**
 * Unified WebSocket Service - PRODUCTION REFACTORED
 * Eliminates race conditions and simplifies connection management
 * Industry-grade WebSocket implementation with atomic operations
 */

import { Socket } from 'socket.io-client';
import { logger } from '../utils/logger';
import { connectionManager, ConnectionState, ConnectionStats } from './websocket/connectionManager';
import { subscriptionManager } from './websocket/subscriptionManager';
import { locationThrottler, LocationUpdateData } from './websocket/locationThrottler';

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

// ConnectionState and ConnectionStats exported from connectionManager

class UnifiedWebSocketService {
  // Simplified authentication state
  private authenticationState: {
    isAuthenticated: boolean;
    userId?: string;
    userRole?: string;
  } = { isAuthenticated: false };

  // Event listeners with proper cleanup
  private busLocationListeners: Set<(location: BusLocation) => void> = new Set();
  private driverConnectedListeners: Set<(data: any) => void> = new Set();
  private driverDisconnectedListeners: Set<(data: any) => void> = new Set();
  private studentConnectedListeners: Set<() => void> = new Set();
  private busArrivingListeners: Set<(data: any) => void> = new Set();
  private errorListeners: Set<(error: any) => void> = new Set();
  private driverAssignmentUpdateListeners: Set<(data: any) => void> = new Set();
  // PRODUCTION FIX: Route stop reached listeners for real-time student map updates
  private routeStopReachedListeners: Set<(data: {
    routeId: string;
    stopId: string;
    driverId: string;
    lastStopSequence: number;
    routeStatus: {
      tracking_active: boolean;
      stops: { completed: any[]; next: any | null; remaining: any[] };
    };
    timestamp: string;
  }) => void> = new Set();

  constructor() {
    // Setup connection state listener to update authentication state
    connectionManager.onConnectionStateChange((state) => {
      // Update authentication state based on connection state
      this.authenticationState.isAuthenticated = state.isAuthenticated;
    });
  }

  /**
   * Set client type for proper authentication
   */
  setClientType(type: 'student' | 'driver' | 'admin'): void {
    connectionManager.setClientType(type);
  }

  /**
   * Reset service state for reconnection
   */
  resetState(): void {
    connectionManager.resetState();
    locationThrottler.reset();
  }

  /**
   * Atomic connection with race condition elimination
   */
  async connect(): Promise<void> {
    try {
      await connectionManager.connect();
      const socket = connectionManager.getSocket();
      if (socket) {
        subscriptionManager.setSocket(socket);
        this.setupEventListeners();
        this.handleConnect();
      }
    } catch (error) {
      logger.error('❌ WebSocket connection failed', 'component', { error });
      throw error;
    }
  }

  /**
   * Simplified disconnect
   */
  disconnect(): void {
    connectionManager.disconnect();
    subscriptionManager.setSocket(null);
    this.authenticationState = { isAuthenticated: false };
  }

  /**
   * Simplified event listener setup
   */
  private setupEventListeners(): void {
    const socket = connectionManager.getSocket();
    if (!socket) return;

    // Core connection events
    socket.on('connect', this.handleConnect.bind(this));
    socket.on('disconnect', this.handleDisconnect.bind(this));
    socket.on('connect_error', this.handleConnectionError.bind(this));
    socket.on('error', this.handleError.bind(this));

    // Business logic events
    socket.on('bus:locationUpdate', (location: BusLocation) => {
      logger.info('📍 DETAILED DEBUG: Bus location update received in WebSocket service', 'component', {
        busId: location.busId,
        busIdType: typeof location.busId,
        busIdLength: location.busId?.length,
        busIdString: String(location.busId),
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        listenersCount: this.busLocationListeners.size,
        fullLocationData: location
      });
      
      // Notify all registered listeners
      this.busLocationListeners.forEach(listener => {
        try {
          listener(location);
        } catch (listenerError) {
          logger.error('Error in bus location listener', 'component', {
            error: listenerError instanceof Error ? listenerError.message : String(listenerError)
          });
        }
      });
    });

    // Authentication events
    socket.on('student:connected', (data?: { timestamp?: string; userId?: string }) => {
      logger.info('🎓 Student authenticated successfully', 'component', { data });
      this.authenticationState = { 
        isAuthenticated: true, 
        userId: data?.userId,
        userRole: 'student'
      };
      connectionManager.updateConnectionState('connected');
      
      this.studentConnectedListeners.forEach(listener => listener());
    });

    // Driver events
    socket.on('driver:connected', (data: any) => {
      logger.debug('🚌 Driver connected:', 'component', { data });
      this.driverConnectedListeners.forEach(listener => listener(data));
    });

    socket.on('driver:disconnected', (data: any) => {
      logger.debug('🚌 Driver disconnected:', 'component', { data });
      this.driverDisconnectedListeners.forEach(listener => listener(data));
    });

    // Other events
    socket.on('bus:arriving', (data: any) => {
      logger.debug('🚌 Bus arriving:', 'component', { data });
      this.busArrivingListeners.forEach(listener => listener(data));
    });

    socket.on('driver:assignmentUpdate', (data: any) => {
      logger.info('📋 Driver assignment update received:', 'component', { 
        type: data.type,
        hasAssignment: !!data.assignment 
      });
      this.driverAssignmentUpdateListeners.forEach(listener => listener(data));
    });

    // PRODUCTION FIX: Route stop reached event for real-time student map updates
    socket.on('route:stopReached', (data: {
      routeId: string;
      stopId: string;
      driverId: string;
      lastStopSequence: number;
      routeStatus: {
        tracking_active: boolean;
        stops: { completed: any[]; next: any | null; remaining: any[] };
      };
      timestamp: string;
    }) => {
      logger.info('🛑 Route stop reached event received', 'component', {
        routeId: data.routeId,
        stopId: data.stopId,
        driverId: data.driverId,
        lastStopSequence: data.lastStopSequence,
        listenersCount: this.routeStopReachedListeners.size
      });
      this.routeStopReachedListeners.forEach(listener => {
        try {
          listener(data);
        } catch (listenerError) {
          logger.error('Error in route stop reached listener', 'component', {
            error: listenerError instanceof Error ? listenerError.message : String(listenerError)
          });
        }
      });
    });
  }

  /**
   * Simplified connection handler
   */
  private handleConnect(): void {
    logger.info('✅ WebSocket connected successfully', 'component');
    
    connectionManager.updateConnectionState('connected');
    connectionManager.resetReconnectAttempts();
    connectionManager.startHeartbeat();

    const socket = connectionManager.getSocket();
    const clientType = connectionManager.getClientType();
    
    // Emit appropriate connection event based on client type
    try {
      if (clientType === 'student') {
        logger.info('🎓 Emitting student:connect for authentication', 'component');
        socket?.emit('student:connect');
      } else if (clientType === 'driver') {
        socket?.emit('driver:connect');
      } else if (clientType === 'admin') {
        socket?.emit('admin:connect');
      }
    } catch (emitError) {
      logger.warn('⚠️ Error emitting connection event', 'component', { error: emitError });
    }
  }

  /**
   * Simplified disconnect handler
   */
  private handleDisconnect(reason: string): void {
    logger.debug('🔌 WebSocket disconnected:', 'component', { reason });
    
    connectionManager.updateConnectionState('disconnected');
    this.authenticationState = { isAuthenticated: false };
    connectionManager.stopHeartbeat();

    // Attempt reconnection if not shutting down
    if (connectionManager.shouldAttemptReconnection()) {
      connectionManager.attemptReconnection(() => this.connect());
    }
  }

  /**
   * Simplified error handler
   */
  private handleConnectionError(error: Error): void {
    logger.error('❌ WebSocket connection error', 'component', { error: error.message });
    connectionManager.updateConnectionState('error', error.message);

    // Attempt reconnection if not shutting down
    if (connectionManager.shouldAttemptReconnection()) {
      connectionManager.attemptReconnection(() => this.connect());
    }
  }

  /**
   * Simplified general error handler
   */
  private handleError(error: Error): void {
    logger.error('❌ WebSocket error', 'component', { error: error.message });
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        logger.error('Error in error listener', 'component', { error: listenerError });
      }
    });
  }

  /**
   * Simplified connection status check
   */
  getConnectionStatus(): boolean {
    return connectionManager.getConnectionStatus();
  }

  /**
   * Simplified connection statistics
   */
  getConnectionStats(): ConnectionStats {
    return connectionManager.getConnectionStats();
  }

  /**
   * Event-driven connection state subscription
   */
  onConnectionStateChange(listener: (state: { 
    isConnected: boolean; 
    isAuthenticated: boolean; 
    connectionState: ConnectionState;
    error?: string;
  }) => void): () => void {
    return connectionManager.onConnectionStateChange((state) => {
      listener({
        ...state,
        isAuthenticated: this.authenticationState.isAuthenticated,
      });
    });
  }

  /**
   * PRODUCTION FIX: Simplified authentication status check
   */
  isAuthenticated(): boolean {
    return this.authenticationState.isAuthenticated;
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
   * PRODUCTION FIX: Listen for route stop reached events
   * Used by student map to update route status in real-time
   */
  onRouteStopReached(callback: (data: {
    routeId: string;
    stopId: string;
    driverId: string;
    lastStopSequence: number;
    routeStatus: {
      tracking_active: boolean;
      stops: { completed: any[]; next: any | null; remaining: any[] };
    };
    timestamp: string;
  }) => void): () => void {
    this.routeStopReachedListeners.add(callback);
    return () => this.routeStopReachedListeners.delete(callback);
  }

  /**
   * Send location update (for drivers) with throttling and deduplication
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
    const socket = connectionManager.getSocket();
    if (!socket?.connected) {
      logger.error('❌ Cannot send location update: WebSocket not connected', 'component');
      return;
    }

    // Use location throttler to process the update
    locationThrottler.processLocationUpdate(
      locationData as LocationUpdateData,
      (data) => {
        logger.info('📤 Emitting location update via WebSocket', 'component', {
          driverId: data.driverId,
          busId: data.busId,
          lat: data.latitude,
          lng: data.longitude,
          timestamp: data.timestamp,
        });
        socket.emit('driver:locationUpdate', data);
      }
    );
  }

  /**
   * Initialize as driver (replaces authenticateAsDriver)
   * This method assumes the connection is already authenticated via middleware
   */
  initializeAsDriver(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = connectionManager.getSocket();
      if (!socket?.connected) {
        logger.error('❌ Cannot initialize: WebSocket not connected', 'component');
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        logger.error('❌ Driver initialization timeout', 'component');
        resolve(false);
      }, 10000);

      socket.once('driver:initialized', (data) => {
        clearTimeout(timeout);
        logger.info('✅ Driver initialized successfully:', 'component', { 
          driverId: data?.driverId,
          busId: data?.busId 
        });
        resolve(true);
      });

      socket.once('driver:initialization_failed', (error) => {
        clearTimeout(timeout);
        logger.error('❌ Driver initialization failed:', 'component', { 
          error: error?.message || error,
          code: error?.code 
        });
        resolve(false);
      });

      logger.info('🔐 Attempting driver initialization...', 'component');
      socket.emit('driver:initialize');
    });
  }

  /**
   * Request assignment update from server
   */
  requestAssignmentUpdate(): void {
    const socket = connectionManager.getSocket();
    if (socket?.connected) {
      logger.info('📋 Requesting assignment update...', 'component');
      socket.emit('driver:requestAssignmentUpdate');
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
    const socket = connectionManager.getSocket();
    if (socket) {
      socket.removeAllListeners();
    }
    
    logger.info('✅ WebSocket event listeners cleaned up', 'component');
  }

  /**
   * Remove specific event listener by type
   */
  offEvent(eventType: string, callback?: (...args: any[]) => void): void {
    const socket = connectionManager.getSocket();
    if (!socket) return;
    
    if (callback) {
      socket.off(eventType, callback);
    } else {
      socket.removeAllListeners(eventType);
    }
  }

  /**
   * Subscribe to specific buses for efficient broadcasting
   */
  subscribeToBuses(busIds: string[]): void {
    subscriptionManager.subscribeToBuses(busIds);
  }

  /**
   * Subscribe to specific routes for efficient broadcasting
   */
  subscribeToRoutes(routeIds: string[]): void {
    subscriptionManager.subscribeToRoutes(routeIds);
  }

  /**
   * Unsubscribe from buses
   */
  unsubscribeFromBuses(busIds: string[]): void {
    subscriptionManager.unsubscribeFromBuses(busIds);
  }

  /**
   * Unsubscribe from routes
   */
  unsubscribeFromRoutes(routeIds: string[]): void {
    subscriptionManager.unsubscribeFromRoutes(routeIds);
  }
}

// Export singleton instance
export const unifiedWebSocketService = new UnifiedWebSocketService();
export default unifiedWebSocketService;
