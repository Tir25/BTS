"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedDatabaseService = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
class UnifiedDatabaseService {
    static async getAllBuses() {
        try {
            const { data: buses, error: busesError } = await supabase_1.supabaseAdmin
                .from('bus_management_view')
                .select('*')
                .order('created_at', { ascending: false });
            if (busesError) {
                logger_1.logger.error('Error fetching buses', 'unified-db', { error: busesError });
                throw busesError;
            }
            if (!buses || buses.length === 0) {
                logger_1.logger.info('No buses found in database', 'unified-db');
                return [];
            }
            logger_1.logger.info(`Fetched ${buses.length} buses from database`, 'unified-db');
            return buses.map((bus) => ({
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
        }
        catch (error) {
            logger_1.logger.error('Error in getAllBuses', 'unified-db', { error });
            throw error;
        }
    }
    static async getBusById(busId) {
        try {
            const { data, error } = await supabase_1.supabaseAdmin
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
                    return null;
                }
                logger_1.logger.error('Error fetching bus by ID', 'unified-db', { error, busId });
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
                driver_full_name: data.user_profiles?.full_name || undefined,
                driver_email: data.user_profiles?.email || undefined,
                driver_first_name: data.user_profiles?.first_name || undefined,
                driver_last_name: data.user_profiles?.last_name || undefined,
                route_id: data.route_id,
                route_name: data.routes?.name || undefined,
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getBusById', 'unified-db', { error, busId });
            throw error;
        }
    }
    static async createBus(busData) {
        try {
            if (!busData.bus_number || !busData.vehicle_no || !busData.capacity) {
                throw new Error('Missing required fields: bus_number, vehicle_no, and capacity are required');
            }
            const { data: existingBus, error: busCheckError } = await supabase_1.supabaseAdmin
                .from('buses')
                .select('id, is_active')
                .eq('bus_number', busData.bus_number)
                .eq('is_active', true)
                .maybeSingle();
            if (existingBus) {
                throw new Error(`Bus number ${busData.bus_number} already exists`);
            }
            const { data: existingVehicle, error: vehicleCheckError } = await supabase_1.supabaseAdmin
                .from('buses')
                .select('id, is_active')
                .eq('vehicle_no', busData.vehicle_no)
                .eq('is_active', true)
                .maybeSingle();
            if (existingVehicle) {
                throw new Error(`Vehicle number ${busData.vehicle_no} already exists`);
            }
            if (busData.assigned_driver_profile_id) {
                const { data: driver, error: driverError } = await supabase_1.supabaseAdmin
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
                const { data: existingAssignment } = await supabase_1.supabaseAdmin
                    .from('buses')
                    .select('id, bus_number')
                    .eq('assigned_driver_profile_id', busData.assigned_driver_profile_id)
                    .eq('is_active', true)
                    .maybeSingle();
                if (existingAssignment) {
                    throw new Error(`Driver is already assigned to bus ${existingAssignment.bus_number}`);
                }
            }
            if (busData.route_id) {
                const { data: route, error: routeError } = await supabase_1.supabaseAdmin
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
            const { data, error } = await supabase_1.supabaseAdmin
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
                logger_1.logger.error('Error creating bus', 'unified-db', { error, busData });
                throw error;
            }
            logger_1.logger.info('Bus created successfully', 'unified-db', { busId: data.id });
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
        }
        catch (error) {
            logger_1.logger.error('Error in createBus', 'unified-db', { error, busData });
            throw error;
        }
    }
    static async updateBus(busId, busData) {
        try {
            const updateData = {};
            if (busData.bus_number !== undefined)
                updateData.bus_number = busData.bus_number;
            if (busData.vehicle_no !== undefined)
                updateData.vehicle_no = busData.vehicle_no;
            if (busData.capacity !== undefined)
                updateData.capacity = busData.capacity;
            if (busData.model !== undefined)
                updateData.model = busData.model;
            if (busData.year !== undefined)
                updateData.year = busData.year;
            if (busData.bus_image_url !== undefined)
                updateData.bus_image_url = busData.bus_image_url;
            if (busData.assigned_driver_profile_id !== undefined) {
                updateData.assigned_driver_profile_id = busData.assigned_driver_profile_id === '' ? null : busData.assigned_driver_profile_id;
            }
            if (busData.route_id !== undefined) {
                updateData.route_id = busData.route_id === '' ? null : busData.route_id;
            }
            if (busData.is_active !== undefined)
                updateData.is_active = busData.is_active;
            const { data, error } = await supabase_1.supabaseAdmin
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
                    return null;
                }
                logger_1.logger.error('Error updating bus', 'unified-db', { error, busId, busData });
                throw error;
            }
            logger_1.logger.info('Bus updated successfully', 'unified-db', { busId });
            return data;
        }
        catch (error) {
            logger_1.logger.error('Error in updateBus', 'unified-db', { error, busId, busData });
            throw error;
        }
    }
    static async deleteBus(busId) {
        try {
            const { data: busData, error: fetchError } = await supabase_1.supabaseAdmin
                .from('buses')
                .select('id, bus_number, vehicle_no')
                .eq('id', busId)
                .single();
            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    return null;
                }
                logger_1.logger.error('Error fetching bus for deletion', 'unified-db', { error: fetchError, busId });
                throw fetchError;
            }
            await supabase_1.supabaseAdmin
                .from('live_locations')
                .delete()
                .eq('bus_id', busId);
            await supabase_1.supabaseAdmin
                .from('driver_bus_assignments')
                .delete()
                .eq('bus_id', busId);
            await supabase_1.supabaseAdmin
                .from('bus_route_assignments')
                .delete()
                .eq('bus_id', busId);
            await supabase_1.supabaseAdmin
                .from('bus_route_shifts')
                .delete()
                .eq('bus_id', busId);
            await supabase_1.supabaseAdmin
                .from('assignment_history')
                .delete()
                .eq('bus_id', busId);
            const { error: deleteError } = await supabase_1.supabaseAdmin
                .from('buses')
                .delete()
                .eq('id', busId);
            if (deleteError) {
                logger_1.logger.error('Error deleting bus profile', 'unified-db', { error: deleteError, busId });
                throw deleteError;
            }
            logger_1.logger.info('Bus and all related data deleted successfully', 'unified-db', {
                busId,
                busNumber: busData.bus_number,
                vehicleNo: busData.vehicle_no
            });
            return busData;
        }
        catch (error) {
            logger_1.logger.error('Error in deleteBus', 'unified-db', { error, busId });
            throw error;
        }
    }
    static async getAllDrivers() {
        try {
            const { data: drivers, error } = await supabase_1.supabaseAdmin
                .from('driver_management_view')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                logger_1.logger.error('Error fetching all drivers', 'unified-db', { error });
                throw error;
            }
            if (!drivers || drivers.length === 0) {
                logger_1.logger.info('No drivers found in database', 'unified-db');
                return [];
            }
            logger_1.logger.info(`Fetched ${drivers.length} drivers from database`, 'unified-db');
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
            logger_1.logger.error('Error in getAllDrivers', 'unified-db', { error });
            throw error;
        }
    }
    static async getAllRoutes() {
        try {
            const { data: routes, error } = await supabase_1.supabaseAdmin
                .from('route_management_view')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                logger_1.logger.error('Error fetching all routes', 'unified-db', { error });
                throw error;
            }
            if (!routes || routes.length === 0) {
                logger_1.logger.info('No routes found in database', 'unified-db');
                return [];
            }
            logger_1.logger.info(`Fetched ${routes.length} routes from database`, 'unified-db');
            return routes.map((route) => ({
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
        }
        catch (error) {
            logger_1.logger.error('Error in getAllRoutes', 'unified-db', { error });
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
                logger_1.logger.error('Error fetching driver by ID', 'unified-db', { error, driverId });
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
            logger_1.logger.error('Error in getDriverById', 'unified-db', { error, driverId });
            throw error;
        }
    }
    static async createDriver(driverData) {
        try {
            if (!driverData.email || !driverData.first_name || !driverData.last_name || !driverData.password) {
                throw new Error('Missing required fields: email, first_name, last_name, and password are required');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(driverData.email)) {
                throw new Error('Invalid email format');
            }
            if (driverData.password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }
            const { data: existingUser, error: checkError } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .select('id, email, is_active, role')
                .eq('email', driverData.email)
                .maybeSingle();
            if (checkError) {
                logger_1.logger.error('Error checking existing user', 'unified-db', { error: checkError });
                throw new Error(`Error checking existing user: ${checkError.message}`);
            }
            let reactivatedProfile = null;
            let updatedRoleProfile = null;
            if (existingUser) {
                if (existingUser.is_active) {
                    if (existingUser.role === 'student') {
                        logger_1.logger.info(`Converting student user to driver: ${driverData.email}`, 'unified-db');
                        const { data: updatedProfile, error: updateError } = await supabase_1.supabaseAdmin
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
                            logger_1.logger.error('Error converting user from student to driver', 'unified-db', { error: updateError });
                            throw new Error(`Failed to convert user from student to driver: ${updateError.message}`);
                        }
                        logger_1.logger.info('User converted from student to driver successfully', 'unified-db', { userId: existingUser.id });
                        updatedRoleProfile = updatedProfile;
                    }
                    else {
                        throw new Error(`User with email ${driverData.email} already exists with role ${existingUser.role}`);
                    }
                }
                else {
                    logger_1.logger.info(`Reactivating inactive user: ${driverData.email}`, 'unified-db');
                    const { data: updatedProfile, error: updateError } = await supabase_1.supabaseAdmin
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
                        logger_1.logger.error('Error reactivating user', 'unified-db', { error: updateError });
                        throw new Error(`Failed to reactivate user: ${updateError.message}`);
                    }
                    logger_1.logger.info('User reactivated successfully', 'unified-db', { userId: existingUser.id });
                    reactivatedProfile = updatedProfile;
                }
            }
            let authData;
            let authError;
            if (existingUser && !existingUser.is_active) {
                try {
                    const { data: authUser, error: getUserError } = await supabase_1.supabaseAdmin.auth.admin.getUserById(existingUser.id);
                    if (authUser && !getUserError) {
                        const { data: updatedAuth, error: updateAuthError } = await supabase_1.supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                            password: driverData.password,
                            user_metadata: {
                                full_name: `${driverData.first_name} ${driverData.last_name}`,
                                first_name: driverData.first_name,
                                last_name: driverData.last_name,
                                phone: driverData.phone,
                            }
                        });
                        if (updateAuthError) {
                            logger_1.logger.warn('Could not update auth user, will create new one', 'unified-db', { error: updateAuthError });
                        }
                        else {
                            authData = { user: updatedAuth.user };
                            authError = null;
                        }
                    }
                }
                catch (authCheckError) {
                    logger_1.logger.warn('Could not check auth user, will create new one', 'unified-db', { error: authCheckError });
                }
            }
            if (!authData) {
                const createAuthResult = await supabase_1.supabaseAdmin.auth.admin.createUser({
                    email: driverData.email,
                    password: driverData.password,
                    email_confirm: true,
                    user_metadata: {
                        full_name: `${driverData.first_name} ${driverData.last_name}`,
                        first_name: driverData.first_name,
                        last_name: driverData.last_name,
                        phone: driverData.phone,
                        role: 'driver',
                    }
                });
                authData = createAuthResult.data;
                authError = createAuthResult.error;
            }
            if (authError) {
                logger_1.logger.error('Error creating user in Supabase Auth', 'unified-db', { error: authError });
                throw new Error(`Failed to create user in Supabase Auth: ${authError.message}`);
            }
            if (!authData.user) {
                throw new Error('No user data returned from Supabase Auth');
            }
            if (reactivatedProfile) {
                logger_1.logger.info('Driver reactivated successfully', 'unified-db', { driverId: reactivatedProfile.id });
                return reactivatedProfile;
            }
            if (updatedRoleProfile) {
                logger_1.logger.info('Student successfully converted to driver', 'unified-db', { driverId: updatedRoleProfile.id });
                return updatedRoleProfile;
            }
            const { data: profileData, error: profileError } = await supabase_1.supabaseAdmin
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
                logger_1.logger.error('Error creating driver profile', 'unified-db', { error: profileError });
                try {
                    await supabase_1.supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                }
                catch (cleanupError) {
                    logger_1.logger.error('Error cleaning up auth user', 'unified-db', { error: cleanupError });
                }
                if (profileError.code === '23505') {
                    throw new Error(`Driver with email ${driverData.email} already exists`);
                }
                else if (profileError.code === '23503') {
                    throw new Error(`Invalid reference in driver profile: ${profileError.message}`);
                }
                else {
                    throw new Error(`Failed to create driver profile: ${profileError.message}`);
                }
            }
            logger_1.logger.info('Driver created successfully', 'unified-db', { driverId: profileData.id });
            return profileData;
        }
        catch (error) {
            logger_1.logger.error('Error in createDriver', 'unified-db', { error, driverData });
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
            if (driverData.role !== undefined)
                updateData.role = driverData.role;
            if (driverData.is_driver !== undefined)
                updateData.is_driver = driverData.is_driver;
            if (driverData.is_active !== undefined)
                updateData.is_active = driverData.is_active;
            const { data, error } = await supabase_1.supabaseAdmin
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
                    return null;
                }
                logger_1.logger.error('Error updating driver', 'unified-db', { error, driverId, driverData });
                throw error;
            }
            logger_1.logger.info('Driver updated successfully', 'unified-db', { driverId });
            return data;
        }
        catch (error) {
            logger_1.logger.error('Error in updateDriver', 'unified-db', { error, driverId, driverData });
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
                logger_1.logger.error('Error fetching driver for deletion', 'unified-db', { error: fetchError, driverId });
                throw fetchError;
            }
            await supabase_1.supabaseAdmin
                .from('live_locations')
                .delete()
                .eq('driver_id', driverId);
            await supabase_1.supabaseAdmin
                .from('buses')
                .update({ assigned_driver_profile_id: null })
                .eq('assigned_driver_profile_id', driverId);
            await supabase_1.supabaseAdmin
                .from('driver_bus_assignments')
                .delete()
                .eq('driver_id', driverId);
            await supabase_1.supabaseAdmin
                .from('bus_route_assignments')
                .delete()
                .eq('assigned_driver_profile_id', driverId);
            await supabase_1.supabaseAdmin
                .from('shifts')
                .delete()
                .eq('driver_id', driverId);
            await supabase_1.supabaseAdmin
                .from('assignment_history')
                .delete()
                .eq('driver_id', driverId);
            await supabase_1.supabaseAdmin
                .from('user_roles')
                .delete()
                .eq('user_id', driverId);
            try {
                await supabase_1.supabaseAdmin.auth.admin.deleteUser(driverId);
                logger_1.logger.info('Auth user deleted successfully', 'unified-db', { driverId });
            }
            catch (authError) {
                logger_1.logger.warn('Could not delete auth user', 'unified-db', { error: authError, driverId });
            }
            const { error: deleteError } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .delete()
                .eq('id', driverId);
            if (deleteError) {
                logger_1.logger.error('Error deleting driver profile', 'unified-db', { error: deleteError, driverId });
                throw deleteError;
            }
            logger_1.logger.info('Driver and all related data deleted successfully', 'unified-db', {
                driverId,
                email: driverData.email
            });
            return driverData;
        }
        catch (error) {
            logger_1.logger.error('Error in deleteDriver', 'unified-db', { error, driverId });
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
                .eq('is_active', false)
                .eq('role', 'driver');
            if (fetchError) {
                logger_1.logger.error('Error fetching inactive drivers', 'unified-db', { error: fetchError });
                return { cleaned: 0, errors: [fetchError.message] };
            }
            if (!inactiveDrivers || inactiveDrivers.length === 0) {
                logger_1.logger.info('No inactive drivers found to clean up', 'unified-db');
                return { cleaned: 0, errors: [] };
            }
            for (const driver of inactiveDrivers) {
                try {
                    const { error: profileError } = await supabase_1.supabaseAdmin
                        .from('user_profiles')
                        .delete()
                        .eq('id', driver.id);
                    if (profileError) {
                        errors.push(`Failed to delete profile for ${driver.email}: ${profileError.message}`);
                        continue;
                    }
                    try {
                        await supabase_1.supabaseAdmin.auth.admin.deleteUser(driver.id);
                    }
                    catch (authError) {
                        logger_1.logger.warn('Could not delete auth user', 'unified-db', { error: authError, driverId: driver.id });
                    }
                    cleaned++;
                    logger_1.logger.info(`Cleaned up inactive driver: ${driver.email}`, 'unified-db');
                }
                catch (error) {
                    errors.push(`Failed to clean up ${driver.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            logger_1.logger.info(`Cleanup completed: ${cleaned} drivers cleaned, ${errors.length} errors`, 'unified-db');
            return { cleaned, errors };
        }
        catch (error) {
            logger_1.logger.error('Error in cleanupInactiveDrivers', 'unified-db', { error });
            return { cleaned: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
        }
    }
}
exports.UnifiedDatabaseService = UnifiedDatabaseService;
//# sourceMappingURL=UnifiedDatabaseService.js.map