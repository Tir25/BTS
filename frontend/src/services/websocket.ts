import { io, Socket } from 'socket.io-client';

export interface BusLocation {
  busId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface BusInfo {
  busId: string;
  busNumber: string;
  routeName: string;
  driverName: string;
  currentLocation: BusLocation;
  eta?: number; // ETA to next stop in minutes
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  connect(backendUrl: string = 'http://localhost:3000'): Promise<void> {
    return new Promise((resolve, reject) => {
      // Add a small delay to ensure backend is ready
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
          
          // Join as student for viewing bus locations
          this.socket?.emit('student:connect');
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          // Only log disconnection if it's not a normal transport close during page load
          if (reason !== 'transport close' || this.isConnected) {
            console.log('❌ WebSocket disconnected:', reason);
          }
          this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
          // Only log connection errors after the first attempt to reduce noise
          if (this.reconnectAttempts > 0) {
            console.error('❌ WebSocket connection error:', error);
          }
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect to WebSocket server'));
          }
        });

        this.socket.on('error', (error) => {
          console.error('❌ WebSocket error:', error);
        });

              } catch (error) {
          console.error('❌ Failed to create WebSocket connection:', error);
          reject(error);
        }
      }, 500); // 500ms delay
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
    if (this.socket) {
      this.socket.on('bus:locationUpdate', callback);
    }
  }

  onDriverConnected(callback: (data: { driverId: string; busId: string; timestamp: string }) => void): void {
    if (this.socket) {
      this.socket.on('driver:connected', callback);
    }
  }

  onDriverDisconnected(callback: (data: { driverId: string; busId: string; timestamp: string }) => void): void {
    if (this.socket) {
      this.socket.on('driver:disconnected', callback);
    }
  }

  onStudentConnected(callback: (data: { timestamp: string }) => void): void {
    if (this.socket) {
      this.socket.on('student:connected', callback);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Remove event listeners
  off(event: string): void {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
