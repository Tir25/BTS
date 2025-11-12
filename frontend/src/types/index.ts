// Unified Type Definitions for Bus Tracking System
// Aligned with actual database schema and backend services

// ===== USER MANAGEMENT TYPES =====
export interface User {
  id: string;
  email: string;
  role: 'student' | 'driver' | 'admin';
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  profile_photo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role: 'student' | 'driver' | 'admin';
  driver_id?: string;
  is_active?: boolean;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Driver {
  id: string;
  driver_id: string;
  driver_name?: string;
  license_no?: string;
  license_number?: string;
  phone?: string;
  email?: string;
  photo_url?: string;
  created_at?: string;
  // Additional properties for compatibility
  first_name?: string;
  last_name?: string;
  profile_photo_url?: string;
  assigned_bus_id?: string;
  assigned_bus_plate?: string;
  route_name?: string;
  is_active?: boolean;
}

// DriverData interface for API responses
export interface DriverData {
  id: string;
  driver_id?: string; // Make optional since API might not always provide it
  driver_name?: string;
  license_no?: string;
  license_number?: string;
  phone?: string;
  email?: string;
  photo_url?: string;
  created_at?: string;
}

// DriverFormData interface for forms
export interface DriverFormData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_photo_url: string;
  password?: string; // Make optional for updates
  role: string;
}

// ===== BUS MANAGEMENT TYPES =====
export interface Bus {
  id: string;
  code: string;
  name?: string;
  bus_number: string;
  capacity: number;
  model?: string;
  year?: number;
  bus_image_url?: string;
  photo_url?: string;
  assigned_driver_profile_id?: string;
  driver_id?: string;
  route_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Additional properties for compatibility
  vehicle_no?: string;
  bus_id?: string; // Alternative ID field
  busId?: string; // Alternative ID field (camelCase)
  // Joined data from queries
  driver_full_name?: string;
  driver_email?: string;
  driver_first_name?: string;
  driver_last_name?: string;
  route_name?: string;
  // Live location tracking properties (for Student Map)
  location?: { lat: number; lng: number; timestamp?: string };
  speed?: number;
  label?: string;
  // Nested meta object support
  meta?: { id?: string | number; [key: string]: unknown };
  // Route ID variations for compatibility
  routeId?: string; // camelCase variation
}

// BusData interface for API responses (with optional id)
export interface BusData {
  id?: string;
  code: string;
  name?: string | null;
  bus_number: string;
  capacity: number;
  model?: string | null;
  year?: number | null;
  bus_image_url?: string | null;
  photo_url?: string | null;
  vehicle_no?: string | null;
  assigned_driver_profile_id?: string | null;
  driver_id?: string | null;
  route_id?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Joined data from queries
  driver_full_name?: string;
  driver_email?: string;
  driver_first_name?: string;
  driver_last_name?: string;
  route_name?: string;
}

// BusFormData interface for forms
export interface BusFormData {
  bus_number: string;
  vehicle_no: string;
  capacity: number;
  model: string;
  year: number;
  bus_image_url: string;
  assigned_driver_profile_id: string;
  route_id: string;
  is_active: boolean;
}

// ===== ROUTE MANAGEMENT TYPES =====
export interface Route {
  id: string;
  name: string;
  description?: string;
  geom?: { coordinates?: [number, number][] } | any; // PostGIS geometry or GeoJSON
  stops?: Array<{ lat: number; lng: number; coordinates?: [number, number]; location?: { lat: number; lng: number } }> | any; // PostGIS geometry or array
  coordinates?: [number, number][]; // Direct coordinates array for map rendering
  color?: string; // Route color for map display
  total_distance_m?: number;
  distance_km?: number;
  estimated_duration_minutes?: number;
  map_image_url?: string;
  route_map_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Custom route points
  origin?: string;
  destination?: string;
  city?: string;
  custom_destination?: string;
  custom_origin?: string;
  custom_destination_coordinates?: any;
  custom_origin_coordinates?: any;
  destination_coordinates?: any;
  origin_coordinates?: any;
  // Route configuration
  use_custom_arrival?: boolean;
  custom_arrival_point?: string;
  custom_arrival_coordinates?: any;
  use_custom_starting_point?: boolean;
  custom_starting_point?: string;
  custom_starting_coordinates?: any;
  arrival_point_type?:
    | 'ganpat_university'
    | 'custom_arrival'
    | 'driver_location';
  starting_point_type?: 'route_origin' | 'custom_starting' | 'driver_location';
  use_custom_origin?: boolean;
  custom_origin_point?: string;
  origin_point_type?: 'driver_location' | 'custom_origin';
  // Bus stops
  bus_stops?: BusStop[];
  // ETA tracking
  last_eta_calculation?: string;
  current_eta_minutes?: number;
}

