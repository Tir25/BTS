import { io, Socket } from 'socket.io-client';
import { environment } from '../config/environment';
import { BusLocation as TypesBusLocation, ETAInfo } from '../types';
import { validationMiddleware, ProcessedLocationData } from '../middleware/validationMiddleware';
// import { authService } from './authService'; // Unused import

export interface BusLocation extends TypesBusLocation {
  // This interface extends the main BusLocation type from types/index.ts
  // to ensure compatibility across the application
}

class WebSocketService {
  public socket: Socket | null = null;
  private _isConnected: boolean = false;
  private connectionState:
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reconnecting' = 'disconnected';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;
  private isShuttingDown: boolean = false;
  private connectionMonitorInterval: NodeJS.Timeout | null = null;

  // Event listeners
  private busLocationListeners: ((location: BusLocation) => void)[] = [];
  private driverConnectedListeners: ((
    data: Record<string, unknown>
  ) => void)[] = [];
  private driverDisconnectedListeners: ((
    data: Record<string, unknown>
  ) => void)[] = [];
  private studentConnectedListeners: (() => void)[] = [];
  private busArrivingListeners: ((data: Record<string, unknown>) => void)[] =
    [];

  constructor() {
    // Bind methods to preserve context
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleReconnect = this.handleReconnect.bind(this);
    this.startHeartbeat = this.startHeartbeat.bind(this);
    this.stopHeartbeat = this.stopHeartbeat.bind(this);
    this.monitorConnection = this.monitorConnection.bind(this);
    
    // Add page unload handler to prevent Firefox WebSocket interruption errors
    if (typeof window !== 'undefined') {
      // Store connection state in sessionStorage for persistence across refreshes
      this.restoreConnectionState();
      
      // Track if this is a page refresh
      let isPageRefresh = false;
      
      window.addEventListener('beforeunload', () => {
        console.log('🔄 Page unloading, saving connection state...');
        this.saveConnectionState();
        // Don't disconnect during page refresh - let the browser handle it naturally
        isPageRefresh = true;
      });
      
      // Handle page visibility changes with debouncing
      let visibilityTimeout: NodeJS.Timeout | null = null;
      document.addEventListener('visibilitychange', () => {
        // Clear any existing timeout
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }
        
        // Debounce visibility changes to prevent rapid switching
        visibilityTimeout = setTimeout(() => {
          if (document.hidden) {
            console.log('👁️ Page hidden, pausing WebSocket activity...');
            this.pauseActivity();
          } else {
            console.log('👁️ Page visible, resuming WebSocket activity...');
            this.resumeActivity();
          }
        }, 500); // 500ms debounce
      });
      
      // Handle page focus/blur for better connection management
      window.addEventListener('focus', () => {
        console.log('🎯 Page focused, checking WebSocket connection...');
        this.checkAndReconnectIfNeeded();
      });
      
      window.addEventListener('blur', () => {
        console.log('👁️ Page blurred, reducing WebSocket activity...');
        this.pauseActivity();
      });
      
      // Check if this is a page refresh on load
      window.addEventListener('load', () => {
        if (isPageRefresh) {
          console.log('🔄 Page refresh detected, attempting to restore WebSocket connection...');
          setTimeout(() => {
            this.checkAndReconnectIfNeeded();
          }, 1000); // Wait 1 second for page to fully load
        }
      });
    }
  }

  // Firefox-specific connection retry mechanism
  private handleFirefoxConnectionIssue(): void {
    console.log('🦊 Firefox WebSocket connection issue detected, implementing workaround...');
    
    // Wait a bit before retrying to avoid rapid reconnection
    setTimeout(() => {
      if (!this.isShuttingDown && this.connectionState !== 'connected') {
        console.log('🔄 Retrying WebSocket connection for Firefox...');
        this.connect();
      }
    }, 2000); // 2 second delay
  }


  // Pause WebSocket activity when page is hidden
  private pauseActivity(): void {
    try {
      console.log('⏸️ Pausing WebSocket activity...');
      // Reduce heartbeat frequency when page is hidden
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          if (this.socket?.connected) {
            this.socket.emit('ping');
            this.lastHeartbeat = Date.now();
          }
        }, 60000); // Slower heartbeat when hidden (60 seconds)
      }
      // Don't disconnect the socket - just reduce activity
    } catch (error) {
      console.warn('⚠️ Error pausing activity:', error);
    }
  }

  // Resume WebSocket activity when page becomes visible
  private resumeActivity(): void {
    try {
      console.log('▶️ Resuming WebSocket activity...');
      // Restore normal heartbeat frequency
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          if (this.socket?.connected) {
            this.socket.emit('ping');
            this.lastHeartbeat = Date.now();
          }
        }, 30000); // Normal heartbeat when visible (30 seconds)
      }
      
      // Check connection status and reconnect if needed
      if (!this.socket || !this.socket.connected) {
        console.log('🔄 Reconnecting after page became visible...');
        this.connect();
      } else {
        console.log('✅ WebSocket connection is still active');
      }
    } catch (error) {
      console.warn('⚠️ Error resuming activity:', error);
    }
  }

  // Get WebSocket URL using environment configuration
  private getWebSocketUrl(): string {
    // Use the centralized environment configuration
    const wsUrl = environment.api.websocketUrl;
    console.log(`🔌 Using WebSocket URL from environment: ${wsUrl}`);
    return wsUrl;
  }

  async connect(): Promise<void> {
    // Check if already connected
    if (this.socket?.connected) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    // If we're in a connecting state but no socket exists, reset the state
    if (this.connectionState === 'connecting' && !this.socket) {
      console.log('🔄 Resetting stuck connecting state');
      this.connectionState = 'disconnected';
    }

    // If we're in a connecting state but socket exists, check if it's actually connecting
    if (this.connectionState === 'connecting' && this.socket) {
      console.log('🔌 WebSocket is in connecting state, checking actual status...');
      // Wait a moment to see if connection completes
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (this.socket.connected) {
        console.log('✅ WebSocket connection completed');
        return;
      } else {
        console.log('🔄 Connection stuck, forcing new connection');
        this.socket.disconnect();
        this.socket = null;
        this.connectionState = 'disconnected';
      }
    }

    // Reset shutting down flag if we're trying to connect again
    if (this.isShuttingDown) {
      console.log('🔄 Resetting WebSocket service state for reconnection');
      this.isShuttingDown = false;
    }

    try {
      this.connectionState = 'connecting';
      console.log('🔌 Connecting to WebSocket server...');

      // Get WebSocket URL with dynamic detection
      const wsUrl = this.getWebSocketUrl();
      console.log('🔌 WebSocket URL:', wsUrl);

      // Determine client type based on current URL path
      const currentPath = window.location.pathname;
      let clientType = 'student'; // Default
      let userAgent = 'BusTrackingStudent/1.0.0';
      
      if (currentPath.includes('/driver')) {
        clientType = 'driver';
        userAgent = 'BusTrackingDriver/1.0.0';
      } else if (currentPath.includes('/admin')) {
        clientType = 'admin';
        userAgent = 'BusTrackingAdmin/1.0.0';
      }
      
      console.log(`🔌 Detected client type: ${clientType} (from path: ${currentPath})`);

      // Enhanced Socket.IO configuration for production with improved stability
      const isFirefox = typeof navigator !== 'undefined' && 
                     navigator.userAgent && 
                     navigator.userAgent.includes('Firefox');
      
      // Special configuration with stable reconnect behavior
      this.socket = io(wsUrl, {
        transports: isFirefox ? ['polling', 'websocket'] : ['websocket', 'polling'],
        upgrade: !isFirefox,
        rememberUpgrade: !isFirefox,
        timeout: isFirefox ? 30000 : 15000,
        forceNew: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        query: {
          clientType: clientType,
          version: '1.0.0',
          timestamp: Date.now().toString(),
        },
        extraHeaders: {
          'User-Agent': userAgent,
        },
      });

      // Set up connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.connectionState === 'connecting') {
          console.error('❌ WebSocket connection timeout');
          this.handleError(new Error('Connection timeout'));
        }
      }, 15000); // 15 seconds timeout

      // Set up event listeners
      this.socket.on('connect', this.handleConnect);
      this.socket.on('disconnect', this.handleDisconnect);
      this.socket.on('connect_error', this.handleError);
      this.socket.on('error', this.handleError);
      this.socket.on('reconnect', this.handleReconnect);
      this.socket.on('reconnect_attempt', attemptNumber => {
        console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      });
      this.socket.on('reconnect_error', error => {
        console.error('❌ Reconnection error:', error);
      });
      this.socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
        // Reset state to allow manual reconnection
        this.isShuttingDown = false;
        this.connectionState = 'disconnected';
      });

      // Handle pong response for heartbeat
      this.socket.on('pong', (data: { timestamp: string }) => {
        this.lastHeartbeat = Date.now();
        console.log('💓 Pong received, heartbeat updated:', data.timestamp);
      });
    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      this.handleError(error);
    }
  }

  private handleConnect(): void {
    console.log('✅ WebSocket connected');
    this._isConnected = true;
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;

    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Save connection state for persistence across refreshes
    this.saveConnectionState();

    // Start heartbeat and connection monitoring
    this.startHeartbeat();
    this.startConnectionMonitoring();

    // Set up event listeners for existing callbacks
    this.setupBusLocationUpdateListener();

    // Emit connection event based on client type
    const clientType = this.socket?.io?.opts?.query?.clientType || 'student';
    if (clientType === 'driver') {
      this.socket?.emit('driver:connected', {
        timestamp: new Date().toISOString(),
        clientInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
      });
    } else {
      this.socket?.emit('student:connect', {
        timestamp: new Date().toISOString(),
        clientInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
      });
    }
  }

  private handleDisconnect(reason: string): void {
    console.log('❌ WebSocket disconnected:', reason);
    this._isConnected = false;
    this.connectionState = 'disconnected';
    this.stopHeartbeat();
    this.stopConnectionMonitoring();

    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Don't reconnect if we're shutting down or if it was a manual disconnect
    if (this.isShuttingDown || reason === 'io client disconnect') {
      return;
    }

    // Attempt reconnection
    this.handleReconnect();
  }

  private handleError(error: unknown): void {
    console.error('❌ WebSocket error:', error);

    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Handle specific error types
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as { message: string }).message;
      
      // Check for Firefox-specific WebSocket interruption error
      if (errorMessage.includes('interrupted while the page was loading') || 
          errorMessage.includes('WebSocket is closed before the connection is established')) {
        console.log('🦊 Firefox WebSocket interruption detected, implementing workaround...');
        this.handleFirefoxConnectionIssue();
        return;
      }
      
      if (errorMessage.includes('Driver not authenticated')) {
        console.log('ℹ️ WebSocket: Driver authentication required. This is normal for student interface.');
        // Don't reconnect for authentication errors - they're expected
        return;
      }
      
      if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        console.log('🌐 WebSocket: Network error detected, will retry...');
        this.handleReconnect();
        return;
      }
    }

    // For other errors, attempt reconnection
    console.log('🔄 WebSocket error occurred, attempting reconnection...');
    this.handleReconnect();
  }

  private handleReconnect(): void {
    console.log('🔄 Starting enhanced reconnection process...');
    this.enhancedReconnect();
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        this.lastHeartbeat = Date.now();
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startConnectionMonitoring(): void {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }

    this.connectionMonitorInterval = setInterval(() => {
      this.monitorConnection();
    }, 60000); // Check connection every 60 seconds instead of every 10 seconds
  }

  private stopConnectionMonitoring(): void {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
  }

  private monitorConnection(): void {
    if (!this.socket) {
      console.log('🔍 Connection monitor: No socket available');
      return;
    }

    const isConnected = this.socket.connected;
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;

    console.log(
      `🔍 Connection monitor: Connected=${isConnected}, Last heartbeat=${timeSinceLastHeartbeat}ms ago`
    );

    // If socket thinks it's connected but we haven't received a heartbeat in 2 minutes, consider it disconnected
    if (
      isConnected &&
      timeSinceLastHeartbeat > 120000 && // 2 minutes threshold
      this.lastHeartbeat > 0
    ) {
      console.warn(
        `⚠️ Connection monitor: No heartbeat received for ${Math.round(timeSinceLastHeartbeat / 1000)}s, forcing reconnection`
      );
      
      // Only reconnect if we're not already in the process
      if (this.connectionState !== 'reconnecting') {
        this.socket.disconnect();
        this.handleReconnect();
      }
    }

    // Update internal state
    if (this._isConnected !== isConnected) {
      console.log(
        `🔄 Connection state changed: ${this._isConnected} -> ${isConnected}`
      );
      this._isConnected = isConnected;
      this.connectionState = isConnected ? 'connected' : 'disconnected';
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket...');
    this.isShuttingDown = true;
    this.connectionState = 'disconnected';
    this._isConnected = false;

    // Stop heartbeat
    this.stopHeartbeat();
    this.stopConnectionMonitoring();

    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Reset state
    this.reconnectAttempts = 0;
  }

  // Soft disconnect for cleanup that allows reconnection
  softDisconnect(): void {
    console.log('🔌 Soft disconnecting WebSocket...');
    this.connectionState = 'disconnected';
    this._isConnected = false;

    // Stop heartbeat
    this.stopHeartbeat();
    this.stopConnectionMonitoring();

    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Disconnect socket but don't set isShuttingDown
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Reset reconnection attempts to allow reconnection
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this._isConnected && this.socket?.connected === true;
  }

  getConnectionState():
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reconnecting' {
    return this.connectionState;
  }

  getConnectionStatus(): boolean {
    return this._isConnected;
  }

  authenticateAsDriver(
    token: string,
    callbacks?: {
      onSuccess?: (data: Record<string, unknown>) => void;
      onFailure?: (error: Record<string, unknown>) => void;
      onError?: (error: unknown) => void;
    }
  ): void {
    console.log('🔐 Driver: Starting authentication process...');
    console.log('🔐 Socket connected:', this.isConnected());
    console.log('🔐 Socket state:', this.getConnectionState());

    if (this.socket && this.isConnected()) {
      console.log('🔐 Driver: Sending authentication request...');

      // Remove any existing listeners to prevent duplicates
      this.socket.off('driver:authenticated');
      this.socket.off('driver:authentication_failed');
      this.socket.off('error');

      // Set up authentication response listeners BEFORE sending the request
      this.socket.once('driver:authenticated', data => {
        console.log('✅ Driver: Authentication successful:', data);
        if (callbacks?.onSuccess) {
          callbacks.onSuccess(data);
        }
      });

      this.socket.once('driver:authentication_failed', error => {
        console.error('❌ Driver: Authentication failed:', error);
        if (callbacks?.onFailure) {
          callbacks.onFailure(error);
        }
      });

      this.socket.once('error', error => {
        console.error('❌ Driver: Socket error during authentication:', error);
        if (callbacks?.onError) {
          callbacks.onError(error);
        }
      });

      // Send the authentication request
      this.socket.emit('driver:authenticate', { token });
      console.log(
        '📤 Authentication request sent with token length:',
        token.length
      );
    } else {
      console.error('❌ Driver: Cannot authenticate - socket not connected');
      console.error('❌ Socket object:', !!this.socket);
      console.error('❌ Connection state:', this.getConnectionState());

      if (callbacks?.onError) {
        callbacks.onError(new Error('Socket not connected'));
      }
    }
  }

  sendLocationUpdate(locationData: {
    driverId: string;
    busId: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
    heading?: number;
  }): void {
    if (this.socket && this.isConnected()) {
      console.log('📍 Sending location update:', locationData);
      this.socket.emit('driver:locationUpdate', locationData);
    } else {
      console.error('❌ Cannot send location update - socket not connected');
    }
  }

  // Event listener methods
  onBusLocationUpdate(callback: (location: BusLocation) => void): void {
    this.busLocationListeners.push(callback);
    
    // Set up the event listener on the socket if it exists
    if (this.socket) {
      this.setupBusLocationUpdateListener();
    }
  }

  // Set up the bus location update listener with validation middleware
  private setupBusLocationUpdateListener(): void {
    if (!this.socket) return;
    
    // Remove existing listener to prevent duplicates
    this.socket.off('bus:locationUpdate');
    
    this.socket.on('bus:locationUpdate', async (data: any) => {
      console.log('🔌 WebSocket: Received bus:locationUpdate event:', data);
      
      try {
        // Process data through validation middleware
        const processedData: ProcessedLocationData = await validationMiddleware.processLocationData(data);
        
        if (processedData.success && processedData.data) {
          console.log('✅ WebSocket: Data validation successful:', {
            busId: processedData.data.busId,
            sanitized: processedData.metadata.sanitized,
            usedFallback: processedData.metadata.usedFallback,
            confidence: processedData.metadata.confidence,
            source: processedData.metadata.source
          });

          // Log warnings if any
          if (processedData.warnings && processedData.warnings.length > 0) {
            console.warn('⚠️ WebSocket: Data validation warnings:', processedData.warnings);
          }

          // Transform ETA data if present
          const location: BusLocation = {
            ...processedData.data,
            eta: processedData.data.eta ? {
              bus_id: processedData.data.busId,
              route_id: data.routeId || 'unknown',
              current_location: [processedData.data.longitude, processedData.data.latitude],
              next_stop: processedData.data.eta.next_stop || 'Unknown Stop',
              distance_remaining: processedData.data.eta.distance_remaining || 0,
              estimated_arrival_minutes: processedData.data.eta.estimated_arrival_minutes || processedData.data.eta,
              is_near_stop: processedData.data.eta.is_near_stop || false,
            } as ETAInfo : undefined,
          };
          
          console.log('🔌 WebSocket: Processed and validated location data:', location);
          
          // Call all registered callbacks
          this.busLocationListeners.forEach(listener => {
            try {
              listener(location);
            } catch (error) {
              console.error('❌ Error in bus location update callback:', error);
            }
          });

        } else {
          // Validation failed
          console.error('❌ WebSocket: Data validation failed:', {
            errors: processedData.errors,
            busId: data.busId,
            hasFallback: !!processedData.fallback
          });

          // If we have fallback data, use it
          if (processedData.fallback) {
            console.log('🔄 WebSocket: Using fallback data for bus:', processedData.fallback.busId);
            
            this.busLocationListeners.forEach(listener => {
              try {
                listener(processedData.fallback!);
              } catch (error) {
                console.error('❌ Error in fallback bus location update callback:', error);
              }
            });
          }
        }

      } catch (error) {
        console.error('❌ WebSocket: Error processing location data:', error);
        
        // Fallback to basic validation for critical errors
        if (data.busId && data.latitude && data.longitude) {
          console.log('🔄 WebSocket: Attempting basic fallback validation...');
          
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          
          if (!isNaN(lat) && !isNaN(lng) && 
              lat >= -90 && lat <= 90 && 
              lng >= -180 && lng <= 180) {
            
            const fallbackLocation: BusLocation = {
              busId: data.busId,
              driverId: data.driverId || 'unknown',
              latitude: lat,
              longitude: lng,
              timestamp: data.timestamp || new Date().toISOString(),
              speed: data.speed,
              heading: data.heading,
              eta: data.eta ? {
                bus_id: data.busId,
                route_id: data.routeId || 'unknown',
                current_location: [lng, lat],
                next_stop: data.eta.next_stop || 'Unknown Stop',
                distance_remaining: data.eta.distance_remaining || 0,
                estimated_arrival_minutes: data.eta.estimated_arrival_minutes || data.eta,
                is_near_stop: data.eta.is_near_stop || false,
              } as ETAInfo : undefined,
            };
            
            console.log('🔄 WebSocket: Using basic fallback location:', fallbackLocation);
            
            this.busLocationListeners.forEach(listener => {
              try {
                listener(fallbackLocation);
              } catch (callbackError) {
                console.error('❌ Error in basic fallback callback:', callbackError);
              }
            });
          }
        }
      }
    });
  }

  onDriverConnected(callback: (data: Record<string, unknown>) => void): void {
    this.driverConnectedListeners.push(callback);
    if (this.socket) {
      this.socket.on('driver:connected', callback);
    }
  }

  onDriverDisconnected(
    callback: (data: Record<string, unknown>) => void
  ): void {
    this.driverDisconnectedListeners.push(callback);
    if (this.socket) {
      this.socket.on('driver:disconnected', callback);
    }
  }

  onStudentConnected(callback: () => void): void {
    this.studentConnectedListeners.push(callback);
    if (this.socket) {
      this.socket.on('student:connected', callback);
    }
  }

  onBusArriving(callback: (data: Record<string, unknown>) => void): void {
    this.busArrivingListeners.push(callback);
    if (this.socket) {
      this.socket.on('bus:arriving', callback);
    }
  }

  off(event: string): void {
    this.socket?.off(event);
  }

  // Enhanced method to get connection statistics
  getConnectionStats(): {
    isConnected: boolean;
    connectionState: string;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    lastHeartbeat: number;
    uptime: number;
  } {
    return {
      isConnected: this._isConnected,
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      uptime: this.lastHeartbeat > 0 ? Date.now() - this.lastHeartbeat : 0,
    };
  }

  // Health check method
  async healthCheck(): Promise<{
    healthy: boolean;
    details: Record<string, unknown>;
  }> {
    const stats = this.getConnectionStats();

    const healthy =
      this.isConnected() &&
      this.connectionState === 'connected' &&
      stats.lastHeartbeat > 0 &&
      Date.now() - stats.lastHeartbeat < 60000; // Last heartbeat within 1 minute

    return {
      healthy,
      details: {
        ...stats,
        socketExists: !!this.socket,
        socketConnected: this.socket?.connected,
        isShuttingDown: this.isShuttingDown,
      },
    };
  }

  // Reset WebSocket service state for reconnection
  resetState(): void {
    console.log('🔄 Resetting WebSocket service state...');
    this.isShuttingDown = false;
    this.connectionState = 'disconnected';
    this._isConnected = false;
    this.reconnectAttempts = 0;
    this.lastHeartbeat = 0;
  }

  // Set client type dynamically
  setClientType(clientType: 'student' | 'driver' | 'admin'): void {
    if (this.socket?.io?.opts?.query) {
      this.socket.io.opts.query.clientType = clientType;
    }
    console.log(`🔄 Client type set to: ${clientType}`);
    
    // For student interface, don't attempt driver authentication
    if (clientType === 'student') {
      console.log('📚 Student interface: WebSocket will connect without authentication');
    } else if (clientType === 'driver') {
      console.log('🚌 Driver interface: WebSocket will connect with driver authentication');
    } else if (clientType === 'admin') {
      console.log('👨‍💼 Admin interface: WebSocket will connect with admin authentication');
    }
  }

  // Connect with specific client type
  async connectAs(clientType: 'student' | 'driver' | 'admin'): Promise<void> {
    console.log(`🔌 Connecting as ${clientType} client...`);
    this.setClientType(clientType);
    await this.connect();
  }

  // Force a fresh connection (useful for debugging stuck connections)
  async forceFreshConnection(): Promise<void> {
    console.log('🔄 Forcing fresh WebSocket connection...');
    
    // Disconnect any existing connection
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Reset all state
    this.resetState();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Connect fresh
    await this.connect();
  }

  // Save connection state to sessionStorage for persistence across refreshes
  private saveConnectionState(): void {
    try {
      const connectionState = {
        clientType: this.socket?.io?.opts?.query?.clientType || 'student',
        lastConnected: Date.now(),
        reconnectAttempts: this.reconnectAttempts,
        connectionState: this.connectionState,
        isShuttingDown: this.isShuttingDown,
      };
      
      sessionStorage.setItem('websocket_connection_state', JSON.stringify(connectionState));
      console.log('💾 WebSocket connection state saved:', connectionState);
    } catch (error) {
      console.warn('⚠️ Failed to save connection state:', error);
    }
  }

  // Restore connection state from sessionStorage after page refresh
  private restoreConnectionState(): void {
    try {
      const savedState = sessionStorage.getItem('websocket_connection_state');
      if (savedState) {
        const connectionState = JSON.parse(savedState);
        console.log('🔄 Restoring WebSocket connection state:', connectionState);
        
        // Check if the state is recent (within last 5 minutes)
        const timeSinceLastConnection = Date.now() - connectionState.lastConnected;
        if (timeSinceLastConnection < 5 * 60 * 1000) { // 5 minutes
          console.log('✅ Recent connection state found, will attempt reconnection');
          this.reconnectAttempts = connectionState.reconnectAttempts || 0;
          this.connectionState = connectionState.connectionState || 'disconnected';
          this.isShuttingDown = connectionState.isShuttingDown || false;
          
          // Set client type for reconnection
          if (connectionState.clientType) {
            this.setClientType(connectionState.clientType);
          }
        } else {
          console.log('⏰ Connection state is too old, starting fresh');
          this.resetState();
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to restore connection state:', error);
      this.resetState();
    }
  }

  // Check if reconnection is needed and attempt it
  private checkAndReconnectIfNeeded(): void {
    if (this.isShuttingDown) {
      console.log('🔄 Skipping reconnection check - service is shutting down');
      return;
    }

    if (!this.isConnected() && this.connectionState !== 'connecting' && this.connectionState !== 'reconnecting') {
      console.log('🔄 Connection lost, attempting to reconnect...');
      this.handleReconnect();
    } else if (this.isConnected()) {
      console.log('✅ WebSocket connection is healthy');
    }
  }

  // Enhanced reconnection with better error handling
  private enhancedReconnect(): void {
    if (this.isShuttingDown || this.connectionState === 'reconnecting') {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.connectionState = 'disconnected';
      // Clear saved state to start fresh next time
      sessionStorage.removeItem('websocket_connection_state');
      return;
    }

    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;

    console.log(
      `🔄 Enhanced reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
    );

    // Exponential backoff with jitter and max delay
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    console.log(`⏰ Reconnecting in ${Math.round(delay)}ms...`);

    setTimeout(() => {
      if (!this.isShuttingDown) {
        console.log('🔄 Executing reconnection...');
        this.connect();
      }
    }, delay);
  }

  // Force reconnection for page refresh scenarios
  async forceReconnect(): Promise<void> {
    console.log('🔄 Force reconnection requested...');
    
    // Disconnect if connected
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    
    // Reset state
    this.resetState();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reconnect
    await this.connect();
  }

  // Test WebSocket connection specifically for Firefox
  async testFirefoxConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Firefox WebSocket connection...');
      
      // Create a test socket with minimal configuration
      const testSocket = io(this.getWebSocketUrl(), {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        autoConnect: false,
      });

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('⏰ Firefox WebSocket test timeout');
          testSocket.disconnect();
          resolve(false);
        }, 10000);

        testSocket.on('connect', () => {
          console.log('✅ Firefox WebSocket test successful');
          clearTimeout(timeout);
          testSocket.disconnect();
          resolve(true);
        });

        testSocket.on('connect_error', (error) => {
          console.log('❌ Firefox WebSocket test failed:', error.message);
          clearTimeout(timeout);
          testSocket.disconnect();
          resolve(false);
        });

        testSocket.connect();
      });
    } catch (error) {
      console.error('❌ Firefox WebSocket test error:', error);
      return false;
    }
  }
}

export const websocketService = new WebSocketService();
