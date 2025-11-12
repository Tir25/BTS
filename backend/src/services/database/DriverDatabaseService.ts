/**
 * Driver Database Service
 * Handles all driver-related database operations
 */

import { supabaseAdmin } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { createClient } from '@supabase/supabase-js';

export interface DriverData {
  id?: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  is_driver?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Service for driver database operations
 */
export class DriverDatabaseService {
  /**
   * Get all drivers
   */
  static async getAllDrivers(): Promise<DriverData[]> {
    try {
      // Use the driver_management_view for comprehensive data
      const { data: drivers, error } = await supabaseAdmin
        .from('driver_management_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching all drivers', 'driver-db-service', { error });
        throw error;
      }

      if (!drivers || drivers.length === 0) {
        logger.info('No drivers found in database', 'driver-db-service');
        return [];
      }

      logger.info(`Fetched ${drivers.length} drivers from database`, 'driver-db-service');

      return drivers.map((driver: any) => ({
        id: driver.id,
        email: driver.email,
        full_name: driver.full_name,
        first_name: driver.first_name,
        last_name: driver.last_name,
        phone: driver.phone,
        role: driver.role,
        is_driver: driver.is_driver,
        is_active: driver.is_active,
        profile_photo_url: driver.profile_photo_url,
        created_at: driver.created_at,
        updated_at: driver.updated_at,
        assigned_bus_id: driver.assigned_bus_id,
        assigned_bus_plate: driver.assigned_bus_plate,
        route_name: driver.route_name,
      }));
    } catch (error) {
      logger.error('Error in getAllDrivers', 'driver-db-service', { error });
      throw error;
    }
  }

