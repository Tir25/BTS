"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusDatabaseService = void 0;
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../utils/logger");
class BusDatabaseService {
    static async getAllBuses() {
        try {
            const { data: buses, error: busesError } = await supabase_1.supabaseAdmin
                .from('bus_management_view')
                .select('*')
                .order('created_at', { ascending: false });
            if (busesError) {
                logger_1.logger.error('Error fetching buses', 'bus-db-service', { error: busesError });
                throw busesError;
            }
            if (!buses || buses.length === 0) {
                logger_1.logger.info('No buses found in database', 'bus-db-service');
                return [];
            }
            logger_1.logger.info(`Fetched ${buses.length} buses from database`, 'bus-db-service');
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
            logger_1.logger.error('Error in getAllBuses', 'bus-db-service', { error });
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
                logger_1.logger.error('Error fetching bus by ID', 'bus-db-service', { error, busId });
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
            logger_1.logger.error('Error in getBusById', 'bus-db-service', { error, busId });
            throw error;
        }
    }
    static async createBus(busData) {
        try {
            if (!busData.bus_number || !busData.vehicle_no || !busData.capacity) {
                throw new Error('Missing required fields: bus_number, vehicle_no, and capacity are required');
            }
            const { data: existingBus } = await supabase_1.supabaseAdmin
                .from('buses')
                .select('id, is_active')
                .eq('bus_number', busData.bus_number)
                .eq('is_active', true)
                .maybeSingle();
            if (existingBus) {
                throw new Error(`Bus number ${busData.bus_number} already exists`);
            }
            const { data: existingVehicle } = await supabase_1.supabaseAdmin
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
                logger_1.logger.error('Error creating bus', 'bus-db-service', { error, busData });
                throw error;
            }
            logger_1.logger.info('Bus created successfully', 'bus-db-service', { busId: data.id });
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
            logger_1.logger.error('Error in createBus', 'bus-db-service', { error, busData });
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
                logger_1.logger.error('Error updating bus', 'bus-db-service', { error, busId, busData });
                throw error;
            }
            logger_1.logger.info('Bus updated successfully', 'bus-db-service', { busId: data.id });
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
            logger_1.logger.error('Error in updateBus', 'bus-db-service', { error, busId, busData });
            throw error;
        }
    }
    static async deleteBus(busId) {
        try {
            const bus = await this.getBusById(busId);
            if (!bus) {
                return null;
            }
            const { data, error } = await supabase_1.supabaseAdmin
                .from('buses')
                .update({
                is_active: false,
                updated_at: new Date().toISOString()
            })
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
                logger_1.logger.error('Error deleting bus', 'bus-db-service', { error, busId });
                throw error;
            }
            logger_1.logger.info('Bus deleted successfully', 'bus-db-service', { busId: data.id });
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
            logger_1.logger.error('Error in deleteBus', 'bus-db-service', { error, busId });
            throw error;
        }
    }
}
exports.BusDatabaseService = BusDatabaseService;
//# sourceMappingURL=BusDatabaseService.js.map