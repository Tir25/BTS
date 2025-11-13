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
import type {
  DriverConnectedData,
  DriverDisconnectedData,
  BusArrivingData,
  DriverAssignmentUpdateData,
  RouteStopReachedData,
  WebSocketError,
  LocationRateLimitedData,
  LocationConfirmedData
} from './websocket/types';

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
  private driverConnectedListeners: Set<(data: DriverConnectedData) => void> = new Set();
  private driverDisconnectedListeners: Set<(data: DriverDisconnectedData) => void> = new Set();
  private studentConnectedListeners: Set<() => void> = new Set();
  private busArrivingListeners: Set<(data: BusArrivingData) => void> = new Set();
  private errorListeners: Set<(error: WebSocketError) => void> = new Set();
  private driverAssignmentUpdateListeners: Set<(data: DriverAssignmentUpdateData) => void> = new Set();
  // PRODUCTION FIX: Route stop reached listeners for real-time student map updates
  private routeStopReachedListeners: Set<(data: RouteStopReachedData) => void> = new Set();
  // PRODUCTION FIX: Location update feedback listeners
  private locationRateLimitedListeners: Set<(data: LocationRateLimitedData) => void> = new Set();
  private locationConfirmedListeners: Set<(data: LocationConfirmedData) => void> = new Set();
  
  // CRITICAL FIX: Track if event listeners have been set up to prevent duplicates
  private eventListenersSetup: boolean = false;

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
   * PRODUCTION FIX: No duplicate error logging - errors logged only in connectionManager
   */
  async connect(): Promise<void> {
    // Ensure client type is set before connecting
    const currentClientType = connectionManager.getClientType();
    if (!currentClientType) {
      logger.debug('Client type not set, defaulting to student', 'component');
      connectionManager.setClientType('student');
    }
    
    logger.debug('Initiating WebSocket connection...', 'component', {
      clientType: connectionManager.getClientType()
    });
    
    try {
      await connectionManager.connect();
      const socket = connectionManager.getSocket();
      if (socket) {
        (socket as any).clientType = connectionManager.getClientType();
        
        subscriptionManager.setSocket(socket);
        this.setupEventListeners();
        this.handleConnect();
        
        logger.debug('WebSocket connection established successfully', 'component', {
          clientType: connectionManager.getClientType(),
          socketId: socket.id
        });
      } else {
        // PRODUCTION FIX: Don't log here - let connectionManager handle it
        throw new Error('Socket not available after connection');
      }
    } catch (error) {
      // PRODUCTION FIX: Don't log error here - already logged in connectionManager
      // Just update state and rethrow
      const errorMessage = error instanceof Error ? error.message : String(error);
      connectionManager.updateConnectionState('error', errorMessage);
      throw error;
    }
  }

  /**
   * Simplified disconnect
   * CRITICAL FIX: Reset event listeners flag on disconnect
   * PRODUCTION FIX: Enhanced cleanup to prevent memory leaks
   * PRODUCTION FIX: Only log if actually disconnecting (not already disconnected)
   */
  disconnect(): void {
    const socket = connectionManager.getSocket();
    const isConnected = socket?.connected || false;
    
    // PRODUCTION FIX: Only log if we're actually disconnecting an active connection
    // This prevents log spam from multiple disconnect calls
    if (isConnected) {
    logger.info('🔌 Disconnecting WebSocket service...', 'component');
    } else {
      logger.debug('WebSocket already disconnected, skipping disconnect', 'component');
      return; // Early return if already disconnected
    }
    
    // Remove all event listeners before disconnecting
    if (socket) {
      // CRITICAL FIX: Remove all listeners individually to ensure cleanup
      socket.removeAllListeners('connect');
      socket.removeAllListeners('disconnect');
      socket.removeAllListeners('connect_error');
      socket.removeAllListeners('error');
      socket.removeAllListeners('bus:locationUpdate');
      socket.removeAllListeners('student:connected');
      socket.removeAllListeners('driver:connected');
      socket.removeAllListeners('driver:disconnected');
      socket.removeAllListeners('bus:arriving');
      socket.removeAllListeners('driver:assignmentUpdate');
      socket.removeAllListeners('route:stopReached');
      socket.removeAllListeners('driver:initialized');
      socket.removeAllListeners('driver:initialization_failed');
      socket.removeAllListeners('ping');
      socket.removeAllListeners('pong');
      
      // Final cleanup - remove any remaining listeners
      socket.removeAllListeners();
      this.eventListenersSetup = false;
    }
    
    // Clear all listener sets to prevent memory leaks
    this.busLocationListeners.clear();
    this.driverConnectedListeners.clear();
    this.driverDisconnectedListeners.clear();
    this.studentConnectedListeners.clear();
    this.busArrivingListeners.clear();
    this.errorListeners.clear();
    this.driverAssignmentUpdateListeners.clear();
    this.routeStopReachedListeners.clear();
    
    connectionManager.disconnect();
    subscriptionManager.setSocket(null);
    this.authenticationState = { isAuthenticated: false };
    
    // Notify listeners of disconnection
    this.notifyConnectionStateListeners();
    
    // PRODUCTION FIX: Only log success if we actually disconnected
    if (isConnected) {
    logger.info('✅ WebSocket service disconnected and cleaned up', 'component');
    }
  }

  /**
   * Simplified event listener setup
   * CRITICAL FIX: Removes old listeners before adding new ones to prevent duplicates
   */
  private setupEventListeners(): void {
    const socket = connectionManager.getSocket();
    if (!socket) return;

    // CRITICAL FIX: Remove all existing listeners first to prevent duplicates
    // This is especially important for error handlers which were firing multiple times
    if (this.eventListenersSetup) {
      logger.debug('Removing existing WebSocket event listeners before re-setup', 'component');
      socket.removeAllListeners('connect');
      socket.removeAllListeners('disconnect');
      socket.removeAllListeners('connect_error');
      socket.removeAllListeners('error');
      socket.removeAllListeners('bus:locationUpdate');
      socket.removeAllListeners('student:connected');
      socket.removeAllListeners('driver:connected');
      socket.removeAllListeners('driver:disconnected');
      socket.removeAllListeners('bus:arriving');
      socket.removeAllListeners('driver:assignmentUpdate');
      socket.removeAllListeners('route:stopReached');
      socket.removeAllListeners('driver:locationRateLimited');
      socket.removeAllListeners('driver:locationConfirmed');
    }

    // Core connection events
    socket.on('connect', this.handleConnect.bind(this));
    socket.on('disconnect', this.handleDisconnect.bind(this));
    socket.on('connect_error', this.handleConnectionError.bind(this));
    socket.on('error', this.handleError.bind(this));
    
    // Mark listeners as set up
    this.eventListenersSetup = true;

    // Business logic events
    socket.on('bus:locationUpdate', (location: BusLocation) => {
      // PRODUCTION: Changed from logger.info to logger.debug for verbose location updates
      // This reduces log noise in production while still allowing debug when needed
      logger.debug('📍 Bus location update received', 'component', {
        busId: location.busId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        listenersCount: this.busLocationListeners.size
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
      // Notify listeners of authentication state change
      this.notifyConnectionStateListeners();
      
      this.studentConnectedListeners.forEach(listener => listener());
    });

    // Driver events
    socket.on('driver:connected', (data: DriverConnectedData) => {
      logger.debug('🚌 Driver connected:', 'component', { data });
      this.driverConnectedListeners.forEach(listener => listener(data));
    });

    socket.on('driver:disconnected', (data: DriverDisconnectedData) => {
      logger.debug('🚌 Driver disconnected:', 'component', { data });
      this.driverDisconnectedListeners.forEach(listener => listener(data));
    });

    // Other events
    socket.on('bus:arriving', (data: BusArrivingData) => {
      logger.debug('🚌 Bus arriving:', 'component', { data });
      this.busArrivingListeners.forEach(listener => listener(data));
    });

    socket.on('driver:assignmentUpdate', (data: DriverAssignmentUpdateData) => {
      logger.info('📋 Driver assignment update received:', 'component', { 
        type: data.type,
        hasAssignment: !!data.assignment 
      });
      this.driverAssignmentUpdateListeners.forEach(listener => listener(data));
    });

    // PRODUCTION FIX: Route stop reached event for real-time student map updates
    socket.on('route:stopReached', (data: RouteStopReachedData) => {
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

    // PRODUCTION FIX: Location update feedback events
    socket.on('driver:locationRateLimited', (data: LocationRateLimitedData) => {
      logger.debug('⏱️ Location update rate limited by backend', 'component', {
        timestamp: data.timestamp,
        nextAllowedTime: data.nextAllowedTime,
        waitTimeMs: data.waitTimeMs,
        reason: data.reason,
        listenersCount: this.locationRateLimitedListeners.size,
      });
      this.locationRateLimitedListeners.forEach(listener => {
        try {
          listener(data);
        } catch (listenerError) {
          logger.error('Error in location rate limited listener', 'component', {
            error: listenerError instanceof Error ? listenerError.message : String(listenerError)
          });
        }
      });
    });

    socket.on('driver:locationConfirmed', (data: LocationConfirmedData) => {
      logger.debug('✅ Location update confirmed by backend', 'component', {
        timestamp: data.timestamp,
        locationId: data.locationId,
        listenersCount: this.locationConfirmedListeners.size,
      });
      this.locationConfirmedListeners.forEach(listener => {
        try {
          listener(data);
        } catch (listenerError) {
          logger.error('Error in location confirmed listener', 'component', {
            error: listenerError instanceof Error ? listenerError.message : String(listenerError)
          });
        }
      });
    });
  }

  /**
   * Simplified connection handler
   * PRODUCTION FIX: Removed driver:connect emit - backend doesn't handle it
   * Only driver:initialize is needed after connection is established
   */
  private handleConnect(): void {
    logger.info('✅ WebSocket connected successfully', 'component');
    
    connectionManager.updateConnectionState('connected');
    connectionManager.resetReconnectAttempts();
    connectionManager.startHeartbeat();

    const socket = connectionManager.getSocket();
    const clientType = connectionManager.getClientType();
    
    // Emit appropriate connection event based on client type
    // NOTE: driver:connect is not handled by backend - only driver:initialize is needed
    try {
      if (clientType === 'student') {
        logger.info('🎓 Emitting student:connect for authentication', 'component');
        socket?.emit('student:connect');
      } else if (clientType === 'admin') {
        socket?.emit('admin:connect');
      }
      // Driver connections don't need a connect event - they use initializeAsDriver() instead
    } catch (emitError) {
      logger.warn('⚠️ Error emitting connection event', 'component', { error: emitError });
    }
  }

  /**
   * Simplified disconnect handler
   * PRODUCTION FIX: Enhanced disconnect handling with better reconnection logic
   */
  private handleDisconnect(reason: string): void {
    logger.debug('🔌 WebSocket disconnected:', 'component', { reason });
    
    connectionManager.updateConnectionState('disconnected');
    this.authenticationState = { isAuthenticated: false };
    connectionManager.stopHeartbeat();

    // Determine if this is a voluntary disconnect or network issue
    const isVoluntaryDisconnect = 
      reason === 'io client disconnect' || 
      reason === 'io server disconnect' ||
      reason === 'transport close' && reason.includes('client');

    // Only attempt reconnection for unexpected disconnects
    if (!isVoluntaryDisconnect && connectionManager.shouldAttemptReconnection()) {
      logger.info('🔄 Attempting automatic reconnection after unexpected disconnect', 'component', {
        reason,
        clientType: connectionManager.getClientType()
      });
      connectionManager.attemptReconnection(() => this.connect());
    } else if (isVoluntaryDisconnect) {
      logger.info('🔌 Voluntary disconnect - not attempting reconnection', 'component', { reason });
    } else {
      logger.warn('⚠️ Max reconnection attempts reached or shutdown in progress', 'component', {
        reason,
        shouldAttempt: connectionManager.shouldAttemptReconnection()
      });
    }
  }

  /**
   * Simplified error handler
   * PRODUCTION FIX: Enhanced error handling with better recovery and duplicate prevention
   */
  private handleConnectionError(error: Error): void {
    const errorMessage = error.message || 'Unknown connection error';
    
    // PRODUCTION FIX: Prevent duplicate error logging
    // Only log if this is a new error (not already in error state)
    const currentState = connectionManager.getConnectionState();
    const errorCode = (error as any)?.code || '';
    const isAuthError = (error as any)?.isAuthError || false;
    const isNetworkError = (error as any)?.isNetworkError || false;
    const originalError = (error as any)?.originalError || errorMessage;
    
    // PRODUCTION FIX: Log full error details to console for visibility
    if (currentState !== 'error') {
      console.error('❌ WebSocket connection error in UnifiedWebSocketService:', {
        message: errorMessage,
        originalError,
        errorCode,
        isAuthError,
        isNetworkError,
        clientType: connectionManager.getClientType(),
        error: error instanceof Error ? error : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fullError: error
      });
      
      logger.error('❌ WebSocket connection error', 'component', { 
        error: errorMessage,
        originalError,
        errorCode,
        isAuthError,
        isNetworkError,
        clientType: connectionManager.getClientType(),
        stack: error instanceof Error ? error.stack : undefined,
        fullErrorDetails: error
      });
    } else {
      logger.debug('WebSocket connection error (already in error state)', 'component', { 
        error: errorMessage,
        originalError,
        errorCode,
        isAuthError,
        isNetworkError,
        clientType: connectionManager.getClientType()
      });
    }
    
    connectionManager.updateConnectionState('error', errorMessage);

    // Determine if error is recoverable
    const isRecoverableError = 
      !errorMessage.includes('Authentication') &&
      !errorMessage.includes('Unauthorized') &&
      !errorMessage.includes('Forbidden') &&
      !errorMessage.includes('SERVER_NOT_RUNNING');

    // PRODUCTION FIX: Don't attempt reconnection if server is not running
    // This prevents infinite reconnection attempts when backend is down
    const isServerDown = 
      errorMessage.includes('SERVER_NOT_RUNNING') ||
      errorMessage.includes('not accessible') ||
      errorMessage.includes('not running');

    // Attempt reconnection only for recoverable errors and not when server is down
    if (isRecoverableError && !isServerDown && connectionManager.shouldAttemptReconnection()) {
      logger.info('🔄 Attempting reconnection after recoverable error', 'component', {
        error: errorMessage,
        clientType: connectionManager.getClientType()
      });
      connectionManager.attemptReconnection(() => this.connect());
    } else {
      logger.warn('⚠️ Not attempting reconnection', 'component', {
        error: errorMessage,
        isRecoverable: isRecoverableError,
        isServerDown,
        shouldAttempt: connectionManager.shouldAttemptReconnection()
      });
    }
  }

  /**
   * Simplified general error handler
   * CRITICAL FIX: Enhanced error logging to help diagnose issues
   */
  private handleError(error: Error | WebSocketError | unknown): void {
    // Handle different error types
    let errorData: WebSocketError;
    if (error instanceof Error) {
      errorData = { message: error.message };
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorData = error as WebSocketError;
    } else {
      errorData = { message: String(error || 'Unknown WebSocket error') };
    }
    
    // CRITICAL FIX: Only log actual errors, not connection state changes
    // Socket.IO sometimes emits 'error' events for non-critical issues
    const isNonCriticalError = 
      errorData.message?.includes('transport close') ||
      errorData.message?.includes('ping timeout') ||
      errorData.message?.includes('xhr poll error') ||
      errorData.code === 'transport_error';
    
    if (isNonCriticalError) {
      logger.debug('WebSocket transport event (non-critical)', 'component', { 
        error: errorData.message, 
        code: errorData.code 
      });
    } else {
      logger.error('❌ WebSocket error', 'component', { 
        error: errorData.message, 
        code: errorData.code,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    
    // Only notify listeners for actual errors, not transport events
    if (!isNonCriticalError) {
      this.errorListeners.forEach(listener => {
        try {
          listener(errorData);
        } catch (listenerError) {
          logger.error('Error in error listener', 'component', { error: listenerError });
        }
      });
    }
  }

  /**
   * Simplified connection status check
   * PRODUCTION FIX: Enhanced to include authentication state
   */
  getConnectionStatus(): boolean {
    const isConnected = connectionManager.getConnectionStatus();
    // For drivers, also check authentication state
    if (isConnected && connectionManager.getClientType() === 'driver') {
      return this.authenticationState.isAuthenticated;
    }
    return isConnected;
  }

  /**
   * Simplified connection statistics
   * PRODUCTION FIX: Enhanced to include authentication state
   */
  getConnectionStats(): ConnectionStats & { isAuthenticated: boolean } {
    const stats = connectionManager.getConnectionStats();
    return {
      ...stats,
      isAuthenticated: this.authenticationState.isAuthenticated,
    };
  }

  /**
   * Event-driven connection state subscription
   * PRODUCTION FIX: Notify listeners when authentication state changes
   */
  private connectionStateListeners: Set<(state: { 
    isConnected: boolean; 
    isAuthenticated: boolean; 
    connectionState: ConnectionState;
    error?: string;
  }) => void> = new Set();

  private notifyConnectionStateListeners() {
    try {
      const socket = connectionManager?.getSocket?.();
      const isConnected = socket?.connected || false;
      
      // PRODUCTION FIX: Safely get connection state with multiple fallbacks
      let connectionState: ConnectionState = 'disconnected';
      try {
        // Try to get connection state from connectionManager
        if (connectionManager && typeof connectionManager.getConnectionState === 'function') {
          connectionState = connectionManager.getConnectionState();
        } else if (connectionManager && typeof (connectionManager as any).getConnectionStats === 'function') {
          // Fallback: use getConnectionStats if available
          const stats = (connectionManager as any).getConnectionStats();
          connectionState = stats?.connectionState || (isConnected ? 'connected' : 'disconnected');
        } else {
          // Final fallback: determine state from socket connection status
          connectionState = isConnected ? 'connected' : 'disconnected';
        }
      } catch (error) {
        // Fallback: determine state from socket connection status
        logger.warn('Error getting connection state, using fallback', 'component', { error });
        connectionState = isConnected ? 'connected' : 'disconnected';
      }
      
      const state = {
        isConnected,
        isAuthenticated: this.authenticationState.isAuthenticated,
        connectionState,
      };
      
      // Notify all listeners
      this.connectionStateListeners.forEach(listener => {
        try {
          listener(state);
        } catch (listenerError) {
          logger.error('Error in connection state listener', 'component', { error: listenerError });
        }
      });
    } catch (error) {
      logger.error('Error notifying connection state listeners', 'component', { error });
      // Provide a safe default state even on error
      const defaultState = {
        isConnected: false,
        isAuthenticated: false,
        connectionState: 'disconnected' as ConnectionState,
      };
      this.connectionStateListeners.forEach(listener => {
        try {
          listener(defaultState);
        } catch (listenerError) {
          // Silently fail if even the default state fails
        }
      });
    }
  }

  onConnectionStateChange(listener: (state: { 
    isConnected: boolean; 
    isAuthenticated: boolean; 
    connectionState: ConnectionState;
    error?: string;
  }) => void): () => void {
    this.connectionStateListeners.add(listener);
    
    // PRODUCTION FIX: Safely notify with current state, handle errors gracefully
    try {
      this.notifyConnectionStateListeners();
    } catch (error) {
      logger.warn('Error notifying connection state listener on subscription', 'component', { error });
      // Still provide a default state even if notification fails
      try {
        const socket = connectionManager.getSocket();
        listener({
          isConnected: socket?.connected || false,
          isAuthenticated: false,
          connectionState: 'disconnected',
        });
      } catch (fallbackError) {
        logger.error('Error providing fallback connection state', 'component', { error: fallbackError });
      }
    }
    
    // Also subscribe to connection manager state changes
    let connectionStateUnsubscribe: (() => void) | null = null;
    try {
      connectionStateUnsubscribe = connectionManager.onConnectionStateChange((state) => {
        try {
          this.notifyConnectionStateListeners();
        } catch (error) {
          logger.warn('Error notifying connection state listeners', 'component', { error });
        }
      });
    } catch (error) {
      logger.warn('Error subscribing to connection manager state changes', 'component', { error });
    }
    
    return () => {
      this.connectionStateListeners.delete(listener);
      if (connectionStateUnsubscribe) {
        try {
          connectionStateUnsubscribe();
        } catch (error) {
          logger.warn('Error unsubscribing from connection state changes', 'component', { error });
        }
      }
    };
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

  onDriverConnected(callback: (data: DriverConnectedData) => void): () => void {
    this.driverConnectedListeners.add(callback);
    return () => this.driverConnectedListeners.delete(callback);
  }

  onDriverDisconnected(callback: (data: DriverDisconnectedData) => void): () => void {
    this.driverDisconnectedListeners.add(callback);
    return () => this.driverDisconnectedListeners.delete(callback);
  }

  onStudentConnected(callback: () => void): () => void {
    this.studentConnectedListeners.add(callback);
    return () => this.studentConnectedListeners.delete(callback);
  }

  onBusArriving(callback: (data: BusArrivingData) => void): () => void {
    this.busArrivingListeners.add(callback);
    return () => this.busArrivingListeners.delete(callback);
  }

  onError(callback: (error: WebSocketError) => void): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  onDriverAssignmentUpdate(callback: (data: DriverAssignmentUpdateData) => void): () => void {
    this.driverAssignmentUpdateListeners.add(callback);
    return () => this.driverAssignmentUpdateListeners.delete(callback);
  }

  /**
   * PRODUCTION FIX: Listen for route stop reached events
   * Used by student map to update route status in real-time
   */
  onRouteStopReached(callback: (data: RouteStopReachedData) => void): () => void {
    this.routeStopReachedListeners.add(callback);
    return () => this.routeStopReachedListeners.delete(callback);
  }

  /**
   * PRODUCTION FIX: Subscribe to location rate limit events
   */
  onLocationRateLimited(callback: (data: LocationRateLimitedData) => void): () => void {
    this.locationRateLimitedListeners.add(callback);
    return () => this.locationRateLimitedListeners.delete(callback);
  }

  /**
   * PRODUCTION FIX: Subscribe to location confirmed events
   */
  onLocationConfirmed(callback: (data: LocationConfirmedData) => void): () => void {
    this.locationConfirmedListeners.add(callback);
    return () => this.locationConfirmedListeners.delete(callback);
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

      let resolved = false;
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          // CRITICAL FIX: Remove event listeners to prevent memory leaks
          socket.off('driver:initialized', onInitialized);
          socket.off('driver:initialization_failed', onFailed);
        }
      };

      const timeout = setTimeout(() => {
        if (!resolved) {
          cleanup();
          logger.error('❌ Driver initialization timeout', 'component', {
            timeout: 10000,
            socketId: socket.id,
            connected: socket.connected
          });
          // PRODUCTION FIX: Clear authentication state on timeout
          this.authenticationState = { isAuthenticated: false };
          this.notifyConnectionStateListeners();
          resolve(false);
        }
      }, 10000);

      const onInitialized = (data: any) => {
        if (!resolved) {
          cleanup();
          clearTimeout(timeout);
          logger.info('✅ Driver initialized successfully:', 'component', { 
            driverId: data?.driverId,
            busId: data?.busId 
          });
          // PRODUCTION FIX: Update authentication state when driver is initialized
          this.authenticationState = {
            isAuthenticated: true,
            userId: data?.driverId,
            userRole: 'driver'
          };
          // Update connection state to reflect authentication
          connectionManager.updateConnectionState('connected');
          // Notify listeners of authentication state change
          this.notifyConnectionStateListeners();
          resolve(true);
        }
      };

      const onFailed = (error: any) => {
        if (!resolved) {
          cleanup();
          clearTimeout(timeout);
          const errorMessage = error?.message || error || 'Unknown error';
          const errorCode = error?.code || 'INIT_ERROR';
          
          // PRODUCTION FIX: Enhanced error logging with diagnostics
          logger.error('❌ Driver initialization failed:', 'component', { 
            error: errorMessage,
            code: errorCode,
            errorData: error,
            socketId: socket.id,
            connected: socket.connected,
            clientType: connectionManager.getClientType(),
            suggestion: errorCode === 'NO_BUS_ASSIGNED' 
              ? 'Driver has no bus assignment. Please contact your administrator.'
              : errorCode === 'NOT_AUTHENTICATED'
                ? 'Authentication failed. Please log out and log in again.'
                : 'Driver initialization failed. Please check backend logs for details.'
          });
          
          // PRODUCTION FIX: Clear authentication state on failure
          this.authenticationState = { isAuthenticated: false };
          // Notify listeners of authentication state change
          this.notifyConnectionStateListeners();
          resolve(false);
        }
      };

      socket.once('driver:initialized', onInitialized);
      socket.once('driver:initialization_failed', onFailed);

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
   * PRODUCTION FIX: Enhanced cleanup with comprehensive listener removal
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
    this.routeStopReachedListeners.clear();
    this.connectionStateListeners.clear();
    
    // Remove all socket event listeners
    const socket = connectionManager.getSocket();
    if (socket) {
      // Remove listeners individually for better cleanup
      socket.removeAllListeners('connect');
      socket.removeAllListeners('disconnect');
      socket.removeAllListeners('connect_error');
      socket.removeAllListeners('error');
      socket.removeAllListeners('bus:locationUpdate');
      socket.removeAllListeners('student:connected');
      socket.removeAllListeners('driver:connected');
      socket.removeAllListeners('driver:disconnected');
      socket.removeAllListeners('bus:arriving');
      socket.removeAllListeners('driver:assignmentUpdate');
      socket.removeAllListeners('route:stopReached');
      socket.removeAllListeners('driver:initialized');
      socket.removeAllListeners('driver:initialization_failed');
      socket.removeAllListeners('ping');
      socket.removeAllListeners('pong');
      
      // Final cleanup - remove any remaining listeners
      socket.removeAllListeners();
    }
    
    // CRITICAL FIX: Reset event listeners flag
    this.eventListenersSetup = false;
    
    logger.info('✅ WebSocket event listeners cleaned up', 'component');
  }

  /**
   * Remove specific event listener by type
   */
  offEvent(eventType: string, callback?: (...args: unknown[]) => void): void {
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
