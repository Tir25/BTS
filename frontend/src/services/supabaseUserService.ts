import { supabase } from '../config/supabase';

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
  // Get all users from Supabase Auth (Note: This requires admin privileges)
  async getAllUsers(): Promise<SupabaseUser[]> {
    try {
      // This method requires admin privileges and should be called from backend
      // For frontend, we'll use the profiles table instead
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

  // Create a new user in Supabase Auth
  async createUser(
    email: string,
    password: string,
    metadata: any
  ): Promise<any> {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: metadata,
        email_confirm: true, // Auto-confirm email for testing
      });

      if (error) {
        console.error('❌ Error creating user in Supabase:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error in createUser:', error);
      throw error;
    }
  }

  // Update user metadata
  async updateUserMetadata(userId: string, metadata: any): Promise<any> {
    try {
      const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: metadata,
      });

      if (error) {
        console.error('❌ Error updating user metadata:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error in updateUserMetadata:', error);
      throw error;
    }
  }
}

export const supabaseUserService = new SupabaseUserService();
export default supabaseUserService;
