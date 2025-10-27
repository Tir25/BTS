/**
 * Shared Driver Types
 * Centralized type definitions for driver-related components
 */

export interface BusInfo {
  bus_id: string;
  bus_number: string;
  route_id: string;
  route_name: string;
  driver_id: string;
  driver_name: string;
}

export interface DriverBusAssignment {
  driver_id: string;
  bus_id: string;
  bus_number: string;
  route_id: string;
  route_name: string;
  driver_name: string;
  created_at: string;
  updated_at: string;
}

export interface DriverLocationData {
  driverId: string;
  busId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface DriverConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  lastHeartbeat?: number;
  reconnectAttempts?: number;
}

export interface DriverTrackingState {
  isTracking: boolean;
  currentLocation: GeolocationPosition | null;
  locationError: string | null;
  lastUpdateTime: string | null;
  updateCount: number;
}

export interface DriverAuthState {
  isAuthenticated: boolean;
  isDriver: boolean;
  isLoading: boolean;
  error: string | null;
  driverId: string | null;
  driverEmail: string | null;
  driverName: string | null;
  busAssignment: DriverBusAssignment | null;
  isWebSocketConnected: boolean;
  isWebSocketAuthenticated: boolean;
}

export interface DriverControlsProps {
  isTracking: boolean;
  isAuthenticated: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  onStartTracking: () => void;
  onStopTracking: () => void;
  lastUpdateTime: string | null;
  updateCount: number;
  locationError?: string | null;
  onClearError?: () => void;
  onRequestPermission?: () => Promise<boolean>;
  // PRODUCTION FIX: GPS accuracy information
  accuracy?: number;
  accuracyLevel?: 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor';
  accuracyMessage?: string;
  accuracyWarning?: boolean;
}

export interface DriverHeaderProps {
  busInfo: BusInfo | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
  onSignOut: () => void;
  onRetryConnection?: () => void;
  onRefreshAssignment?: () => void;
  reconnectAttempts?: number;
  lastHeartbeat?: number;
}

export interface UnifiedDriverInterfaceProps {
  mode?: 'login' | 'dashboard';
}
