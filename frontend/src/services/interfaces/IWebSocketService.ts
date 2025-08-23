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

export interface IWebSocketService {
  connect(backendUrl?: string): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  getConnectionStatus(): boolean;
  onBusLocationUpdate(callback: (location: BusLocation) => void): void;
  onDriverConnected(callback: (data: any) => void): void;
  onDriverDisconnected(callback: (data: any) => void): void;
  onStudentConnected(callback: () => void): void;
  onBusArriving(callback: (data: any) => void): void;
}
