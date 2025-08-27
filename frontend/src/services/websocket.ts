import { io, Socket } from 'socket.io-client';
import { environment } from '../config/environment';

import { IWebSocketService, BusLocation } from './interfaces/IWebSocketService';

class WebSocketService implements IWebSocketService {
  public socket: Socket | null = null;
  private _isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10; // Increased for mobile
  private reconnectDelay = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  connect(backendUrl: string = environment.api.websocketUrl): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isReconnecting) {
        console.log('🔄 Already attempting to reconnect...');
        return;
      }

      // If already connected, don't create a new connection
      if (this.socket && this.isConnected()) {
        console.log('✅ Already connected to WebSocket');
        resolve();
        return;
      }

      this.isReconnecting = true;

      setTimeout(() => {
        try {
          this.socket = io(backendUrl, {
            transports: ['websocket', 'polling'],
            timeout: 30000, // Increased timeout for mobile
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: this.reconnectDelay,
            reconnectionDelayMax: 5000,
            forceNew: false, // Changed to false to prevent multiple connections
            // Mobile-specific optimizations
            upgrade: true,
            rememberUpgrade: true,
            // Better error handling
            autoConnect: true,
          });

          this.socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            this._isConnected = true;
            this.isReconnecting = false;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;

            // Start heartbeat
            this.startHeartbeat();

            // Emit student connection for public access
            this.socket?.emit('student:connect');

            resolve();
          });

          this.socket.on('disconnect', (reason) => {
            console.log('❌ WebSocket disconnected:', reason);
            this._isConnected = false;
            this.stopHeartbeat();

            // Handle reconnection for mobile
            if (
              reason === 'io server disconnect' ||
              reason === 'transport close'
            ) {
              this.handleReconnection();
            }
          });

          this.socket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error);
            this.isReconnecting = false;
            this.reconnectAttempts++;

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              reject(new Error('Failed to connect to WebSocket server'));
            } else {
              this.handleReconnection();
            }
          });

          this.socket.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
          });

          this.socket.on('reconnect', (attemptNumber) => {
            console.log(
              `🔄 WebSocket reconnected after ${attemptNumber} attempts`
            );
            this._isConnected = true;
            this.isReconnecting = false;
            this.reconnectAttempts = 0;

            // Re-emit student connection after reconnect
            this.socket?.emit('student:connect');
          });

          this.socket.on('reconnect_error', (error) => {
            console.error('❌ WebSocket reconnection error:', error);
          });

          this.socket.on('reconnect_failed', () => {
            console.error('❌ WebSocket reconnection failed');
            this.isReconnecting = false;
            reject(new Error('Failed to reconnect to WebSocket server'));
          });
        } catch (error) {
          console.error('❌ Failed to create WebSocket connection:', error);
          this.isReconnecting = false;
          reject(error);
        }
      }, 500);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this._isConnected = false;
    }
    this.stopHeartbeat();
    this.isReconnecting = false;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat

    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this._isConnected) {
        this.socket.emit('ping');
        console.log('💓 Heartbeat sent');
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleReconnection(): void {
    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    console.log('🔄 Attempting to reconnect...');

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Exponential backoff for reconnection
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('❌ Reconnection failed:', error);
        this.isReconnecting = false;
      });
    }, delay);
  }

  onBusLocationUpdate(callback: (location: BusLocation) => void): void {
    console.log('🎧 Setting up bus:locationUpdate listener');
    this.socket?.on('bus:locationUpdate', (data) => {
      console.log('📡 Received bus:locationUpdate event:', data);
      callback(data);
    });
  }

  onDriverConnected(
    callback: (data: {
      driverId: string;
      busId: string;
      timestamp: string;
    }) => void
  ): void {
    this.socket?.on('driver:connected', callback);
  }

  onDriverDisconnected(
    callback: (data: {
      driverId: string;
      busId: string;
      timestamp: string;
    }) => void
  ): void {
    this.socket?.on('driver:disconnected', callback);
  }

  onStudentConnected(callback: (data: { timestamp: string }) => void): void {
    this.socket?.on('student:connected', callback);
  }

  onBusArriving(
    callback: (data: {
      busId: string;
      routeId: string;
      location: [number, number];
      timestamp: string;
    }) => void
  ): void {
    this.socket?.on('bus:arriving', callback);
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  getConnectionStatus(): boolean {
    return this._isConnected;
  }

  authenticateAsDriver(token: string): void {
    if (this.socket && this.isConnected()) {
      console.log('🔐 Driver: Sending authentication request...');
      
      // Remove any existing listeners to prevent duplicates
      this.socket.off('driver:authenticated');
      this.socket.off('driver:authentication_failed');
      this.socket.off('error');
      
      this.socket.emit('driver:authenticate', { token });

      // Add listener for driver authentication response
      this.socket.once('driver:authenticated', (data) => {
        console.log('✅ Driver: Authentication successful:', data);
      });

      this.socket.once('driver:authentication_failed', (error) => {
        console.error('❌ Driver: Authentication failed:', error);
      });

      this.socket.once('error', (error) => {
        console.error('❌ Driver: Socket error during authentication:', error);
      });
    } else {
      console.error('❌ Driver: Cannot authenticate - socket not connected');
    }
  }

  off(event: string): void {
    this.socket?.off(event);
  }
}

export const websocketService = new WebSocketService();
export type { BusLocation } from './interfaces/IWebSocketService';
