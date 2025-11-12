/**
 * Enhanced Type Definitions
 * Comprehensive type safety for the entire application
 */

// Generic API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Enhanced User Types
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
  full_name: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_driver: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Enhanced Bus Types
export interface Bus {
  id: string;
  bus_number: string;
  vehicle_no: string;
  capacity: number;
  model?: string;
  year?: number;
  bus_image_url?: string;
  assigned_driver_profile_id?: string;
  route_id?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BusLocation {
  id: string;
  bus_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface BusInfo {
  id: string;
  bus_number: string;
  vehicle_no: string;
  capacity: number;
  current_location?: BusLocation;
  assigned_driver?: string;
  route?: string;
  is_active: boolean;
}

// Enhanced Route Types
export interface Route {
  id: string;
  name: string;
  description?: string;
  city: string;
  geojson_data?: GeoJSON.FeatureCollection;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RouteData {
  id: string;
  name: string;
  description?: string;
  city: string;
  geojson_data?: GeoJSON.FeatureCollection;
  is_active: boolean;
}

// Enhanced Driver Types
export interface Driver {
  id: string;
  user_id: string;
  license_number: string;
  license_expiry: string;
  phone: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DriverData {
  id: string;
  user_id: string;
  license_number: string;
  license_expiry: string;
  phone: string;
  is_active: boolean;
}

// Enhanced Location Types
export interface Location {
  id: string;
  bus_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

// Enhanced Assignment Types
export interface Assignment {
  id: string;
  driver_id: string;
  bus_id: string;
  route_id: string;
  assigned_by: string;
  notes?: string;
  assigned_at: string;
  status: 'active' | 'inactive' | 'pending';
}

// Enhanced Form Data Types
export interface BusFormData {
  bus_number: string;
  vehicle_no: string;
  capacity: number;
  model?: string;
  year?: number;
  bus_image_url?: string;
  is_active: boolean;
}

export interface DriverFormData {
  user_id: string;
  license_number: string;
  license_expiry: string;
  phone: string;
  is_active: boolean;
}

export interface RouteFormData {
  name: string;
  description?: string;
  city: string;
  geojson_data?: GeoJSON.FeatureCollection;
  is_active: boolean;
}

// Enhanced Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

// Enhanced Health Check Types
export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  error?: string;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    websocket: 'connected' | 'disconnected';
  };
  metrics: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    requests: {
      total: number;
      successful: number;
      failed: number;
    };
  };
}

// Enhanced WebSocket Types
export interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  source: 'client' | 'server';
}

export interface WebSocketStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

// Enhanced Performance Types
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentCount: number;
  longTasks: number;
  frameRate: number;
  lastUpdate: string;
  connectionLatency: number;
  errorRate: number;
}

export interface PerformanceThresholds {
  maxRenderTime: number;
  maxMemoryUsage: number;
  minFrameRate: number;
  maxErrorRate: number;
}

// Enhanced Map Types
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapCenter {
  lat: number;
  lng: number;
  zoom: number;
}

export interface BusCluster {
  id: string;
  center: MapCenter;
  count: number;
  buses: BusInfo[];
  bounds: MapBounds;
}

// Enhanced Configuration Types
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  websocket: {
    url: string;
    reconnectAttempts: number;
    heartbeatInterval: number;
  };
  map: {
    defaultCenter: MapCenter;
    defaultZoom: number;
    maxZoom: number;
    minZoom: number;
  };
  features: {
    clustering: boolean;
    heatmap: boolean;
    offline: boolean;
    notifications: boolean;
    performanceMonitoring: boolean;
  };
}

// Enhanced Event Types
export interface AppEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  source: string;
}

// Enhanced State Types
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  config: AppConfig;
}

// Enhanced Hook Types
export interface UseApiOptions {
  enabled?: boolean;
  retry?: boolean;
  retryCount?: number;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// Enhanced Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Enhanced Generic Types
export type Status = 'idle' | 'loading' | 'success' | 'error';
export type SortOrder = 'asc' | 'desc';
export type SortField<T> = keyof T;
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'ilike';

// Enhanced Query Types
export interface QueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  filters?: Record<string, { operator: FilterOperator; value: unknown }>;
  search?: string;
}

// Enhanced Cache Types
export interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'fifo';
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

// Enhanced Validation Types
export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Enhanced Logger Types
export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export interface LogEntry {
  level: keyof LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: Error;
}
