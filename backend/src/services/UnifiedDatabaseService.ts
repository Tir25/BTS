/**
 * Unified Database Service
 * Provides a single interface for all database operations using Supabase
 * This eliminates the dual database access pattern and ensures consistency
 */

import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export interface BusData {
  id?: string;
  bus_number: string;
  vehicle_no: string;
  capacity: number;
  model?: string;
  year?: number;
  bus_image_url?: string;
  assigned_driver_profile_id?: string;
  route_id?: string;
  is_active?: boolean;
}

export interface BusWithDriver {
  id: string;
  bus_number: string;
  vehicle_no: string;
  capacity: number;
  model?: string;
  year?: number;
  bus_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  driver_id?: string;
  driver_full_name?: string;
  driver_email?: string;
  driver_first_name?: string;
  driver_last_name?: string;
  route_id?: string;
  route_name?: string;
}

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

export interface RouteData {
  id?: string;
  name: string;
  description?: string;
  origin?: string;
  destination?: string;
  is_active?: boolean;
}

export class UnifiedDatabaseService {
  /**
   * Get all buses with driver and route information
   */
  static async getAllBuses(): Promise<BusWithDriver[]> {
    try {
      // Use the bus_management_view for comprehensive data
      const { data: buses, error: busesError } = await supabaseAdmin
        .from('bus_management_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (busesError) {
        logger.error('Error fetching buses', 'unified-db', { error: busesError });
        throw busesError;
      }

      if (!buses || buses.length === 0) {
        logger.info('No buses found in database', 'unified-db');
        return [];
      }

      logger.info(`Fetched ${buses.length} buses from database`, 'unified-db');

      // Transform data to match expected interface
      return buses.map((bus: any) => ({
        id: bus.id,
        bus_number: bus.bus_number,
        vehicle_no: bus.vehicle_no,
        capacity: bus.capacity,
        model: bus.model,
        year: bus.year,
        bus_image_url: bus.bus_image_url || null,
        is_active: bus.is_active,
        created_at: bus.created_at,
        updated_at: bus.updated_at,
        driver_id: bus.assigned_driver_profile_id || null,
        driver_full_name: bus.driver_full_name || null,
        driver_email: bus.driver_email || null,
        driver_first_name: bus.driver_first_name || null,
        driver_last_name: bus.driver_last_name || null,
        route_id: bus.route_id || null,
        route_name: bus.route_name || null,
      }));
    } catch (error) {
      logger.error('Error in getAllBuses', 'unified-db', { error });
      throw error;
    }
  }

  /**
   * Get bus by ID
   */
  static async getBusById(busId: string): Promise<BusWithDriver | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('buses')
        .select(`
          id,
          bus_number,
          vehicle_no,
          capacity,
          model,
          year,
          bus_image_url,
          is_active,
          created_at,
          updated_at,
          assigned_driver_profile_id,
          route_id,
          user_profiles!buses_assigned_driver_profile_id_fkey(
            id,
            full_name,
            email,
            first_name,
            last_name
          ),
          routes!buses_route_id_fkey(
            id,
            name
          )
        `)
        .eq('id', busId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        logger.error('Error fetching bus by ID', 'unified-db', { error, busId });
        throw error;
      }