  /**
   * Get driver by ID
   */
  static async getDriverById(driverId: string): Promise<DriverData | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          role,
          is_driver,
          is_active,
          created_at,
          updated_at
        `)
        .eq('id', driverId)
        .eq('role', 'driver')
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        logger.error('Error fetching driver by ID', 'driver-db-service', { error, driverId });
        throw error;
      }

      if (!data) return null;

      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        role: data.role,
        is_driver: data.is_driver,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      logger.error('Error in getDriverById', 'driver-db-service', { error, driverId });
      throw error;
    }
  }

  /**
   * Create driver with Supabase Auth integration
   */
  static async createDriver(driverData: any): Promise<DriverData> {
    try {
      // Enhanced validation
      if (!driverData.email || !driverData.first_name || !driverData.last_name || !driverData.password) {
        throw new Error('Missing required fields: email, first_name, last_name, and password are required');
      }

      // Create Supabase client for auth operations
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase configuration missing');
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: driverData.email,
        password: driverData.password,
        email_confirm: true,
        user_metadata: {
          first_name: driverData.first_name,
          last_name: driverData.last_name,
          full_name: `${driverData.first_name} ${driverData.last_name}`,
          role: 'driver',
        },
      });

      if (authError) {
        logger.error('Error creating driver in auth', 'driver-db-service', { error: authError });
        throw new Error(`Failed to create driver account: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create driver account: No user returned');
      }

      // Create driver profile in user_profiles table
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: driverData.email,
          full_name: `${driverData.first_name} ${driverData.last_name}`,
          first_name: driverData.first_name,
          last_name: driverData.last_name,
          phone: driverData.phone,
          role: 'driver',
          is_driver: true,
          is_active: true,
        })
        .select()
        .single();

      if (profileError) {
        logger.error('Error creating driver profile', 'driver-db-service', { error: profileError });
        // Try to clean up auth user if profile creation fails
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (cleanupError) {
          logger.error('Error cleaning up auth user after profile creation failure', 'driver-db-service', { error: cleanupError });
        }
        throw new Error(`Failed to create driver profile: ${profileError.message}`);
      }

      logger.info('Driver created successfully', 'driver-db-service', { driverId: profileData.id });

      return {
        id: profileData.id,
        email: profileData.email,
        full_name: profileData.full_name,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        role: profileData.role,
        is_driver: profileData.is_driver,
        is_active: profileData.is_active,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
      };
    } catch (error) {
      logger.error('Error in createDriver', 'driver-db-service', { error, driverData });
      throw error;
    }
  }

  /**
   * Update driver
   */
  static async updateDriver(driverId: string, driverData: Partial<DriverData>): Promise<DriverData | null> {
    try {
      const updateData: any = {};

      if (driverData.email !== undefined) updateData.email = driverData.email;
      if (driverData.full_name !== undefined) updateData.full_name = driverData.full_name;
      if (driverData.first_name !== undefined) updateData.first_name = driverData.first_name;
      if (driverData.last_name !== undefined) updateData.last_name = driverData.last_name;
      if (driverData.phone !== undefined) updateData.phone = driverData.phone;
      if (driverData.is_active !== undefined) updateData.is_active = driverData.is_active;

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update(updateData)
        .eq('id', driverId)
        .eq('role', 'driver')
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        logger.error('Error updating driver', 'driver-db-service', { error, driverId, driverData });
        throw error;
      }

      logger.info('Driver updated successfully', 'driver-db-service', { driverId: data.id });

      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        role: data.role,
        is_driver: data.is_driver,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      logger.error('Error in updateDriver', 'driver-db-service', { error, driverId, driverData });
      throw error;
    }
  }

  /**
   * Delete driver (hard delete - removes all related data)
   */
  static async deleteDriver(driverId: string): Promise<DriverData | null> {
    try {
      // First, get the driver data before deletion
      const { data: driverData, error: fetchError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email')
        .eq('id', driverId)
        .eq('role', 'driver')
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return null; // No driver found
        }
        logger.error('Error fetching driver for deletion', 'driver-db-service', { error: fetchError, driverId });
        throw fetchError;
      }

      // Delete all driver-related data first
      // 1. Delete live locations
      await supabaseAdmin
        .from('live_locations')
        .delete()
        .eq('driver_id', driverId);

      // 2. Update buses to unassign driver and route
      const { data: assignedBuses } = await supabaseAdmin
        .from('buses')
        .select('id, route_id')
        .eq('assigned_driver_profile_id', driverId);

      // Update buses to remove driver assignment and unassign route
      const { error: busUpdateError } = await supabaseAdmin
        .from('buses')
        .update({
          assigned_driver_profile_id: null,
          route_id: null,
          assignment_status: 'unassigned',
          assignment_notes: `Driver deleted - route unassigned at ${new Date().toISOString()}`,
          updated_at: new Date().toISOString()
        })
        .eq('assigned_driver_profile_id', driverId);

      if (busUpdateError) {
        logger.error('Error updating buses when deleting driver', 'driver-db-service', { error: busUpdateError, driverId });
        throw busUpdateError;
      }

      // Log which routes were unassigned
      if (assignedBuses && assignedBuses.length > 0) {
        const routeIds = (assignedBuses as any[]).map((b: any) => b.route_id).filter(Boolean);
        if (routeIds.length > 0) {
          logger.info('Routes unassigned from buses (routes remain in database)', 'driver-db-service', { 
            driverId, 
            routeIds,
            busIds: (assignedBuses as any[]).map((b: any) => b.id)
          });
        }
      }

      // 3. Delete from bus_route_assignments
      await supabaseAdmin
        .from('bus_route_assignments')
        .delete()
        .eq('driver_id', driverId);

      // 4. Delete driver profile
      const { error: deleteError } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', driverId)
        .eq('role', 'driver');

      if (deleteError) {
        logger.error('Error deleting driver profile', 'driver-db-service', { error: deleteError, driverId });
        throw deleteError;
      }

      // 5. Delete from Supabase Auth
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseServiceKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          const { error: authDeleteError } = await supabase.auth.admin.deleteUser(driverId);
          
          if (authDeleteError) {
            logger.warn('Error deleting driver from auth (non-critical)', 'driver-db-service', { error: authDeleteError, driverId });
          }
        } catch (authError) {
          logger.warn('Error deleting driver from auth (non-critical)', 'driver-db-service', { error: authError, driverId });
        }
      }

      logger.info('Driver deleted successfully', 'driver-db-service', { driverId });

      return {
        id: driverData.id,
        email: driverData.email,
        full_name: '',
        role: 'driver',
        is_driver: true,
        is_active: false,
      };
    } catch (error) {
      logger.error('Error in deleteDriver', 'driver-db-service', { error, driverId });
      throw error;
    }
  }

  /**
   * Cleanup inactive drivers
   */
  static async cleanupInactiveDrivers(): Promise<{ cleaned: number; errors: string[] }> {
    try {
      const errors: string[] = [];
      let cleaned = 0;

      // Find inactive drivers (drivers with is_active = false)
      const { data: inactiveDrivers, error: fetchError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email')
        .eq('role', 'driver')
        .eq('is_active', false);

      if (fetchError) {
        logger.error('Error fetching inactive drivers', 'driver-db-service', { error: fetchError });
        throw fetchError;
      }

      if (!inactiveDrivers || inactiveDrivers.length === 0) {
        logger.info('No inactive drivers to clean up', 'driver-db-service');
        return { cleaned: 0, errors: [] };
      }

      // Delete each inactive driver
      for (const driver of inactiveDrivers) {
        try {
          await this.deleteDriver(driver.id);
          cleaned++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to delete driver ${driver.id}: ${errorMessage}`);
          logger.error('Error deleting inactive driver', 'driver-db-service', { error, driverId: driver.id });
        }
      }

      logger.info('Cleanup inactive drivers completed', 'driver-db-service', { cleaned, errors: errors.length });

      return { cleaned, errors };
    } catch (error) {
      logger.error('Error in cleanupInactiveDrivers', 'driver-db-service', { error });
      throw error;
    }
  }
}

