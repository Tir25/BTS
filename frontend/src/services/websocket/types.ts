/**
 * WebSocket Type Definitions for Frontend
 * Aligned with backend/src/websocket/socketTypes.ts for consistency
 */

export interface DriverConnectedData {
  driverId: string;
  busId: string;
  busNumber?: string;
  timestamp?: string;
}

export interface DriverDisconnectedData {
  driverId: string;
  busId?: string;
  reason?: string;
  timestamp?: string;
}

export interface BusArrivingData {
  busId: string;
  stopId: string;
  routeId: string;
  estimatedArrivalMinutes: number;
  distanceRemaining: number;
  timestamp: string;
}

export interface DriverAssignmentUpdateData {
  type: 'assigned' | 'unassigned' | 'updated';
  assignment?: {
    driverId: string;
    busId: string;
    busNumber: string;
    routeId?: string;
    routeName?: string;
    driverName?: string;
    status?: string;
    lastUpdated?: string;
  };
  timestamp: string;
}

export interface RouteStopReachedData {
  routeId: string;
  stopId: string;
  driverId: string;
  lastStopSequence: number;
  routeStatus: {
    tracking_active: boolean;
    stops: {
      completed: Array<{
        stop_id: string;
        stop_name: string;
        sequence: number;
        reached_at?: string;
      }>;
      next: {
        stop_id: string;
        stop_name: string;
        sequence: number;
        estimated_arrival?: string;
      } | null;
      remaining: Array<{
        stop_id: string;
        stop_name: string;
        sequence: number;
      }>;
    };
  };
  timestamp: string;
}

export interface WebSocketError {
  message: string;
  code?: string;
  details?: any;
}

export interface LocationRateLimitedData {
  timestamp: string;
  nextAllowedTime: string;
  waitTimeMs: number;
  reason: string;
}

export interface LocationConfirmedData {
  timestamp: string;
  locationId: string;
}

