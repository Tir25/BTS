import { io, Socket } from 'socket.io-client';
import { environment } from '../config/environment';

export interface BusLocation {
  busId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  eta?: {
    bus_id: string;
    route_id: string;
    current_location: [number, number];
    next_stop: string;
    distance_remaining: number;
    estimated_arrival_minutes: number;
    is_near_stop: boolean;
  };
  nearStop?: {
    is_near_stop: boolean;
    distance_to_stop: number;
  };
}

export interface BusInfo {
  busId: string;
  busNumber: string;
  routeName: string;
  driverName: string;
  currentLocation: BusLocation;
  eta?: number;
}

class WebSocketService {
  public socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(backendUrl: string = environment.api.websocketUrl): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          this.socket = io(backendUrl, {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: this.reconnectDelay,
          });

          this.socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;

            // Emit student connection for public access
            this.socket?.emit('student:connect');

            resolve();
          });

          this.socket.on('disconnect', reason => {
            if (reason !== 'transport close' || this.isConnected) {
              console.log('❌ WebSocket disconnected:', reason);
            }
            this.isConnected = false;
          });

          this.socket.on('connect_error', error => {
            if (this.reconnectAttempts > 0) {
              console.error('❌ WebSocket connection error:', error);
            }
            this.reconnectAttempts++;
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              reject(new Error('Failed to connect to WebSocket server'));
            }
          });

          this.socket.on('error', error => {
            console.error('❌ WebSocket error:', error);
          });
        } catch (error) {
          console.error('❌ Failed to create WebSocket connection:', error);
          reject(error);
        }
      }, 500);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  onBusLocationUpdate(callback: (location: BusLocation) => void): void {
    this.socket?.on('bus:locationUpdate', callback);
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

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  authenticateAsDriver(token: string): void {
    if (this.socket && this.isConnected) {
      console.log('🔐 Driver: Authenticating with token...');
      this.socket.emit('driver:authenticate', { token });

      // Add listener for driver authentication response
      this.socket.once('driver:authenticated', data => {
        console.log('✅ Driver: Authentication successful:', data);
      });

      this.socket.once('error', error => {
        console.error('❌ Driver: Authentication failed:', error);
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
