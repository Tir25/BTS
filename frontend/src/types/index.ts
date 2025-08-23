// Unified Type Definitions for Bus Tracking System
export interface User {
  id: string;
  email: string;
  role: 'student' | 'driver' | 'admin';
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'student' | 'driver' | 'admin';
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Bus {
  id: string;
  bus_number: string;
  capacity: number;
  is_active: boolean;
  bus_image_url?: string;
  assigned_driver_id?: string;
  route_id?: string;
  created_at: string;
  updated_at: string;
  driver?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

export interface Route {
  id: string;
  name: string;
  description: string;
  start_location: string;
  end_location: string;
  coordinates: [number, number][];
  distance_km: number;
  estimated_duration_minutes: number;
  route_map_url?: string;
  city?: string;
  origin?: string;
  destination?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  profile_photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
