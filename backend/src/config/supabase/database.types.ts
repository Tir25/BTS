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
          role: 'driver' | 'student' | 'admin';
          is_active: boolean;
          email_verified: boolean;
          created_at: string;
          updated_at: string;
          last_login: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: 'driver' | 'student' | 'admin';
          is_active?: boolean;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: 'driver' | 'student' | 'admin';
          is_active?: boolean;
          email_verified?: boolean;
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
          assigned_driver_profile_id: string | null;
          route_id: string | null;
          assignment_status: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bus_number: string;
          vehicle_no: string;
          assigned_driver_profile_id?: string | null;
          route_id?: string | null;
          assignment_status?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bus_number?: string;
          vehicle_no?: string;
          assigned_driver_profile_id?: string | null;
          route_id?: string | null;
          assignment_status?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      routes: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'driver' | 'student' | 'admin';
    };
  };
}

