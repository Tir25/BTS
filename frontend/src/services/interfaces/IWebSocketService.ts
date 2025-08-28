import {
  WebSocketStats,
  DriverConnectionData,
  BusArrivingData,
  StudentConnectionData,
} from '../../types';

export type { BusLocation } from '../../types';

export interface IWebSocketService {
  connect(backendUrl?: string): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  getConnectionStatus(): boolean;
  getConnectionState():
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reconnecting';
  getConnectionStats(): WebSocketStats;
  onBusLocationUpdate(
    callback: (location: import('../../types').BusLocation) => void
  ): void;
  onDriverConnected(callback: (data: DriverConnectionData) => void): void;
  onDriverDisconnected(callback: (data: DriverConnectionData) => void): void;
  onStudentConnected(callback: (data: StudentConnectionData) => void): void;
  onBusArriving(callback: (data: BusArrivingData) => void): void;
  authenticateAsDriver(token: string): void;
  sendLocationUpdate(locationData: {
    driverId: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
    heading?: number;
  }): void;
  off(event: string): void;
}
