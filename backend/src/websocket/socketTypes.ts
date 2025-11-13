/**
 * WebSocket Type Definitions
 * Shared type definitions for WebSocket handlers
 */

import { Socket } from 'socket.io';

export interface LocationUpdate {
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface AuthenticatedSocket extends Socket {
  driverId?: string;
  busId?: string;
  userId?: string;
  userRole?: string;
  isAuthenticated?: boolean;
  lastActivity?: number;
}

export interface BusLocationData {
  busId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  eta?: any;
  nearStop?: any;
}

export interface DriverAssignment {
  driverId: string;
  busId: string;
  busNumber: string;
  routeId?: string;
  routeName?: string;
  driverName?: string;
  status?: string;
  lastUpdated?: string;
}

export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  connectionCounts: Map<string, number>;
  activeSockets: Map<string, AuthenticatedSocket>;
  connectionTimestamps: Map<string, number>;
  heartbeatIntervals: Map<string, NodeJS.Timeout>;
}