// RouteData interface for API responses
export interface RouteData {
  id: string;
  name: string;
  description?: string;
  geom?: any; // PostGIS geometry (optional for API responses)
  stops?: any; // PostGIS geometry
  total_distance_m?: number;
  distance_km?: number;
  estimated_duration_minutes?: number;
  map_image_url?: string;
  route_map_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Custom route points
  origin?: string;
  destination?: string;
  city?: string;
  custom_destination?: string;
  custom_origin?: string;
  custom_destination_coordinates?: any;
  custom_origin_coordinates?: any;
  destination_coordinates?: any;
  origin_coordinates?: any;
  // Route configuration
  use_custom_arrival?: boolean;
  custom_arrival_point?: string;
  custom_arrival_coordinates?: any;
  use_custom_starting_point?: boolean;
  custom_starting_point?: string;
  custom_starting_coordinates?: any;
  arrival_point_type?:
    | 'ganpat_university'
    | 'custom_arrival'
    | 'driver_location';
  starting_point_type?: 'route_origin' | 'custom_starting' | 'driver_location';
  use_custom_origin?: boolean;
  custom_origin_point?: string;
  origin_point_type?: 'driver_location' | 'custom_origin';
  // Bus stops
  bus_stops?: BusStop[];
  // ETA tracking
  last_eta_calculation?: string;
  current_eta_minutes?: number;
}

export interface BusStop {
  id: string;
  route_id: string;
  name: string;
  description?: string;
  location: any; // PostGIS geometry
  stop_order: number;
  estimated_time_from_start?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  name: string;
  geom: any; // PostGIS geometry
  seq: number;
}

// ===== LOCATION TRACKING TYPES =====
export interface BusLocation {
  busId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  eta?: ETAInfo;
  nearStop?: NearStopInfo;
}

export interface LiveLocation {
  id: string;
  bus_id: string;
  location: any; // PostGIS Point geometry
  speed_kmh?: number;
  heading_degrees?: number;
  recorded_at: string;
}

export interface BusLocationLive {
  bus_id: string;
  geom: any; // PostGIS geometry
  lat: number;
  lng: number;
  speed_kmh?: number;
  heading?: number;
  accuracy_m?: number;
  updated_at: string;
}

export interface BusLocationHistory {
  id: string;
  bus_id: string;
  geom: any; // PostGIS geometry
  speed_kmh?: number;
  heading?: number;
  recorded_at: string;
}

export interface ETAInfo {
  bus_id: string;
  route_id: string;
  current_location: [number, number];
  next_stop: string;
  distance_remaining: number;
  estimated_arrival_minutes: number;
  is_near_stop: boolean;
}

export interface NearStopInfo {
  is_near_stop: boolean;
  distance_to_stop: number;
}

// ===== DRIVER ASSIGNMENT TYPES =====
export interface DriverBusAssignment {
  id: string;
  driver_id: string;
  bus_id: string;
  route_id?: string;
  is_active: boolean;
  assigned_at?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== DESTINATION TYPES =====
export interface Destination {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  location: any; // PostGIS geometry
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DefaultDestination {
  id: string;
  name: string;
  description?: string;
  location: any; // PostGIS geometry
  address?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ===== SYSTEM TYPES =====
export interface SystemConstant {
  id: number;
  constant_name: string;
  constant_value: any; // JSONB
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== API RESPONSE TYPES =====
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  error?: string;
  services: {
    database: {
      status: string;
      details: {
        status: string;
        details: {
          currentTime: string;
          postgresVersion: string;
          poolSize: number;
          idleCount: number;
          waitingCount: number;
        };
      };
    };
    api: {
      status: string;
      database: string;
    };
  };
}

// ===== ANALYTICS TYPES =====
export interface AnalyticsData {
  totalBuses: number;
  activeBuses: number;
  totalRoutes: number;
  activeRoutes: number;
  totalDrivers: number;
  activeDrivers: number;
  averageDelay: number;
  busUsageStats: {
    date: string;
    activeBuses: number;
    totalTrips: number;
  }[];
}

// ===== FRONTEND-SPECIFIC TYPES =====
export interface BusInfo {
  busId: string;
  busNumber: string;
  routeName: string;
  driverName: string;
  currentLocation: BusLocation;
  eta?: number;
  // CRITICAL FIX: Added missing properties for bus info sync
  driverId?: string;
  routeId?: string;
  id?: string; // For compatibility with API responses
  bus_id?: string; // For compatibility with API responses
  route_id?: string; // For compatibility with API responses
}

// ===== WEBSOCKET TYPES =====
export interface WebSocketStats {
  isConnected: boolean;
  connectionState: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export interface DriverConnectionData {
  driverId: string;
  busId: string;
  timestamp: string;
}

export interface BusArrivingData {
  busId: string;
  routeId: string;
  location: [number, number];
  timestamp: string;
}

export interface StudentConnectionData {
  timestamp: string;
}
