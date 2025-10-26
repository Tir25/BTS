"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentService = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
class AssignmentService {
    static async getAllAssignments() {
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('buses')
                .select(`
          id,
          bus_number,
          vehicle_no,
          assigned_driver_profile_id,
          route_id,
          updated_at,
          user_profiles!buses_assigned_driver_profile_id_fkey(
            id,
            full_name,
            first_name,
            last_name,
            email
          ),
          routes!buses_route_id_fkey(
            id,
            name,
            description
          )
        `)
                .not('assigned_driver_profile_id', 'is', null)
                .not('route_id', 'is', null)
                .eq('is_active', true);
            if (error) {
                logger_1.logger.error('Error fetching all assignments', 'assignment-service', { error });
                throw error;
            }
            const assignments = (data || []).map(bus => ({
                bus_id: bus.id,
                bus_number: bus.bus_number,
                vehicle_no: bus.vehicle_no,
                driver_id: bus.assigned_driver_profile_id,
                driver_name: bus.user_profiles?.full_name || 'Unknown',
                driver_email: bus.user_profiles?.email || '',
                route_id: bus.route_id,
                route_name: bus.routes?.name || 'Unknown',
                route_description: bus.routes?.description || '',
                assigned_at: bus.updated_at,
            }));
            logger_1.logger.info(`Fetched ${assignments.length} assignments`, 'assignment-service');
            return assignments;
        }
        catch (error) {
            logger_1.logger.error('Error in getAllAssignments', 'assignment-service', { error });
            throw error;
        }
    }
    static async getAssignmentStatus() {
        try {
            const [assignmentsRes, driversRes, busesRes] = await Promise.all([
                this.getAllAssignments(),
                supabase_1.supabaseAdmin.from('user_profiles').select('id', { count: 'exact' }).eq('is_driver', true).eq('is_active', true),
                supabase_1.supabaseAdmin.from('buses').select('id, assigned_driver_profile_id', { count: 'exact' }).eq('is_active', true)
            ]);
            const activeAssignments = assignmentsRes.length;
            const totalDrivers = driversRes.count || 0;
            const totalBuses = busesRes.count || 0;
            const assignedBuses = (busesRes.data || []).filter(b => b.assigned_driver_profile_id).length;
            const unassignedDrivers = totalDrivers - assignedBuses;
            const unassignedBuses = totalBuses - assignedBuses;
            logger_1.logger.info('Fetched assignment status', 'assignment-service', {
                activeAssignments,
                totalDrivers,
                totalBuses,
                unassignedDrivers,
                unassignedBuses
            });
            return {
                total_assignments: activeAssignments,
                active_assignments: activeAssignments,
                unassigned_buses: unassignedBuses,
                unassigned_drivers: unassignedDrivers,
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getAssignmentStatus', 'assignment-service', { error });
            throw error;
        }
    }
    static async getAssignmentByBus(busId) {
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('buses')
                .select(`
          id,
          bus_number,
          assigned_driver_profile_id,
          route_id,
          updated_at
        `)
                .eq('id', busId)
                .eq('is_active', true)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                logger_1.logger.error('Error fetching assignment by bus', 'assignment-service', { error, busId });
                throw error;
            }
            if (!data || !data.assigned_driver_profile_id || !data.route_id) {
                return null;
            }
            return {
                id: data.id,
                driver_id: data.assigned_driver_profile_id,
                bus_id: data.id,
                route_id: data.route_id,
                assigned_by: 'system',
                assigned_at: data.updated_at,
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getAssignmentByBus', 'assignment-service', { error, busId });
            throw error;
        }
    }
    static async getAssignmentHistory(busId) {
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('assignment_history')
                .select('*')
                .eq('bus_id', busId)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) {
                logger_1.logger.error('Error fetching assignment history', 'assignment-service', { error, busId });
                throw error;
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getAssignmentHistory', 'assignment-service', { error, busId });
            throw error;
        }
    }
    static async createAssignment(assignmentData) {
        try {
            const { driver_id, bus_id, route_id, assigned_by, notes } = assignmentData;
            const validation = await this.validateAssignment(driver_id, bus_id, route_id);
            if (!validation.is_valid) {
                throw new Error(`Assignment validation failed: ${validation.errors.join(', ')}`);
            }
            const { data: updatedBus, error: updateError } = await supabase_1.supabaseAdmin
                .from('buses')
                .update({
                assigned_driver_profile_id: driver_id,
                route_id: route_id,
            })
                .eq('id', bus_id)
                .select()
                .single();
            if (updateError) {
                logger_1.logger.error('Error creating assignment', 'assignment-service', { error: updateError, assignmentData });
                throw updateError;
            }
            await supabase_1.supabaseAdmin
                .from('assignment_history')
                .insert({
                driver_id,
                bus_id,
                route_id,
                action: 'assigned',
                assigned_by,
                notes: notes || 'Assignment created',
                assigned_at: new Date().toISOString()
            });
            logger_1.logger.info('Assignment created successfully', 'assignment-service', { driver_id, bus_id, route_id });
            return updatedBus;
        }
        catch (error) {
            logger_1.logger.error('Error in createAssignment', 'assignment-service', { error, assignmentData });
            throw error;
        }
    }
    static async updateAssignment(busId, updateData) {
        try {
            const { driver_id, route_id, assigned_by, notes } = updateData;
            const currentAssignment = await this.getAssignmentByBus(busId);
            if (!currentAssignment) {
                throw new Error('No assignment found for this bus');
            }
            const newDriverId = driver_id || currentAssignment.driver_id;
            const newRouteId = route_id || currentAssignment.route_id;
            const validation = await this.validateAssignment(newDriverId, busId, newRouteId);
            if (!validation.is_valid) {
                throw new Error(`Assignment validation failed: ${validation.errors.join(', ')}`);
            }
            const { data: updatedBus, error: updateError } = await supabase_1.supabaseAdmin
                .from('buses')
                .update({
                assigned_driver_profile_id: newDriverId,
                route_id: newRouteId,
            })
                .eq('id', busId)
                .select()
                .single();
            if (updateError) {
                logger_1.logger.error('Error updating assignment', 'assignment-service', { error: updateError, busId, updateData });
                throw updateError;
            }
            await supabase_1.supabaseAdmin
                .from('assignment_history')
                .insert({
                driver_id: newDriverId,
                bus_id: busId,
                route_id: newRouteId,
                action: 'reassigned',
                assigned_by: assigned_by || currentAssignment.assigned_by,
                notes: notes || 'Assignment updated',
                assigned_at: new Date().toISOString()
            });
            logger_1.logger.info('Assignment updated successfully', 'assignment-service', { busId });
            return updatedBus;
        }
        catch (error) {
            logger_1.logger.error('Error in updateAssignment', 'assignment-service', { error, busId, updateData });
            throw error;
        }
    }
    static async removeAssignment(busId, assignedBy, notes) {
        try {
            const currentAssignment = await this.getAssignmentByBus(busId);
            if (!currentAssignment) {
                throw new Error('No assignment found for this bus');
            }
            const { error: updateError } = await supabase_1.supabaseAdmin
                .from('buses')
                .update({
                assigned_driver_profile_id: null,
                route_id: null,
            })
                .eq('id', busId);
            if (updateError) {
                logger_1.logger.error('Error removing assignment', 'assignment-service', { error: updateError, busId });
                throw updateError;
            }
            await supabase_1.supabaseAdmin
                .from('assignment_history')
                .insert({
                driver_id: currentAssignment.driver_id,
                bus_id: busId,
                route_id: currentAssignment.route_id,
                action: 'unassigned',
                assigned_by: assignedBy,
                notes: notes || 'Assignment removed',
                assigned_at: new Date().toISOString()
            });
            logger_1.logger.info('Assignment removed successfully', 'assignment-service', { busId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error in removeAssignment', 'assignment-service', { error, busId });
            throw error;
        }
    }
    static async validateAssignment(driverId, busId, routeId) {
        const errors = [];
        const warnings = [];
        try {
            const { data: driver, error: driverError } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .select('id, is_active, role')
                .eq('id', driverId)
                .single();
            if (driverError || !driver) {
                errors.push('Driver not found');
            }
            else if (driver.role !== 'driver') {
                errors.push('User is not a driver');
            }
            else if (!driver.is_active) {
                errors.push('Driver is not active');
            }
            if (driver && driver.is_active) {
                const { data: existingBus, error: existingBusError } = await supabase_1.supabaseAdmin
                    .from('buses')
                    .select('id, bus_number')
                    .eq('assigned_driver_profile_id', driverId)
                    .eq('is_active', true)
                    .single();
                if (!existingBusError && existingBus && existingBus.id !== busId) {
                    errors.push(`Driver is already assigned to bus ${existingBus.bus_number}`);
                }
            }
            const { data: bus, error: busError } = await supabase_1.supabaseAdmin
                .from('buses')
                .select('id, is_active')
                .eq('id', busId)
                .single();
            if (busError || !bus) {
                errors.push('Bus not found');
            }
            else if (!bus.is_active) {
                errors.push('Bus is not active');
            }
            const { data: route, error: routeError } = await supabase_1.supabaseAdmin
                .from('routes')
                .select('id, is_active')
                .eq('id', routeId)
                .single();
            if (routeError || !route) {
                errors.push('Route not found');
            }
            else if (!route.is_active) {
                errors.push('Route is not active');
            }
            return {
                is_valid: errors.length === 0,
                errors,
                warnings
            };
        }
        catch (error) {
            logger_1.logger.error('Error in validateAssignment', 'assignment-service', { error, driverId, busId, routeId });
            return {
                is_valid: false,
                errors: ['Validation error occurred'],
                warnings: []
            };
        }
    }
    static async bulkAssignDrivers(assignments) {
        const results = [];
        for (const assignment of assignments) {
            try {
                const result = await this.createAssignment(assignment);
                results.push({ success: true, data: result });
            }
            catch (error) {
                results.push({ success: false, error: error.message, assignment });
                logger_1.logger.error('Bulk assignment failed for one entry', 'assignment-service', { assignment, error: error.message });
            }
        }
        return results;
    }
}
exports.AssignmentService = AssignmentService;
//# sourceMappingURL=AssignmentService.js.map