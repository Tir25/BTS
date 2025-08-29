import { io, Socket } from 'socket.io-client';
import { environment } from '../config/environment';
// import { authService } from './authService'; // Unused import

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
  busInfo?: {
    busNumber: string;
    routeName: string;
    driverName: string;
  };
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
  private reconnectDelay: number = 1000;
  private maxReconnectDelay: number = 30000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;
  private isShuttingDown: boolean = false;
  private connectionMonitorInterval: NodeJS.Timeout | null = null;

  // Event listeners
  private busLocationListeners: ((location: BusLocation) => void)[] = [];
  private driverConnectedListeners: ((data: any) => void)[] = [];
  private driverDisconnectedListeners: ((data: any) => void)[] = [];
  private studentConnectedListeners: (() => void)[] = [];
  private busArrivingListeners: ((data: any) => void)[] = [];

  constructor() {
    // Bind methods to preserve context
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleReconnect = this.handleReconnect.bind(this);
    this.startHeartbeat = this.startHeartbeat.bind(this);
    this.stopHeartbeat = this.stopHeartbeat.bind(this);
    this.monitorConnection = this.monitorConnection.bind(this);
  }

  async connect(): Promise<void> {
    if (this.socket?.connected || this.connectionState === 'connecting') {
      console.log('🔌 WebSocket already connected or connecting');
      return;
    }

    // Reset shutting down flag when attempting to connect
    this.isShuttingDown = false;

    try {
      this.connectionState = 'connecting';
      console.log('🔌 Connecting to WebSocket server...');

      // Get WebSocket URL with fallback
      const wsUrl = environment.api.websocketUrl;
      
      // Check if WebSocket URL is valid before attempting connection
      if (!wsUrl || typeof wsUrl !== 'string' || !wsUrl.startsWith('ws')) {
        throw new Error(`Invalid WebSocket URL: ${wsUrl}`);
      }
      
      // Network connection check
      if (!navigator.onLine) {
        throw new Error('No network connection available');
      }

      // Enhanced Socket.IO configuration for production with improved stability
      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000, // Increased timeout for better stability on slow networks
        forceNew: true,
        reconnection: false, // We handle reconnection manually for better control
        autoConnect: false,
        query: {
          clientType: 'student', // Changed from driver to student for student map
          version: '1.0.0',
          timestamp: Date.now().toString(),
          deviceInfo: `${navigator.platform}|${navigator.userAgent.substring(0, 100)}`,
        },
      });

      // Set up connection timeout with progressive checks
      const timeoutCheck = (timeout: number) => {
        if (this.connectionState === 'connecting') {
          if (timeout >= 15000) {
            console.error('❌ WebSocket connection timeout');
            this.handleError(new Error('Connection timeout'));
          } else {
            console.log(`⏳ Still connecting... (${timeout / 1000}s)`);
            this.connectionTimeout = setTimeout(() => timeoutCheck(timeout + 5000), 5000);
          }
        }
      };
      
      this.connectionTimeout = setTimeout(() => timeoutCheck(5000), 5000);

      // Set up event listeners with enhanced error information
      this.socket.on('connect', this.handleConnect);
      this.socket.on('disconnect', this.handleDisconnect);
      this.socket.on('connect_error', (error: Error) => {
        console.error('❌ Connection error details:', {
          message: error.message,
          context: {
            url: wsUrl,
            online: navigator.onLine,
            connectionState: this.connectionState,
          }
        });
        this.handleError(error);
      });
      this.socket.on('error', this.handleError);
      this.socket.on('reconnect', this.handleReconnect);
      
      // Student-specific event listeners
      this.socket.on('student:connected', (data: any) => {
        console.log('✅ Student connection confirmed:', data);
        this.studentConnectedListeners.forEach(listener => listener());
      });
      
      this.socket.on('student:joined', (data: any) => {
        console.log('👥 Another student joined:', data);
      });
      
      this.socket.on('student:noBusesAvailable', (data: any) => {
        console.warn('⚠️ No buses available:', data);
      });
      
      this.socket.on('student:initialLocationsComplete', (data: any) => {
        console.log('📊 Initial locations complete:', data);
      });
      
      this.socket.on('student:error', (error: any) => {
        console.error('❌ Student error:', error);
      });
      
      // Bus location update listener
      this.socket.on('bus:locationUpdate', (location: BusLocation) => {
        // Validate location data before processing
        if (!location || !location.busId) {
          console.error('❌ Invalid bus location data received:', location);
          return;
        }
        
        // Validate coordinates
        if (isNaN(location.latitude) || isNaN(location.longitude) || 
            location.latitude === undefined || location.longitude === undefined ||
            location.latitude === null || location.longitude === null) {
          console.warn(`⚠️ Invalid coordinates for bus ${location.busId}: [${location.longitude}, ${location.latitude}]`);
          return;
        }
        
        console.log('📍 Bus location update received:', {
          busId: location.busId,
          coords: [location.longitude, location.latitude],
          time: new Date(location.timestamp).toLocaleTimeString()
        });
        
        this.busLocationListeners.forEach(listener => listener(location));
      });
      
      // Bus arriving listener
      this.socket.on('bus:arriving', (data: any) => {
        console.log('🚌 Bus arriving:', data);
        this.busArrivingListeners.forEach(listener => listener(data));
      });
      
      // Additional event listeners for better debugging
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      });
      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error);
      });
      this.socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
      });
      this.socket.io.on('packet', (packet: any) => {
        if (packet && packet.type && packet.type.toString() === 'error') {
          console.error('❌ Socket.IO packet error:', packet.data);
        }
      });

      // Connect to server
      this.socket.connect();
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
    this.reconnectDelay = 1000;

    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Re-register all event listeners after connection
    this.reRegisterEventListeners();

    // Start heartbeat and connection monitoring
    this.startHeartbeat();
    this.startConnectionMonitoring();

    // Emit student connection event
    this.socket?.emit('student:connect', {
      timestamp: new Date().toISOString(),
      clientInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      },
    });
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

  private handleError(error: any): void {
    console.error('❌ WebSocket error:', error);

    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Don't reconnect if we're shutting down
    if (this.isShuttingDown) {
      return;
    }

    // Attempt reconnection for network errors
    if (
      error.type === 'TransportError' ||
      error.type === 'TransportOpenError'
    ) {
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.isShuttingDown || this.connectionState === 'reconnecting') {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.connectionState = 'disconnected';
      return;
    }

    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;

    console.log(
      `🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    // Enhanced exponential backoff with jitter
    // Base delay increases exponentially with each attempt
    // Add randomized jitter to prevent thundering herd problem
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * baseDelay * 0.5; // 0-50% jitter
    const delay = Math.min(baseDelay + jitter, this.maxReconnectDelay);

    // Implement mobile network detection for more aggressive reconnection
    // Use navigator.connection if available (not standard in all browsers)
    const connection = (navigator as any).connection;
    const isMobileNetwork = connection ? 
      ['slow-2g', '2g', '3g'].includes(connection.effectiveType) : 
      false;

    if (isMobileNetwork && this.reconnectAttempts > 3) {
      // For mobile networks, add additional delay to conserve battery
      const mobileDelay = delay * 1.5;
      console.log('📱 Mobile network detected, adjusting reconnection strategy');
      
      setTimeout(() => {
        if (!this.isShuttingDown) {
          this.connect();
        }
      }, mobileDelay);
    } else {
      setTimeout(() => {
        if (!this.isShuttingDown) {
          this.connect();
        }
      }, delay);
    }
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
    }, 10000); // Check connection every 10 seconds
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

    // If socket thinks it's connected but we haven't received a heartbeat in 60 seconds, consider it disconnected
    if (
      isConnected &&
      timeSinceLastHeartbeat > 60000 &&
      this.lastHeartbeat > 0
    ) {
      console.warn(
        '⚠️ Connection monitor: No heartbeat received, forcing reconnection'
      );
      this.socket.disconnect();
      this.handleReconnect();
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

    // Clear all event listeners
    this.clearAllEventListeners();

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Reset state
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  }

  // Method to reset the WebSocket service state
  reset(): void {
    console.log('🔄 Resetting WebSocket service...');
    this.isShuttingDown = false;
    this.connectionState = 'disconnected';
    this._isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;

    // Clear any existing socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Stop any running timers
    this.stopHeartbeat();
    this.stopConnectionMonitoring();

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
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
      onSuccess?: (data: any) => void;
      onFailure?: (error: any) => void;
      onError?: (error: any) => void;
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
      this.socket.once('driver:authenticated', (data) => {
        console.log('✅ Driver: Authentication successful:', data);
        if (callbacks?.onSuccess) {
          callbacks.onSuccess(data);
        }
      });

      this.socket.once('driver:authentication_failed', (error) => {
        console.error('❌ Driver: Authentication failed:', error);
        if (callbacks?.onFailure) {
          callbacks.onFailure(error);
        }
      });

      this.socket.once('error', (error) => {
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
    if (this.socket) {
      this.socket.on('bus:locationUpdate', callback);
    }
  }

  onDriverConnected(callback: (data: any) => void): void {
    this.driverConnectedListeners.push(callback);
    if (this.socket) {
      this.socket.on('driver:connected', callback);
    }
  }

  onDriverDisconnected(callback: (data: any) => void): void {
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

  onBusArriving(callback: (data: any) => void): void {
    this.busArrivingListeners.push(callback);
    if (this.socket) {
      this.socket.on('bus:arriving', callback);
    }
  }

  off(event: string): void {
    this.socket?.off(event);
  }

  // Re-register all event listeners after connection
  private reRegisterEventListeners(): void {
    if (!this.socket) return;

    console.log('🔄 Re-registering event listeners...');

    // Re-register bus location update listeners
    this.busLocationListeners.forEach(callback => {
      this.socket!.on('bus:locationUpdate', callback);
    });

    // Re-register driver connected listeners
    this.driverConnectedListeners.forEach(callback => {
      this.socket!.on('driver:connected', callback);
    });

    // Re-register driver disconnected listeners
    this.driverDisconnectedListeners.forEach(callback => {
      this.socket!.on('driver:disconnected', callback);
    });

    // Re-register student connected listeners
    this.studentConnectedListeners.forEach(callback => {
      this.socket!.on('student:connected', callback);
    });

    // Re-register bus arriving listeners
    this.busArrivingListeners.forEach(callback => {
      this.socket!.on('bus:arriving', callback);
    });
    
    // Set up additional student-specific event handlers
    this.socket.on('student:noBusesAvailable', (data: any) => {
      console.warn('⚠️ No buses available:', data);
    });
    
    this.socket.on('student:initialLocationsComplete', (data: any) => {
      console.log('📊 Initial locations complete:', data);
    });
    
    this.socket.on('student:error', (error: any) => {
      console.error('❌ Student error:', error);
    });

    console.log(`🔄 Re-registered ${this.busLocationListeners.length} bus location listeners`);
  }

  // Clear all event listeners
  private clearAllEventListeners(): void {
    if (!this.socket) return;

    console.log('🧹 Clearing all event listeners...');

    // Clear all event listeners from socket
    this.socket.off('bus:locationUpdate');
    this.socket.off('driver:connected');
    this.socket.off('driver:disconnected');
    this.socket.off('student:connected');
    this.socket.off('student:joined');
    this.socket.off('student:noBusesAvailable');
    this.socket.off('student:initialLocationsComplete');
    this.socket.off('student:error');
    this.socket.off('bus:arriving');
    this.socket.off('error');
    this.socket.off('connect');
    this.socket.off('disconnect');
    this.socket.off('connect_error');
    this.socket.off('reconnect');
    this.socket.off('reconnect_attempt');
    this.socket.off('reconnect_error');
    this.socket.off('reconnect_failed');

    console.log('✅ All event listeners cleared');
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
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
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
}

export const websocketService = new WebSocketService();
