import { supabase } from '../config/supabase';
import { environment } from '../config/environment';
import { authService } from './authService';

import { logger } from '../utils/logger';

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
  // Get all users from user_profiles table (frontend-safe)
  async getAllUsers(): Promise<SupabaseUser[]> {
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error occurred', 'component', { error });
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
      logger.error('Error occurred', 'component', { error });
      throw error;
    }
  }

  // Get users with driver role from profiles table (only unassigned drivers)
  async getDriverUsers(): Promise<DriverProfile[]> {
    try {
      logger.info('🔄 Fetching driver profiles from Supabase...', 'component');

      // First get all drivers
      const { data: allDrivers, error: driversError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'driver')
        .order('created_at', { ascending: false });

      if (driversError) {
        logger.error('Error occurred', 'component', { error: '❌ Error fetching driver profiles:', driversError });
        throw driversError;
      }

      logger.info(`✅ Found ${allDrivers?.length || 0} total drivers`, 'component');

      // Then get all assigned driver IDs
      const { data: assignedDrivers, error: assignedError } = await supabase
        .from('buses')
        .select('assigned_driver_profile_id')
        .not('assigned_driver_profile_id', 'is', null);

      if (assignedError) {
        logger.error('Error occurred', 'component', { error: '❌ Error fetching assigned drivers:', assignedError });
        throw assignedError;
      }

      logger.info(`✅ Found ${assignedDrivers?.length || 0} assigned drivers`, 'component');

      // Filter out assigned drivers
      const assignedDriverIds = new Set(
        assignedDrivers?.map((bus) => bus.assigned_driver_profile_id) || []
      );
      const unassignedDrivers =
        allDrivers?.filter((driver) => !assignedDriverIds.has(driver.id)) || [];

      logger.info(`✅ Returning ${unassignedDrivers.length} unassigned drivers`, 'component');
      return unassignedDrivers;
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      throw error;
    }
  }

  // Get all drivers (including assigned ones) - for admin purposes
  async getAllDriverUsers(): Promise<DriverProfile[]> {
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'driver')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error occurred', 'component', { error });
        throw error;
      }

      return profiles || [];
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      throw error;
    }
  }

  // Get users with admin role from user_profiles table
  async getAdminUsers(): Promise<DriverProfile[]> {
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error occurred', 'component', { error });
        throw error;
      }

      return profiles || [];
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      throw error;
    }
  }

  // Get all users with their profiles
  async getUsersWithProfiles(): Promise<DriverProfile[]> {
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['admin', 'driver'])
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error occurred', 'component', { error });
        throw error;
      }

      return profiles || [];
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
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
      // PRODUCTION FIX: Normalize URL to prevent double-slash issues
      const baseUrl = environment.api.baseUrl.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/admin/drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getAccessToken()}`,
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
      logger.error('Error occurred', 'component', { error });
      throw error;
    }
  }

  // Frontend-safe user metadata update (redirects to backend API)
  async updateUserMetadata(userId: string, metadata: any): Promise<any> {
    try {
      // Instead of using admin functions, call the backend API
      // PRODUCTION FIX: Normalize URL to prevent double-slash issues
      const baseUrl = environment.api.baseUrl.replace(/\/+$/, '');
      const response = await fetch(
        `${baseUrl}/admin/drivers/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authService.getAccessToken()}`,
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      return await response.json();
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      throw error;
    }
  }

  // PRODUCTION FIX: Use centralized authService for token management
  // Removed redundant getAccessToken method - now using authService.getAccessToken()
  // This ensures consistent token validation and expiration checking across the app
}

export const supabaseUserService = new SupabaseUserService();
export default supabaseUserService;
