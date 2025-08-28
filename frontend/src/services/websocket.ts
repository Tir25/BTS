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
}

class WebSocketService {
  public socket: Socket | null = null;
  private _isConnected: boolean = false;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
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

    if (this.isShuttingDown) {
      console.log('🔌 WebSocket service is shutting down, cannot connect');
      return;
    }

    try {
      this.connectionState = 'connecting';
      console.log('🔌 Connecting to WebSocket server...');

      // Get WebSocket URL with fallback
      const wsUrl = environment.api.websocketUrl;
      console.log('🔌 WebSocket URL:', wsUrl);

      // Enhanced Socket.IO configuration for production with improved stability
      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
        upgrade: true,
        rememberUpgrade: true,
        timeout: 15000, // Increased timeout for better stability
        forceNew: true,
        reconnection: true, // Enable automatic reconnection
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: false,
        query: {
          clientType: 'driver',
          version: '1.0.0',
          timestamp: Date.now().toString(),
        },
        extraHeaders: {
          'User-Agent': 'BusTrackingDriver/1.0.0',
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
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      });
      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error);
      });
      this.socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
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

    // Start heartbeat and connection monitoring
    this.startHeartbeat();
    this.startConnectionMonitoring();

    // Emit connection event
    this.socket?.emit('driver:connected', {
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
    if (error.type === 'TransportError' || error.type === 'TransportOpenError') {
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

    console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 1000,
      this.maxReconnectDelay
    );

    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.connect();
      }
    }, delay);
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

    console.log(`🔍 Connection monitor: Connected=${isConnected}, Last heartbeat=${timeSinceLastHeartbeat}ms ago`);

    // If socket thinks it's connected but we haven't received a heartbeat in 60 seconds, consider it disconnected
    if (isConnected && timeSinceLastHeartbeat > 60000 && this.lastHeartbeat > 0) {
      console.warn('⚠️ Connection monitor: No heartbeat received, forcing reconnection');
      this.socket.disconnect();
      this.handleReconnect();
    }

    // Update internal state
    if (this._isConnected !== isConnected) {
      console.log(`🔄 Connection state changed: ${this._isConnected} -> ${isConnected}`);
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
    this.reconnectDelay = 1000;
  }

  isConnected(): boolean {
    return this._isConnected && this.socket?.connected === true;
  }

  getConnectionState(): 'disconnected' | 'connecting' | 'connected' | 'reconnecting' {
    return this.connectionState;
  }

  getConnectionStatus(): boolean {
    return this._isConnected;
  }

  authenticateAsDriver(token: string, callbacks?: {
    onSuccess?: (data: any) => void;
    onFailure?: (error: any) => void;
    onError?: (error: any) => void;
  }): void {
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
      console.log('📤 Authentication request sent with token length:', token.length);
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
    this.socket?.on('bus:locationUpdate', callback);
  }

  onDriverConnected(callback: (data: any) => void): void {
    this.driverConnectedListeners.push(callback);
    this.socket?.on('driver:connected', callback);
  }

  onDriverDisconnected(callback: (data: any) => void): void {
    this.driverDisconnectedListeners.push(callback);
    this.socket?.on('driver:disconnected', callback);
  }

  onStudentConnected(callback: () => void): void {
    this.studentConnectedListeners.push(callback);
    this.socket?.on('student:connected', callback);
  }

  onBusArriving(callback: (data: any) => void): void {
    this.busArrivingListeners.push(callback);
    this.socket?.on('bus:arriving', callback);
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
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    const stats = this.getConnectionStats();
    
    const healthy = this.isConnected() && 
                   this.connectionState === 'connected' && 
                   stats.lastHeartbeat > 0 &&
                   (Date.now() - stats.lastHeartbeat) < 60000; // Last heartbeat within 1 minute

    return {
      healthy,
      details: {
        ...stats,
        socketExists: !!this.socket,
        socketConnected: this.socket?.connected,
        isShuttingDown: this.isShuttingDown,
      }
    };
  }
}

export const websocketService = new WebSocketService();
