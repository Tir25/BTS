/**
 * Shared Types for Microservices
 */

// Base API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp: string;
  requestId?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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

// User Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: 'admin' | 'driver' | 'student';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_driver: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Bus Types
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
  created_at: string;
  updated_at: string;
}

// Route Types
export interface Route {
  id: string;
  name: string;
  description?: string;
  city: string;
  geojson_data?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Assignment Types
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

// Location Types
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

// Health Check Types
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  dependencies: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    external_services: Record<string, 'healthy' | 'unhealthy'>;
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

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

// Service Discovery Types
export interface ServiceInstance {
  id: string;
  name: string;
  address: string;
  port: number;
  healthCheck: string;
  version: string;
  tags: string[];
  metadata: Record<string, any>;
}

// Circuit Breaker Types
export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

// Metrics Types
export interface ServiceMetrics {
  service: string;
  timestamp: string;
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number;
  };
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  resources: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
}

// Configuration Types
export interface ServiceConfig {
  name: string;
  port: number;
  database: {
    url: string;
    poolMax: number;
    poolIdleTimeout: number;
    poolConnectionTimeout: number;
  };
  redis: {
    url: string;
    maxRetries: number;
    retryDelay: number;
  };
  cors: {
    allowedOrigins: (string | RegExp)[];
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  circuitBreaker: {
    failureThreshold: number;
    timeout: number;
    retryTimeout: number;
    successThreshold: number;
  };
}

// Event Types
export interface ServiceEvent {
  id: string;
  type: string;
  service: string;
  timestamp: string;
  data: any;
  metadata: Record<string, any>;
}

// Audit Types
export interface AuditLog {
  id: string;
  service: string;
  action: string;
  user_id?: string;
  resource_id?: string;
  timestamp: string;
  data: any;
  ip_address?: string;
  user_agent?: string;
}