      return {
        id: data.id,
        bus_number: data.bus_number,
        vehicle_no: data.vehicle_no,
        capacity: data.capacity,
        model: data.model,
        year: data.year,
        bus_image_url: data.bus_image_url,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
        driver_id: data.assigned_driver_profile_id,
        driver_full_name: (data.user_profiles as any)?.full_name || undefined,
        driver_email: (data.user_profiles as any)?.email || undefined,
        driver_first_name: (data.user_profiles as any)?.first_name || undefined,
        driver_last_name: (data.user_profiles as any)?.last_name || undefined,
        route_id: data.route_id,
        route_name: (data.routes as any)?.name || undefined,
      };
    } catch (error) {
      logger.error('Error in getBusById', 'unified-db', { error, busId });
      throw error;
    }
  }

  /**
   * Create new bus
   */
  static async createBus(busData: BusData): Promise<BusWithDriver> {
    try {
      // Enhanced validation
      if (!busData.bus_number || !busData.vehicle_no || !busData.capacity) {
        throw new Error('Missing required fields: bus_number, vehicle_no, and capacity are required');
      }

      // Check for duplicate bus number (only for active buses)
      const { data: existingBus, error: busCheckError } = await supabaseAdmin
        .from('buses')
        .select('id, is_active')
        .eq('bus_number', busData.bus_number)
        .eq('is_active', true)
        .maybeSingle();

      if (existingBus) {
        throw new Error(`Bus number ${busData.bus_number} already exists`);
      }

      // Check for duplicate vehicle number (only for active buses)
      const { data: existingVehicle, error: vehicleCheckError } = await supabaseAdmin
        .from('buses')
        .select('id, is_active')
        .eq('vehicle_no', busData.vehicle_no)
        .eq('is_active', true)
        .maybeSingle();

      if (existingVehicle) {
        throw new Error(`Vehicle number ${busData.vehicle_no} already exists`);
      }

      // Validate driver assignment if provided
      if (busData.assigned_driver_profile_id) {
        const { data: driver, error: driverError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, role, is_active')
          .eq('id', busData.assigned_driver_profile_id)
          .maybeSingle();

        if (driverError) {
          throw new Error(`Error validating driver: ${driverError.message}`);
        }
        
        if (!driver) {
          throw new Error('Assigned driver not found');
        }

        if (driver.role !== 'driver') {
          throw new Error('Assigned user is not a driver');
        }

        if (!driver.is_active) {
          throw new Error('Assigned driver is not active');
        }

        // Check if driver is already assigned to another bus
        const { data: existingAssignment } = await supabaseAdmin
          .from('buses')
          .select('id, bus_number')
          .eq('assigned_driver_profile_id', busData.assigned_driver_profile_id)
          .eq('is_active', true)
          .maybeSingle();

        if (existingAssignment) {
          throw new Error(`Driver is already assigned to bus ${existingAssignment.bus_number}`);
        }
      }

      // Validate route assignment if provided
      if (busData.route_id) {
        const { data: route, error: routeError } = await supabaseAdmin
          .from('routes')
          .select('id, is_active')
          .eq('id', busData.route_id)
          .maybeSingle();

        if (routeError) {
          throw new Error(`Error validating route: ${routeError.message}`);
        }
        
        if (!route) {
          throw new Error('Assigned route not found');
        }

        if (!route.is_active) {
          throw new Error('Assigned route is not active');
        }
      }

      const { data, error } = await supabaseAdmin
        .from('buses')
        .insert({
          bus_number: busData.bus_number,
          vehicle_no: busData.vehicle_no,
          capacity: busData.capacity,
          model: busData.model,
          year: busData.year,
          bus_image_url: busData.bus_image_url,
          assigned_driver_profile_id: busData.assigned_driver_profile_id === '' ? null : busData.assigned_driver_profile_id,
          route_id: busData.route_id === '' ? null : busData.route_id,
          is_active: busData.is_active !== false,
          // Set assignment status to active if both driver and route are assigned
          assignment_status: (busData.assigned_driver_profile_id && busData.route_id) ? 'active' : 'unassigned',
          assignment_notes: (busData.assigned_driver_profile_id && busData.route_id) ? 'Assignment created via bus management' : null,
        })
        .select(`
          id,
          bus_number,
          vehicle_no,
          capacity,
          model,
          year,
          bus_image_url,
          is_active,
          created_at,
          updated_at,
          assigned_driver_profile_id,
          route_id
        `)
        .single();

      if (error) {
        logger.error('Error creating bus', 'unified-db', { error, busData });
        throw error;
      }

      logger.info('Bus created successfully', 'unified-db', { busId: data.id });
      
      // Return data in the expected format
      return {
        id: data.id,
        bus_number: data.bus_number,
        vehicle_no: data.vehicle_no,
        capacity: data.capacity,
        model: data.model,
        year: data.year,
        bus_image_url: data.bus_image_url,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
        driver_id: data.assigned_driver_profile_id,
        driver_full_name: undefined,
        driver_email: undefined,
        driver_first_name: undefined,
        driver_last_name: undefined,
        route_id: data.route_id,
        route_name: undefined,
      };
    } catch (error) {
      logger.error('Error in createBus', 'unified-db', { error, busData });
      throw error;
    }
  }

  /**
   * Update bus
   */
  static async updateBus(busId: string, busData: Partial<BusData>): Promise<BusWithDriver | null> {
    try {
      const updateData: any = {};
      
      if (busData.bus_number !== undefined) updateData.bus_number = busData.bus_number;
      if (busData.vehicle_no !== undefined) updateData.vehicle_no = busData.vehicle_no;
      if (busData.capacity !== undefined) updateData.capacity = busData.capacity;
      if (busData.model !== undefined) updateData.model = busData.model;
      if (busData.year !== undefined) updateData.year = busData.year;
      if (busData.bus_image_url !== undefined) updateData.bus_image_url = busData.bus_image_url;
      
      // Handle UUID fields properly - convert empty strings to null
      if (busData.assigned_driver_profile_id !== undefined) {
        updateData.assigned_driver_profile_id = busData.assigned_driver_profile_id === '' ? null : busData.assigned_driver_profile_id;
      }
      if (busData.route_id !== undefined) {
        updateData.route_id = busData.route_id === '' ? null : busData.route_id;
      }
      
      if (busData.is_active !== undefined) updateData.is_active = busData.is_active;

      const { data, error } = await supabaseAdmin
        .from('buses')
        .update(updateData)
        .eq('id', busId)
        .select(`
          id,
          bus_number,
          vehicle_no,
          capacity,
          model,
          year,
          bus_image_url,
          is_active,
          created_at,
          updated_at,
          assigned_driver_profile_id,
          route_id
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        logger.error('Error updating bus', 'unified-db', { error, busId, busData });
        throw error;
      }

      logger.info('Bus updated successfully', 'unified-db', { busId });
      return data;
    } catch (error) {
      logger.error('Error in updateBus', 'unified-db', { error, busId, busData });
      throw error;
    }
  }

  /**
   * Delete bus (hard delete - removes all related data)
   */
  static async deleteBus(busId: string): Promise<BusWithDriver | null> {
    try {
      // First, get the bus data before deletion
      const { data: busData, error: fetchError } = await supabaseAdmin
        .from('buses')
        .select('id, bus_number, vehicle_no')
        .eq('id', busId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return null; // No bus found
        }
        logger.error('Error fetching bus for deletion', 'unified-db', { error: fetchError, busId });
        throw fetchError;
      }

      // Delete all bus-related data first
      // 1. Delete live locations
      await supabaseAdmin
        .from('live_locations')
        .delete()
        .eq('bus_id', busId);

      // 2. Update buses table to remove assignment
      await supabaseAdmin
        .from('buses')
        .update({
          assigned_driver_profile_id: null,
          route_id: null,
          assignment_status: 'unassigned',
          assignment_notes: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', busId);

      // 3. Delete from bus_route_assignments
      await supabaseAdmin
        .from('bus_route_assignments')
        .delete()
        .eq('bus_id', busId);

      // 4. Delete from bus_route_shifts
      await supabaseAdmin
        .from('bus_route_shifts')
        .delete()
        .eq('bus_id', busId);

      // 5. Delete from assignment_history
      await supabaseAdmin
        .from('assignment_history')
        .delete()
        .eq('bus_id', busId);

      // 6. Finally, delete the bus profile
      const { error: deleteError } = await supabaseAdmin
        .from('buses')
        .delete()
        .eq('id', busId);

      if (deleteError) {
        logger.error('Error deleting bus profile', 'unified-db', { error: deleteError, busId });
        throw deleteError;
      }

      logger.info('Bus and all related data deleted successfully', 'unified-db', { 
        busId, 
        busNumber: busData.bus_number,
        vehicleNo: busData.vehicle_no 
      });
      
      return busData as any as BusWithDriver;
    } catch (error) {
      logger.error('Error in deleteBus', 'unified-db', { error, busId });
      throw error;
    }
  }

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
        logger.error('Error fetching all drivers', 'unified-db', { error });
        throw error;
      }

      if (!drivers || drivers.length === 0) {
        logger.info('No drivers found in database', 'unified-db');
        return [];
      }

      logger.info(`Fetched ${drivers.length} drivers from database`, 'unified-db');

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
      logger.error('Error in getAllDrivers', 'unified-db', { error });
      throw error;
    }
  }

  /**
   * Get all routes
   */
  static async getAllRoutes(): Promise<RouteData[]> {
    try {
      // Use the route_management_view for comprehensive data
      const { data: routes, error } = await supabaseAdmin
        .from('route_management_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching all routes', 'unified-db', { error });
        throw error;
      }

      if (!routes || routes.length === 0) {
        logger.info('No routes found in database', 'unified-db');
        return [];
      }

      logger.info(`Fetched ${routes.length} routes from database`, 'unified-db');

      return routes.map((route: any) => ({
        id: route.id,
        name: route.name,
        description: route.description,
        distance_km: route.distance_km,
        estimated_duration_minutes: route.estimated_duration_minutes,
        city: route.city,
        custom_origin: route.custom_origin,
        custom_destination: route.custom_destination,
        is_active: route.is_active,
        created_at: route.created_at,
        updated_at: route.updated_at,
        assigned_buses_count: route.assigned_buses_count,
      }));
    } catch (error) {
      logger.error('Error in getAllRoutes', 'unified-db', { error });
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
        logger.error('Error fetching driver by ID', 'unified-db', { error, driverId });
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
      logger.error('Error in getDriverById', 'unified-db', { error, driverId });
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

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(driverData.email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      if (driverData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Check if email already exists in user_profiles (check both active and inactive users)
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, is_active, role')
        .eq('email', driverData.email)
        .maybeSingle();

      if (checkError) {
        logger.error('Error checking existing user', 'unified-db', { error: checkError });
        throw new Error(`Error checking existing user: ${checkError.message}`);
      }

      let reactivatedProfile = null;
      let updatedRoleProfile = null;
      
      if (existingUser) {
        if (existingUser.is_active) {
          // If user exists and is active, check if they're a student (we can convert to driver)
          if (existingUser.role === 'student') {
            logger.info(`Converting student user to driver: ${driverData.email}`, 'unified-db');
            
            // Update the existing student profile to driver
            const { data: updatedProfile, error: updateError } = await supabaseAdmin
              .from('user_profiles')
              .update({
                full_name: `${driverData.first_name} ${driverData.last_name}`,
                first_name: driverData.first_name,
                last_name: driverData.last_name,
                phone: driverData.phone,
                role: 'driver',
                is_driver: true,
                profile_photo_url: driverData.profile_photo_url,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingUser.id)
              .select('*')
              .single();

            if (updateError) {
              logger.error('Error converting user from student to driver', 'unified-db', { error: updateError });
              throw new Error(`Failed to convert user from student to driver: ${updateError.message}`);
            }

            logger.info('User converted from student to driver successfully', 'unified-db', { userId: existingUser.id });
            updatedRoleProfile = updatedProfile;
          } else {
            throw new Error(`User with email ${driverData.email} already exists with role ${existingUser.role}`);
          }
        } else {
          // User exists but is inactive - reactivate them instead of creating new
          logger.info(`Reactivating inactive user: ${driverData.email}`, 'unified-db');
          
          // Update the existing user profile
          const { data: updatedProfile, error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({
              full_name: `${driverData.first_name} ${driverData.last_name}`,
              first_name: driverData.first_name,
              last_name: driverData.last_name,
              phone: driverData.phone,
              role: 'driver',
              is_driver: true,
              is_active: true,
              profile_photo_url: driverData.profile_photo_url,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.id)
            .select('*')
            .single();

          if (updateError) {
            logger.error('Error reactivating user', 'unified-db', { error: updateError });
            throw new Error(`Failed to reactivate user: ${updateError.message}`);
          }

          logger.info('User reactivated successfully', 'unified-db', { userId: existingUser.id });
          reactivatedProfile = updatedProfile;
        }
      }

      // Check if user exists in Supabase Auth (for reactivation case)
      let authData;
      let authError;
      
      if (existingUser && !existingUser.is_active) {
        // User exists in profiles but is inactive - try to get their auth user
        try {
          const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(existingUser.id);
          if (authUser && !getUserError) {
            // Auth user exists, update their password and metadata
            const { data: updatedAuth, error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              password: driverData.password,
              user_metadata: {
                full_name: `${driverData.first_name} ${driverData.last_name}`,
                first_name: driverData.first_name,
                last_name: driverData.last_name,
                phone: driverData.phone,
              }
            });
            
            if (updateAuthError) {
              logger.warn('Could not update auth user, will create new one', 'unified-db', { error: updateAuthError });
              // Fall through to create new auth user
            } else {
              authData = { user: updatedAuth.user };
              authError = null;
            }
          }
        } catch (authCheckError) {
          logger.warn('Could not check auth user, will create new one', 'unified-db', { error: authCheckError });
        }
      }
      
      // If no auth user was found/updated, create a new one
      if (!authData) {
        const createAuthResult = await supabaseAdmin.auth.admin.createUser({
          email: driverData.email,
          password: driverData.password,
          email_confirm: true,
          user_metadata: {
            full_name: `${driverData.first_name} ${driverData.last_name}`,
            first_name: driverData.first_name,
            last_name: driverData.last_name,
            phone: driverData.phone,
            role: 'driver',  // ⚠️ CRITICAL: Set role in metadata so trigger creates correct profile
          }
        });
        
        authData = createAuthResult.data;
        authError = createAuthResult.error;
      }

      if (authError) {
        logger.error('Error creating user in Supabase Auth', 'unified-db', { error: authError });
        throw new Error(`Failed to create user in Supabase Auth: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('No user data returned from Supabase Auth');
      }

      // If we're reactivating an existing user or converting from student to driver, we already updated their profile above
      if (reactivatedProfile) {
        // Profile was already reactivated
        logger.info('Driver reactivated successfully', 'unified-db', { driverId: reactivatedProfile.id });
        return reactivatedProfile;
      }
      
      if (updatedRoleProfile) {
        // Profile was already converted from student to driver
        logger.info('Student successfully converted to driver', 'unified-db', { driverId: updatedRoleProfile.id });
        return updatedRoleProfile;
      }

      // Then create the profile in user_profiles table (for new users only)
      // ⚠️ Use upsert to handle case where trigger already created the profile
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: authData.user.id,
          email: driverData.email,
          full_name: `${driverData.first_name} ${driverData.last_name}`,
          first_name: driverData.first_name,
          last_name: driverData.last_name,
          phone: driverData.phone,
          role: 'driver',
          is_driver: true,
          is_active: true,
          profile_photo_url: driverData.profile_photo_url,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select('*')
        .single();

      if (profileError) {
        logger.error('Error creating driver profile', 'unified-db', { error: profileError });
        
        // Try to clean up the auth user if profile creation fails
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        } catch (cleanupError) {
          logger.error('Error cleaning up auth user', 'unified-db', { error: cleanupError });
        }
        
        // Provide more specific error messages
        if (profileError.code === '23505') {
          throw new Error(`Driver with email ${driverData.email} already exists`);
        } else if (profileError.code === '23503') {
          throw new Error(`Invalid reference in driver profile: ${profileError.message}`);
        } else {
          throw new Error(`Failed to create driver profile: ${profileError.message}`);
        }
      }

      logger.info('Driver created successfully', 'unified-db', { driverId: profileData.id });
      return profileData;
    } catch (error) {
      logger.error('Error in createDriver', 'unified-db', { error, driverData });
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
      if (driverData.role !== undefined) updateData.role = driverData.role;
      if (driverData.is_driver !== undefined) updateData.is_driver = driverData.is_driver;
      if (driverData.is_active !== undefined) updateData.is_active = driverData.is_active;

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update(updateData)
        .eq('id', driverId)
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
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        logger.error('Error updating driver', 'unified-db', { error, driverId, driverData });
        throw error;
      }

      logger.info('Driver updated successfully', 'unified-db', { driverId });
      return data;
    } catch (error) {
      logger.error('Error in updateDriver', 'unified-db', { error, driverId, driverData });
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
        logger.error('Error fetching driver for deletion', 'unified-db', { error: fetchError, driverId });
        throw fetchError;
      }

      // Delete all driver-related data first
      // 1. Delete live locations
      await supabaseAdmin
        .from('live_locations')
        .delete()
        .eq('driver_id', driverId);

      // 2. Update buses to remove driver assignment
      await supabaseAdmin
        .from('buses')
        .update({ assigned_driver_profile_id: null })
        .eq('assigned_driver_profile_id', driverId);

      // 3. Update buses table to remove assignment
      await supabaseAdmin
        .from('buses')
        .update({
          assigned_driver_profile_id: null,
          route_id: null,
          assignment_status: 'unassigned',
          assignment_notes: null,
          updated_at: new Date().toISOString()
        })
        .eq('assigned_driver_profile_id', driverId);

      // 4. Delete from bus_route_assignments
      await supabaseAdmin
        .from('bus_route_assignments')
        .delete()
        .eq('assigned_driver_profile_id', driverId);

      // 5. Delete shifts
      await supabaseAdmin
        .from('shifts')
        .delete()
        .eq('driver_id', driverId);

      // 6. Delete from assignment_history
      await supabaseAdmin
        .from('assignment_history')
        .delete()
        .eq('driver_id', driverId);

      // 7. Delete user_roles
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', driverId);

      // 8. Delete the driver from auth.users
      try {
        await supabaseAdmin.auth.admin.deleteUser(driverId);
        logger.info('Auth user deleted successfully', 'unified-db', { driverId });
      } catch (authError) {
        // Auth user might not exist, which is fine
        logger.warn('Could not delete auth user', 'unified-db', { error: authError, driverId });
      }

      // Finally, delete the driver profile
      const { error: deleteError } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', driverId);

      if (deleteError) {
        logger.error('Error deleting driver profile', 'unified-db', { error: deleteError, driverId });
        throw deleteError;
      }

      logger.info('Driver and all related data deleted successfully', 'unified-db', { 
        driverId, 
        email: driverData.email 
      });
      
      return driverData as DriverData;
    } catch (error) {
      logger.error('Error in deleteDriver', 'unified-db', { error, driverId });
      throw error;
    }
  }

  /**
   * Clean up inactive drivers (soft delete them permanently)
   */
  static async cleanupInactiveDrivers(): Promise<{ cleaned: number; errors: string[] }> {
    try {
      const errors: string[] = [];
      let cleaned = 0;

      // Get all inactive drivers
      const { data: inactiveDrivers, error: fetchError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email')
        .eq('is_active', false)
        .eq('role', 'driver');

      if (fetchError) {
        logger.error('Error fetching inactive drivers', 'unified-db', { error: fetchError });
        return { cleaned: 0, errors: [fetchError.message] };
      }

      if (!inactiveDrivers || inactiveDrivers.length === 0) {
        logger.info('No inactive drivers found to clean up', 'unified-db');
        return { cleaned: 0, errors: [] };
      }

      // Delete each inactive driver
      for (const driver of inactiveDrivers) {
        try {
          // Delete from user_profiles
          const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .delete()
            .eq('id', driver.id);

          if (profileError) {
            errors.push(`Failed to delete profile for ${driver.email}: ${profileError.message}`);
            continue;
          }

          // Try to delete from Supabase Auth
          try {
            await supabaseAdmin.auth.admin.deleteUser(driver.id);
          } catch (authError) {
            // Auth user might not exist, which is fine
            logger.warn('Could not delete auth user', 'unified-db', { error: authError, driverId: driver.id });
          }

          cleaned++;
          logger.info(`Cleaned up inactive driver: ${driver.email}`, 'unified-db');
        } catch (error) {
          errors.push(`Failed to clean up ${driver.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      logger.info(`Cleanup completed: ${cleaned} drivers cleaned, ${errors.length} errors`, 'unified-db');
      return { cleaned, errors };
    } catch (error) {
      logger.error('Error in cleanupInactiveDrivers', 'unified-db', { error });
      return { cleaned: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }
}
