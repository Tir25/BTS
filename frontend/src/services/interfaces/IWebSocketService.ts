import { 
  BusLocation, 
  WebSocketStats, 
  DriverConnectionData, 
  BusArrivingData, 
  StudentConnectionData 
} from '../../types';

export interface IWebSocketService {
  connect(backendUrl?: string): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  getConnectionStatus(): boolean;
  getConnectionState(): 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  getConnectionStats(): WebSocketStats;
  onBusLocationUpdate(callback: (location: BusLocation) => void): void;
  onDriverConnected(callback: (data: DriverConnectionData) => void): void;
  onDriverDisconnected(callback: (data: DriverConnectionData) => void): void;
  onStudentConnected(callback: (data: StudentConnectionData) => void): void;
  onBusArriving(callback: (data: BusArrivingData) => void): void;
  authenticateAsDriver(token: string): void;
  off(event: string): void;
}
