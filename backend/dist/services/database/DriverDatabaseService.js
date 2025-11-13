"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverDatabaseService = void 0;
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../utils/logger");
const supabase_js_1 = require("@supabase/supabase-js");
class DriverDatabaseService {
    static async getAllDrivers() {
        try {
            const { data: drivers, error } = await supabase_1.supabaseAdmin
                .from('driver_management_view')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                logger_1.logger.error('Error fetching all drivers', 'driver-db-service', { error });
                throw error;
            }
            if (!drivers || drivers.length === 0) {
                logger_1.logger.info('No drivers found in database', 'driver-db-service');
                return [];
            }
            logger_1.logger.info(`Fetched ${drivers.length} drivers from database`, 'driver-db-service');
            return drivers.map((driver) => ({
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
        }
        catch (error) {
            logger_1.logger.error('Error in getAllDrivers', 'driver-db-service', { error });
            throw error;
        }
    }
    static async getDriverById(driverId) {
        try {
            const { data, error } = await supabase_1.supabaseAdmin
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
                    return null;
                }
                logger_1.logger.error('Error fetching driver by ID', 'driver-db-service', { error, driverId });
                throw error;
            }
            if (!data)
                return null;
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
        }
        catch (error) {
            logger_1.logger.error('Error in getDriverById', 'driver-db-service', { error, driverId });
            throw error;
        }
    }
    static async createDriver(driverData) {
        try {
            if (!driverData.email || !driverData.first_name || !driverData.last_name || !driverData.password) {
                throw new Error('Missing required fields: email, first_name, last_name, and password are required');
            }
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!supabaseUrl || !supabaseServiceKey) {
                throw new Error('Supabase configuration missing');
            }
            const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
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
                logger_1.logger.error('Error creating driver in auth', 'driver-db-service', { error: authError });
                throw new Error(`Failed to create driver account: ${authError.message}`);
            }
            if (!authData.user) {
                throw new Error('Failed to create driver account: No user returned');
            }
            const { data: existingProfile } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .select('id')
                .eq('id', authData.user.id)
                .maybeSingle();
            let profileData;
            let profileError;
            if (existingProfile) {
                const { data: updatedProfile, error: updateError } = await supabase_1.supabaseAdmin
                    .from('user_profiles')
                    .update({
                    email: driverData.email,
                    full_name: `${driverData.first_name} ${driverData.last_name}`,
                    first_name: driverData.first_name,
                    last_name: driverData.last_name,
                    phone: driverData.phone,
                    role: 'driver',
                    is_driver: true,
                    is_active: true,
                })
                    .eq('id', authData.user.id)
                    .select()
                    .single();
                profileData = updatedProfile;
                profileError = updateError;
            }
            else {
                const { data: insertedProfile, error: insertError } = await supabase_1.supabaseAdmin
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
                profileData = insertedProfile;
                profileError = insertError;
            }
            if (profileError) {
                logger_1.logger.error('Error creating driver profile', 'driver-db-service', { error: profileError });
                try {
                    await supabase.auth.admin.deleteUser(authData.user.id);
                }
                catch (cleanupError) {
                    logger_1.logger.error('Error cleaning up auth user after profile creation failure', 'driver-db-service', { error: cleanupError });
                }
                throw new Error(`Failed to create driver profile: ${profileError.message}`);
            }
            logger_1.logger.info('Driver created successfully', 'driver-db-service', { driverId: profileData.id });
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
        }
        catch (error) {
            logger_1.logger.error('Error in createDriver', 'driver-db-service', { error, driverData });
            throw error;
        }
    }
    static async updateDriver(driverId, driverData) {
        try {
            const updateData = {};
            if (driverData.email !== undefined)
                updateData.email = driverData.email;
            if (driverData.full_name !== undefined)
                updateData.full_name = driverData.full_name;
            if (driverData.first_name !== undefined)
                updateData.first_name = driverData.first_name;
            if (driverData.last_name !== undefined)
                updateData.last_name = driverData.last_name;
            if (driverData.phone !== undefined)
                updateData.phone = driverData.phone;
            if (driverData.is_active !== undefined)
                updateData.is_active = driverData.is_active;
            const { data, error } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .update(updateData)
                .eq('id', driverId)
                .eq('role', 'driver')
                .select()
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                logger_1.logger.error('Error updating driver', 'driver-db-service', { error, driverId, driverData });
                throw error;
            }
            logger_1.logger.info('Driver updated successfully', 'driver-db-service', { driverId: data.id });
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
        }
        catch (error) {
            logger_1.logger.error('Error in updateDriver', 'driver-db-service', { error, driverId, driverData });
            throw error;
        }
    }
    static async deleteDriver(driverId) {
        try {
            const { data: driverData, error: fetchError } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .select('id, email')
                .eq('id', driverId)
                .eq('role', 'driver')
                .single();
            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    return null;
                }
                logger_1.logger.error('Error fetching driver for deletion', 'driver-db-service', { error: fetchError, driverId });
                throw fetchError;
            }
            const now = new Date().toISOString();
            await supabase_1.supabaseAdmin
                .from('live_locations')
                .delete()
                .eq('driver_id', driverId);
            const { data: assignedBuses } = await supabase_1.supabaseAdmin
                .from('buses')
                .select('id, route_id')
                .eq('assigned_driver_profile_id', driverId);
            const busIds = Array.isArray(assignedBuses) ? assignedBuses.map((b) => b.id) : [];
            const { error: busUpdateError } = await supabase_1.supabaseAdmin
                .from('buses')
                .update({
                assigned_driver_profile_id: null,
                route_id: null,
                assigned_shift_id: null,
                shift_id: null,
                assignment_status: 'unassigned',
                assignment_notes: `Driver deleted - route unassigned at ${now}`,
                updated_at: now
            })
                .eq('assigned_driver_profile_id', driverId);
            if (busUpdateError) {
                logger_1.logger.error('Error updating buses when deleting driver', 'driver-db-service', { error: busUpdateError, driverId });
                throw busUpdateError;
            }
            if (assignedBuses && assignedBuses.length > 0) {
                const routeIds = assignedBuses.map((b) => b.route_id).filter(Boolean);
                if (routeIds.length > 0) {
                    logger_1.logger.info('Routes unassigned from buses (routes remain in database)', 'driver-db-service', {
                        driverId,
                        routeIds,
                        busIds: assignedBuses.map((b) => b.id)
                    });
                }
            }
            if (busIds.length > 0) {
                const { error: shiftCleanupError } = await supabase_1.supabaseAdmin
                    .from('bus_route_shifts')
                    .delete()
                    .in('bus_id', busIds);
                if (shiftCleanupError) {
                    logger_1.logger.warn('Failed to remove bus route shifts during driver delete', 'driver-db-service', {
                        driverId,
                        error: shiftCleanupError
                    });
                }
            }
            const { error: driverAssignmentError } = await supabase_1.supabaseAdmin
                .from('driver_bus_assignments')
                .update({
                is_active: false,
                updated_at: now
            })
                .eq('driver_id', driverId)
                .eq('is_active', true);
            if (driverAssignmentError) {
                logger_1.logger.warn('Failed to deactivate driver-bus assignments during driver delete', 'driver-db-service', {
                    driverId,
                    error: driverAssignmentError
                });
            }
            const { error: routeAssignmentError } = await supabase_1.supabaseAdmin
                .from('bus_route_assignments')
                .update({
                is_active: false,
                unassigned_at: now,
                updated_at: now,
                assigned_driver_id: null,
                assigned_driver_profile_id: null
            })
                .eq('is_active', true)
                .or(`driver_id.eq.${driverId},assigned_driver_profile_id.eq.${driverId}`);
            if (routeAssignmentError) {
                logger_1.logger.warn('Failed to deactivate bus-route assignments during driver delete', 'driver-db-service', {
                    driverId,
                    error: routeAssignmentError
                });
            }
            const { error: deleteError } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .delete()
                .eq('id', driverId)
                .eq('role', 'driver');
            if (deleteError) {
                logger_1.logger.error('Error deleting driver profile', 'driver-db-service', { error: deleteError, driverId });
                throw deleteError;
            }
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (supabaseUrl && supabaseServiceKey) {
                try {
                    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
                    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(driverId);
                    if (authDeleteError) {
                        logger_1.logger.warn('Error deleting driver from auth (non-critical)', 'driver-db-service', { error: authDeleteError, driverId });
                    }
                }
                catch (authError) {
                    logger_1.logger.warn('Error deleting driver from auth (non-critical)', 'driver-db-service', { error: authError, driverId });
                }
            }
            logger_1.logger.info('Driver deleted successfully', 'driver-db-service', { driverId });
            return {
                id: driverData.id,
                email: driverData.email,
                full_name: '',
                role: 'driver',
                is_driver: true,
                is_active: false,
            };
        }
        catch (error) {
            logger_1.logger.error('Error in deleteDriver', 'driver-db-service', { error, driverId });
            throw error;
        }
    }
    static async cleanupInactiveDrivers() {
        try {
            const errors = [];
            let cleaned = 0;
            const { data: inactiveDrivers, error: fetchError } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .select('id, email')
                .eq('role', 'driver')
                .eq('is_active', false);
            if (fetchError) {
                logger_1.logger.error('Error fetching inactive drivers', 'driver-db-service', { error: fetchError });
                throw fetchError;
            }
            if (!inactiveDrivers || inactiveDrivers.length === 0) {
                logger_1.logger.info('No inactive drivers to clean up', 'driver-db-service');
                return { cleaned: 0, errors: [] };
            }
            for (const driver of inactiveDrivers) {
                try {
                    await this.deleteDriver(driver.id);
                    cleaned++;
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    errors.push(`Failed to delete driver ${driver.id}: ${errorMessage}`);
                    logger_1.logger.error('Error deleting inactive driver', 'driver-db-service', { error, driverId: driver.id });
                }
            }
            logger_1.logger.info('Cleanup inactive drivers completed', 'driver-db-service', { cleaned, errors: errors.length });
            return { cleaned, errors };
        }
        catch (error) {
            logger_1.logger.error('Error in cleanupInactiveDrivers', 'driver-db-service', { error });
            throw error;
        }
    }
}
exports.DriverDatabaseService = DriverDatabaseService;
//# sourceMappingURL=DriverDatabaseService.js.map