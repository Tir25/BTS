import { supabase } from '../config/supabase';
import { environment } from '../config/environment';

export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
  };
  created_at: string;
  last_sign_in_at?: string;
}

export interface DriverProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

class SupabaseUserService {
  // Get all users from profiles table (frontend-safe)
  async getAllUsers(): Promise<SupabaseUser[]> {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching profiles:', error);
        throw error;
      }

      // Convert profiles to SupabaseUser format
      return (profiles || []).map((profile) => ({
        id: profile.id,
        email: profile.email || '',
        user_metadata: {
          full_name: profile.full_name,
          role: profile.role,
        },
        created_at: profile.created_at,
        last_sign_in_at: profile.updated_at,
      }));
    } catch (error) {
      console.error('❌ Error in getAllUsers:', error);
      throw error;
    }
  }

  // Get users with driver role from profiles table (only unassigned drivers)
  async getDriverUsers(): Promise<DriverProfile[]> {
    try {
      console.log('🔄 Fetching driver profiles from Supabase...');

      // First get all drivers
      const { data: allDrivers, error: driversError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('created_at', { ascending: false });

      if (driversError) {
        console.error('❌ Error fetching driver profiles:', driversError);
        throw driversError;
      }

      console.log('✅ Found', allDrivers?.length || 0, 'total drivers');

      // Then get all assigned driver IDs
      const { data: assignedDrivers, error: assignedError } = await supabase
        .from('buses')
        .select('assigned_driver_id')
        .not('assigned_driver_id', 'is', null);

      if (assignedError) {
        console.error('❌ Error fetching assigned drivers:', assignedError);
        throw assignedError;
      }

      console.log('✅ Found', assignedDrivers?.length || 0, 'assigned drivers');

      // Filter out assigned drivers
      const assignedDriverIds = new Set(
        assignedDrivers?.map((bus) => bus.assigned_driver_id) || []
      );
      const unassignedDrivers =
        allDrivers?.filter((driver) => !assignedDriverIds.has(driver.id)) || [];

      console.log(
        '✅ Returning',
        unassignedDrivers.length,
        'unassigned drivers'
      );
      return unassignedDrivers;
    } catch (error) {
      console.error('❌ Error in getDriverUsers:', error);
      throw error;
    }
  }

  // Get all drivers (including assigned ones) - for admin purposes
  async getAllDriverUsers(): Promise<DriverProfile[]> {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all driver profiles:', error);
        throw error;
      }

      return profiles || [];
    } catch (error) {
      console.error('❌ Error in getAllDriverUsers:', error);
      throw error;
    }
  }

  // Get users with admin role from profiles table
  async getAdminUsers(): Promise<DriverProfile[]> {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching admin profiles:', error);
        throw error;
      }

      return profiles || [];
    } catch (error) {
      console.error('❌ Error in getAdminUsers:', error);
      throw error;
    }
  }

  // Get all users with their profiles
  async getUsersWithProfiles(): Promise<DriverProfile[]> {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'driver'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching users with profiles:', error);
        throw error;
      }

      return profiles || [];
    } catch (error) {
      console.error('❌ Error in getUsersWithProfiles:', error);
      throw error;
    }
  }

  // Frontend-safe user creation (redirects to backend API)
  async createUser(
    email: string,
    password: string,
    metadata: any
  ): Promise<any> {
    try {
      // Instead of using admin functions, call the backend API
      const response = await fetch(`${environment.api.url}/admin/drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAccessToken()}`,
        },
        body: JSON.stringify({
          email,
          password,
          first_name: metadata.full_name?.split(' ')[0] || '',
          last_name: metadata.full_name?.split(' ').slice(1).join(' ') || '',
          role: 'driver',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error in createUser:', error);
      throw error;
    }
  }

  // Frontend-safe user metadata update (redirects to backend API)
  async updateUserMetadata(userId: string, metadata: any): Promise<any> {
    try {
      // Instead of using admin functions, call the backend API
      const response = await fetch(`${environment.api.url}/admin/drivers/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAccessToken()}`,
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error in updateUserMetadata:', error);
      throw error;
    }
  }

  // Helper method to get access token
  private getAccessToken(): string | null {
    try {
      // Try multiple localStorage keys that Supabase might use
      const possibleKeys = [
        'supabase.auth.token',
        'sb-gthwmwfwvhyriygpcdlr-auth-token',
        'supabase.auth.session',
      ];

      for (const key of possibleKeys) {
        const storedSession = localStorage.getItem(key);
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);
          const token =
            parsedSession?.currentSession?.access_token ||
            parsedSession?.access_token ||
            parsedSession?.session?.access_token ||
            null;

          if (token) {
            return token;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error reading token from localStorage:', error);
    }

    return null;
  }
}

export const supabaseUserService = new SupabaseUserService();
export default supabaseUserService;
