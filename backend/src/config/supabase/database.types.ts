/**
 * Database Types
 * Shared database type definitions for Supabase clients
 * 
 * Note: This is a placeholder. In production, generate types from Supabase:
 * npx supabase gen types typescript --project-id <project-id> > database.types.ts
 */

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          role: 'driver' | 'student' | 'admin';
          is_driver: boolean;
          is_active: boolean;
          email_verified: boolean;
          profile_photo_url: string | null;
          created_at: string;
          updated_at: string;
          last_login: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          role?: 'driver' | 'student' | 'admin';
          is_driver?: boolean;
          is_active?: boolean;
          email_verified?: boolean;
          profile_photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          role?: 'driver' | 'student' | 'admin';
          is_driver?: boolean;
          is_active?: boolean;
          email_verified?: boolean;
          profile_photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
        };
      };
      buses: {
        Row: {
          id: string;
          bus_number: string;
          vehicle_no: string;
          capacity: number;
          model: string | null;
          year: number | null;
          bus_image_url: string | null;
          assigned_driver_profile_id: string | null;
          route_id: string | null;
          assignment_status: string;
          assignment_notes?: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bus_number: string;
          vehicle_no: string;
          capacity: number;
          model?: string | null;
          year?: number | null;
          bus_image_url?: string | null;
          assigned_driver_profile_id?: string | null;
          route_id?: string | null;
          assignment_status?: string;
          assignment_notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bus_number?: string;
          vehicle_no?: string;
          capacity?: number;
          model?: string | null;
          year?: number | null;
          bus_image_url?: string | null;
          assigned_driver_profile_id?: string | null;
          route_id?: string | null;
          assignment_status?: string;
          assignment_notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      routes: {
        Row: {
          id: string;
          name: string;
          description: string;
          distance_km: number;
          estimated_duration_minutes: number;
          city: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          distance_km?: number;
          estimated_duration_minutes?: number;
          city?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          distance_km?: number;
          estimated_duration_minutes?: number;
          city?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Minimal tables referenced by service logic (for deletes/updates)
      route_stops: {
        Row: { id: string; route_id: string };
        Insert: { id?: string; route_id: string };
        Update: { id?: string; route_id?: string };
      };
      route_details: {
        Row: { id: string; route_id: string };
        Insert: { id?: string; route_id: string };
        Update: { id?: string; route_id?: string };
      };
      bus_route_assignments: {
        Row: { id: string; route_id: string; bus_id: string };
        Insert: { id?: string; route_id: string; bus_id: string };
        Update: { id?: string; route_id?: string; bus_id?: string };
      };
      bus_route_shifts: {
        Row: { id: string; route_id: string; shift_id: string };
        Insert: { id?: string; route_id: string; shift_id: string };
        Update: { id?: string; route_id?: string; shift_id?: string };
      };
      assignment_history: {
        Row: { id: string; route_id: string | null };
        Insert: { id?: string; route_id?: string | null };
        Update: { id?: string; route_id?: string | null };
      };

      // Additional tables referenced in services
      live_locations: {
        Row: { id: string; bus_id: string; driver_id: string; recorded_at: string };
        Insert: { id?: string; bus_id: string; driver_id: string; recorded_at?: string };
        Update: { id?: string; bus_id?: string; driver_id?: string; recorded_at?: string };
      };
      users: {
        Row: { id: string; first_name: string | null; last_name: string | null };
        Insert: { id: string; first_name?: string | null; last_name?: string | null };
        Update: { id?: string; first_name?: string | null; last_name?: string | null };
      };
      user_roles: {
        Row: { id: string; user_id: string; role: string };
        Insert: { id?: string; user_id: string; role: string };
        Update: { id?: string; user_id?: string; role?: string };
      };
      shifts: {
        Row: { id: string; driver_id: string };
        Insert: { id?: string; driver_id: string };
        Update: { id?: string; driver_id?: string };
      };
    };
    Views: {
      // View used by route service to read route metadata
      route_management_view: {
        Row: {
          id: string;
          name: string;
          description: string;
          distance_km: number;
          estimated_duration_minutes: number;
          city: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          // Optional geometry fields if present in the view
          stops?: any;
          geom?: any;
        };
      };
      // Views used by UnifiedDatabaseService
      bus_management_view: {
        Row: {
          id: string;
          bus_number: string;
          vehicle_no: string;
          capacity: number;
          model: string | null;
          year: number | null;
          bus_image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          assigned_driver_profile_id: string | null;
          driver_full_name: string | null;
          driver_email: string | null;
          driver_first_name: string | null;
          driver_last_name: string | null;
          route_id: string | null;
          route_name: string | null;
        };
      };
      driver_management_view: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          role: 'driver' | 'student' | 'admin';
          is_driver: boolean;
          is_active: boolean;
          profile_photo_url: string | null;
          created_at: string;
          updated_at: string;
          assigned_bus_id: string | null;
          assigned_bus_plate: string | null;
          route_name: string | null;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'driver' | 'student' | 'admin';
    };
  };
}

