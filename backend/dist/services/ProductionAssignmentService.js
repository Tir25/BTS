"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionAssignmentService = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
class ProductionAssignmentService {
    static async fetchShiftDetails(shiftId) {
        if (!shiftId)
            return null;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('shifts')
            .select('id,name,start_time,end_time')
            .eq('id', shiftId)
            .maybeSingle();
        if (error) {
            logger_1.logger.warn('Error fetching shift details', 'production-assignment-service', { error, shiftId });
            return null;
        }
        if (!data) {
            logger_1.logger.warn('Shift not found for assignment', 'production-assignment-service', { shiftId });
            return null;
        }
        return {
            id: data.id,
            name: data.name || null,
            start_time: data.start_time ?? null,
            end_time: data.end_time ?? null,
        };
    }
    static async getAllAssignments() {
        try {
            const { data: buses, error } = await supabase_1.supabaseAdmin
                .from('buses')
                .select('id,bus_number,vehicle_no,assigned_driver_profile_id,route_id,assigned_shift_id,assignment_status,assignment_notes,updated_at')
                .eq('is_active', true)
                .not('assigned_driver_profile_id', 'is', null)
                .not('route_id', 'is', null);
            if (error) {
                logger_1.logger.error('Error fetching all assignments', 'production-assignment-service', { error });
                throw error;
            }
            const busList = buses || [];
            const driverIds = Array.from(new Set(busList.map((b) => b.assigned_driver_profile_id))).filter(Boolean);
            const routeIds = Array.from(new Set(busList.map((b) => b.route_id))).filter(Boolean);
            const shiftIds = Array.from(new Set(busList.map((b) => b.assigned_shift_id))).filter(Boolean);
            const [{ data: drivers }, { data: routes }, { data: shifts }] = await Promise.all([
                driverIds.length
                    ? supabase_1.supabaseAdmin.from('user_profiles').select('id,full_name,first_name,last_name,email,phone').in('id', driverIds)
                    : Promise.resolve({ data: [] }),
                routeIds.length
                    ? supabase_1.supabaseAdmin.from('routes').select('id,name,description,city').in('id', routeIds)
                    : Promise.resolve({ data: [] }),
                shiftIds.length
                    ? supabase_1.supabaseAdmin.from('shifts').select('id,name,start_time,end_time').in('id', shiftIds)
                    : Promise.resolve({ data: [] }),
            ]);
            const driverMap = new Map((drivers || []).map((d) => [d.id, d]));
            const routeMap = new Map((routes || []).map((r) => [r.id, r]));
            const shiftMap = new Map((shifts || []).map((s) => [s.id, { id: s.id, name: s.name, start_time: s.start_time ?? null, end_time: s.end_time ?? null }]));
            const missingRouteIds = busList
                .map(b => b.route_id)
                .filter(routeId => !routeMap.has(routeId));
            if (missingRouteIds.length > 0) {
                logger_1.logger.warn('Some route IDs not found in routeMap', 'production-assignment-service', {
                    missingRouteIds: Array.from(new Set(missingRouteIds)),
                    totalMissing: missingRouteIds.length
                });
            }
            const missingDriverIds = busList
                .map(b => b.assigned_driver_profile_id)
                .filter(driverId => !driverMap.has(driverId));
            if (missingDriverIds.length > 0) {
                logger_1.logger.warn('Some driver IDs not found in driverMap', 'production-assignment-service', {
                    missingDriverIds: Array.from(new Set(missingDriverIds)),
                    totalMissing: missingDriverIds.length
                });
            }
            const assignments = busList.map((bus) => {
                const d = driverMap.get(bus.assigned_driver_profile_id);
                const r = routeMap.get(bus.route_id);
                const shiftId = bus.assigned_shift_id || null;
                const shift = shiftId ? shiftMap.get(shiftId) : undefined;
                const routeName = r?.name || `Route ${bus.route_id.substring(0, 8)}... (Not found)`;
                if (!r) {
                    logger_1.logger.warn('Route not found in assignment', 'production-assignment-service', {
                        routeId: bus.route_id,
                        busId: bus.id
                    });
                }
                return {
                    id: bus.id,
                    driver_id: bus.assigned_driver_profile_id,
                    bus_id: bus.id,
                    route_id: bus.route_id,
                    assigned_by: 'system',
                    notes: bus.assignment_notes,
                    assigned_at: bus.updated_at,
                    status: bus.assignment_status || 'active',
                    shift_id: shiftId,
                    shift_name: shift?.name || null,
                    shift_start_time: shift?.start_time ?? null,
                    shift_end_time: shift?.end_time ?? null,
                    bus_number: bus.bus_number,
                    vehicle_no: bus.vehicle_no,
                    driver_name: d?.full_name || 'Unknown Driver',
                    driver_email: d?.email || '',
                    driver_phone: d?.phone || '',
                    route_name: routeName,
                    route_description: r?.description || '',
                    route_city: r?.city || '',
                };
            });
            logger_1.logger.info(`Fetched ${assignments.length} assignments`, 'production-assignment-service');
            return assignments;
        }
        catch (error) {
            logger_1.logger.error('Error in getAllAssignments', 'production-assignment-service', { error });
            throw error;
        }
    }
    static async getAssignmentDashboard() {
        try {
            const [assignmentsRes, driversRes, busesRes, routesRes] = await Promise.all([
                this.getAllAssignments(),
                supabase_1.supabaseAdmin.from('user_profiles').select('id', { count: 'exact' }).eq('role', 'driver').eq('is_active', true),
                supabase_1.supabaseAdmin.from('buses')
                    .select('id, assigned_driver_profile_id, route_id, assignment_status')
                    .eq('is_active', true),
                supabase_1.supabaseAdmin.from('routes').select('id').eq('is_active', true)
            ]);
            const totalDrivers = driversRes.count || 0;
            const totalBuses = (busesRes.data || []).length;
            const allRoutesData = routesRes.data || [];
            const totalRoutes = allRoutesData.length;
            const allBuses = busesRes.data || [];
            const totalAssignments = allBuses.filter(b => b.assigned_driver_profile_id && b.route_id).length;
            const activeAssignments = allBuses.filter(b => b.assigned_driver_profile_id &&
                b.route_id &&
                (b.assignment_status === 'active' || b.assignment_status === 'assigned')).length;
            const pendingAssignments = allBuses.filter(b => b.assigned_driver_profile_id &&
                b.route_id &&
                (b.assignment_status === 'inactive' || b.assignment_status === 'pending' || b.assignment_status === 'unassigned')).length;
            const assignedBuses = allBuses.filter(b => b.assigned_driver_profile_id && b.route_id);
            const uniqueAssignedDrivers = new Set(assignedBuses
                .map(b => b.assigned_driver_profile_id)
                .filter(Boolean)).size;
            const unassignedDrivers = Math.max(0, totalDrivers - uniqueAssignedDrivers);
            const unassignedBuses = allBuses.filter(b => !b.assigned_driver_profile_id || !b.route_id).length;
            const assignedRouteIds = new Set(assignedBuses
                .map(b => b.route_id)
                .filter(Boolean));
            const allRouteIds = new Set(allRoutesData.map(r => r.id));
            const unassignedRoutes = Array.from(allRouteIds).filter(routeId => !assignedRouteIds.has(routeId)).length;
            logger_1.logger.info('Fetched assignment dashboard', 'production-assignment-service', {
                totalAssignments,
                activeAssignments,
                pendingAssignments,
                totalDrivers,
                uniqueAssignedDrivers,
                totalBuses,
                assignedBuses: assignedBuses.length,
                totalRoutes,
                unassignedDrivers,
                unassignedBuses,
                unassignedRoutes
            });
            return {
                total_assignments: totalAssignments,
                active_assignments: activeAssignments,
                unassigned_drivers: unassignedDrivers,
                unassigned_buses: unassignedBuses,
                unassigned_routes: unassignedRoutes,
                pending_assignments: pendingAssignments,
                recent_assignments: assignmentsRes.slice(0, 5),
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getAssignmentDashboard', 'production-assignment-service', { error });
            throw error;
        }
    }
    static async createAssignment(assignmentData) {
        try {
            const { driver_id, bus_id, route_id, shift_id, assigned_by, notes, status = 'active' } = assignmentData;
            const validation = await this.validateAssignment(driver_id, bus_id, route_id);
            if (!validation.is_valid) {
                throw new Error(`Assignment validation failed: ${validation.errors.join(', ')}`);
            }
            if (validation.conflicts.length > 0) {
                logger_1.logger.warn('Assignment conflicts detected', 'production-assignment-service', { conflicts: validation.conflicts });
            }
            const { data: updatedBus, error: updateError } = await supabase_1.supabaseAdmin
                .from('buses')
                .update({
                assigned_driver_profile_id: driver_id,
                route_id: route_id,
                assigned_shift_id: shift_id || null,
                assignment_status: status,
                assignment_notes: notes,
            })
                .eq('id', bus_id)
                .select()
                .single();
            if (updateError) {
                logger_1.logger.error('Error creating assignment', 'production-assignment-service', { error: updateError, assignmentData });
                throw updateError;
            }
            const { error: historyError } = await supabase_1.supabaseAdmin
                .from('assignment_history')
                .insert({
                driver_id,
                bus_id,
                route_id,
                action: 'assigned',
                assigned_by,
                notes: notes || 'Assignment created via production service',
                assigned_at: new Date().toISOString()
            });
            if (historyError) {
                logger_1.logger.error('Error inserting assignment history', 'production-assignment-service', { error: historyError, driver_id, bus_id, route_id });
            }
            logger_1.logger.info('Assignment created successfully', 'production-assignment-service', { driver_id, bus_id, route_id });
            return {
                id: updatedBus.id,
                driver_id,
                bus_id,
                route_id,
                shift_id: shift_id || null,
                assigned_by,
                notes,
                assigned_at: new Date().toISOString(),
                status
            };
        }
        catch (error) {
            logger_1.logger.error('Error in createAssignment', 'production-assignment-service', { error, assignmentData });
            throw error;
        }
    }
    static async updateAssignment(busId, updateData) {
        try {
            const { driver_id, route_id, shift_id, assigned_by, notes, status } = updateData;
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
                assigned_shift_id: typeof shift_id !== 'undefined' ? shift_id : currentAssignment.shift_id || null,
                assignment_status: status || currentAssignment.status,
                assignment_notes: notes || currentAssignment.notes,
            })
                .eq('id', busId)
                .select()
                .single();
            if (updateError) {
                logger_1.logger.error('Error updating assignment', 'production-assignment-service', { error: updateError, busId, updateData });
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
                notes: notes || 'Assignment updated via production service',
                assigned_at: new Date().toISOString()
            });
            logger_1.logger.info('Assignment updated successfully', 'production-assignment-service', { busId });
            try {
                const { globalIO } = require('../sockets/websocket');
                if (globalIO && globalIO.broadcastAssignmentUpdate) {
                    const assignmentData = {
                        driverId: newDriverId,
                        busId: busId,
                        busNumber: updatedBus.bus_number,
                        routeId: newRouteId,
                        routeName: updatedBus.route_name,
                        driverName: updatedBus.driver_full_name,
                        status: status || currentAssignment.status,
                        type: 'update'
                    };
                    globalIO.broadcastAssignmentUpdate(newDriverId, assignmentData);
                }
            }
            catch (wsError) {
                logger_1.logger.warn('Failed to broadcast WebSocket update', 'production-assignment-service', {
                    error: wsError instanceof Error ? wsError.message : 'Unknown error'
                });
            }
            return {
                id: updatedBus.id,
                driver_id: newDriverId,
                bus_id: busId,
                route_id: newRouteId,
                shift_id: typeof shift_id !== 'undefined' ? shift_id || null : currentAssignment.shift_id || null,
                assigned_by: assigned_by || currentAssignment.assigned_by,
                notes: notes || currentAssignment.notes,
                assigned_at: new Date().toISOString(),
                status: status || currentAssignment.status
            };
        }
        catch (error) {
            logger_1.logger.error('Error in updateAssignment', 'production-assignment-service', { error, busId, updateData });
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
                assignment_status: 'inactive',
                assignment_notes: notes || 'Assignment removed',
            })
                .eq('id', busId);
            if (updateError) {
                logger_1.logger.error('Error removing assignment', 'production-assignment-service', { error: updateError, busId });
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
                notes: notes || 'Assignment removed via production service',
                assigned_at: new Date().toISOString()
            });
            logger_1.logger.info('Assignment removed successfully', 'production-assignment-service', { busId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error in removeAssignment', 'production-assignment-service', { error, busId });
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
          vehicle_no,
          assigned_driver_profile_id,
          route_id,
          assigned_shift_id,
          assignment_status,
          assignment_notes,
          updated_at
        `)
                .eq('id', busId)
                .eq('is_active', true)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                logger_1.logger.error('Error fetching assignment by bus', 'production-assignment-service', { error, busId });
                throw error;
            }
            if (!data || !data.assigned_driver_profile_id || !data.route_id) {
                return null;
            }
            const shiftId = data.assigned_shift_id || null;
            const shiftDetails = await this.fetchShiftDetails(shiftId);
            return {
                id: data.id,
                driver_id: data.assigned_driver_profile_id,
                bus_id: data.id,
                route_id: data.route_id,
                assigned_by: 'system',
                notes: data.assignment_notes,
                assigned_at: data.updated_at,
                status: data.assignment_status || 'active',
                shift_id: shiftId,
                shift_name: shiftDetails?.name || null,
                shift_start_time: shiftDetails?.start_time ?? null,
                shift_end_time: shiftDetails?.end_time ?? null,
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getAssignmentByBus', 'production-assignment-service', { error, busId });
            throw error;
        }
    }
    static async getDriverAssignment(driverId) {
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('buses')
                .select(`
          id,
          bus_number,
          vehicle_no,
          assigned_driver_profile_id,
          route_id,
          assigned_shift_id,
          assignment_status,
          assignment_notes,
          updated_at
        `)
                .eq('assigned_driver_profile_id', driverId)
                .eq('is_active', true)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                logger_1.logger.error('Error fetching assignment by driver', 'production-assignment-service', { error, driverId });
                throw error;
            }
            if (!data || !data.route_id) {
                logger_1.logger.warn('Bus assignment found but no route_id', 'production-assignment-service', {
                    driverId,
                    busId: data?.id,
                    message: 'Driver has bus assignment but no route assigned. Admin should assign a route to this bus.'
                });
                return null;
            }
            let routeName = '';
            const { data: routeData, error: routeError } = await supabase_1.supabaseAdmin
                .from('routes')
                .select('name, is_active')
                .eq('id', data.route_id)
                .maybeSingle();
            if (routeError) {
                logger_1.logger.error('Error fetching route information', 'production-assignment-service', {
                    error: routeError,
                    routeId: data.route_id,
                    driverId
                });
                routeName = `Route ${data.route_id.substring(0, 8)}... (Error loading name)`;
            }
            else if (!routeData) {
                logger_1.logger.warn('Route not found for assignment', 'production-assignment-service', {
                    routeId: data.route_id,
                    driverId
                });
                routeName = `Route ${data.route_id.substring(0, 8)}... (Not found)`;
            }
            else if (!routeData.is_active) {
                logger_1.logger.warn('Route found but is inactive', 'production-assignment-service', {
                    routeId: data.route_id,
                    routeName: routeData.name,
                    driverId
                });
                routeName = routeData.name || `Route ${data.route_id.substring(0, 8)}...`;
            }
            else {
                routeName = routeData.name || '';
            }
            let driverName = '';
            const { data: driverData, error: driverError } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .select('full_name')
                .eq('id', driverId)
                .maybeSingle();
            if (driverError) {
                logger_1.logger.error('Error fetching driver information', 'production-assignment-service', {
                    error: driverError,
                    driverId
                });
                driverName = 'Unknown Driver';
            }
            else if (!driverData) {
                logger_1.logger.warn('Driver profile not found', 'production-assignment-service', { driverId });
                driverName = 'Unknown Driver';
            }
            else {
                driverName = driverData.full_name || 'Unknown Driver';
            }
            if (!routeName || routeName.includes('Error loading') || routeName.includes('Not found')) {
                logger_1.logger.error('Critical: Route name could not be loaded for driver assignment', 'production-assignment-service', {
                    driverId,
                    routeId: data.route_id,
                    busId: data.id,
                    routeName
                });
            }
            const shiftId = data.assigned_shift_id || null;
            const shiftDetails = shiftId ? await this.fetchShiftDetails(shiftId) : null;
            return {
                id: data.id,
                driver_id: driverId,
                bus_id: data.id,
                route_id: data.route_id,
                assigned_by: 'system',
                notes: data.assignment_notes,
                assigned_at: data.updated_at,
                status: data.assignment_status || 'active',
                bus_number: data.bus_number,
                vehicle_no: data.vehicle_no,
                route_name: routeName,
                driver_name: driverName,
                shift_id: shiftId,
                shift_name: shiftDetails?.name || null,
                shift_start_time: shiftDetails?.start_time ?? null,
                shift_end_time: shiftDetails?.end_time ?? null,
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getDriverAssignment', 'production-assignment-service', { error, driverId });
            throw error;
        }
    }
    static async validateAssignment(driverId, busId, routeId) {
        const errors = [];
        const warnings = [];
        const conflicts = [];
        try {
            const { data: driver, error: driverError } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .select('id, is_active, role, full_name')
                .eq('id', driverId)
                .maybeSingle();
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
                    .select('id, bus_number, route_id')
                    .eq('assigned_driver_profile_id', driverId)
                    .eq('is_active', true)
                    .maybeSingle();
                if (!existingBusError && existingBus && existingBus.id !== busId) {
                    conflicts.push(`Driver ${driver.full_name} is already assigned to bus ${existingBus.bus_number}`);
                }
            }
            const { data: bus, error: busError } = await supabase_1.supabaseAdmin
                .from('buses')
                .select('id, is_active, bus_number, assigned_driver_profile_id')
                .eq('id', busId)
                .maybeSingle();
            if (busError || !bus) {
                errors.push('Bus not found');
            }
            else if (!bus.is_active) {
                errors.push('Bus is not active');
            }
            else if (bus.assigned_driver_profile_id && bus.assigned_driver_profile_id !== driverId) {
                warnings.push(`Bus ${bus.bus_number} already has a different driver assigned`);
            }
            const { data: route, error: routeError } = await supabase_1.supabaseAdmin
                .from('routes')
                .select('id, is_active, name')
                .eq('id', routeId)
                .maybeSingle();
            if (routeError || !route) {
                errors.push('Route not found');
            }
            else if (!route.is_active) {
                errors.push('Route is not active');
            }
            if (route && route.is_active) {
                const { data: existingBusWithRoute, error: existingBusWithRouteError } = await supabase_1.supabaseAdmin
                    .from('buses')
                    .select('id, bus_number, assigned_driver_profile_id')
                    .eq('route_id', routeId)
                    .eq('is_active', true)
                    .maybeSingle();
                if (!existingBusWithRouteError && existingBusWithRoute && existingBusWithRoute.id !== busId) {
                    conflicts.push(`Route ${route.name} is already assigned to bus ${existingBusWithRoute.bus_number}`);
                }
            }
            return {
                is_valid: errors.length === 0,
                errors,
                warnings,
                conflicts
            };
        }
        catch (error) {
            logger_1.logger.error('Error in validateAssignment', 'production-assignment-service', { error, driverId, busId, routeId });
            return {
                is_valid: false,
                errors: ['Validation error occurred'],
                warnings: [],
                conflicts: []
            };
        }
    }
    static async bulkAssignDrivers(assignments) {
        const results = {
            success: true,
            processed: assignments.length,
            successful: 0,
            failed: 0,
            errors: []
        };
        for (const assignment of assignments) {
            try {
                await this.createAssignment(assignment);
                results.successful++;
            }
            catch (error) {
                results.failed++;
                results.errors.push({
                    assignment,
                    error: error.message
                });
                logger_1.logger.error('Bulk assignment failed for one entry', 'production-assignment-service', { assignment, error: error.message });
            }
        }
        results.success = results.failed === 0;
        return results;
    }
    static async getAssignmentHistory(busId) {
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('assignment_history')
                .select('*')
                .eq('bus_id', busId)
                .order('created_at', { ascending: false })
                .limit(20);
            if (error) {
                logger_1.logger.error('Error fetching assignment history', 'production-assignment-service', { error, busId });
                throw error;
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getAssignmentHistory', 'production-assignment-service', { error, busId });
            throw error;
        }
    }
    static async getAvailableDrivers() {
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .select(`
          id,
          full_name,
          first_name,
          last_name,
          email,
          phone,
          is_active
        `)
                .eq('is_driver', true)
                .eq('is_active', true)
                .is('assigned_bus_id', null);
            if (error) {
                logger_1.logger.error('Error fetching available drivers', 'production-assignment-service', { error });
                throw error;
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getAvailableDrivers', 'production-assignment-service', { error });
            throw error;
        }
    }
    static async getAvailableBuses() {
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
          is_active
        `)
                .eq('is_active', true)
                .is('assigned_driver_profile_id', null);
            if (error) {
                logger_1.logger.error('Error fetching available buses', 'production-assignment-service', { error });
                throw error;
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getAvailableBuses', 'production-assignment-service', { error });
            throw error;
        }
    }
    static async getAvailableRoutes() {
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('routes')
                .select(`
          id,
          name,
          description,
          city,
          is_active
        `)
                .eq('is_active', true);
            if (error) {
                logger_1.logger.error('Error fetching available routes', 'production-assignment-service', { error });
                throw error;
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getAvailableRoutes', 'production-assignment-service', { error });
            throw error;
        }
    }
    static async getAssignedDrivers() {
        try {
            const { data: activeBuses, error: busesErr } = await supabase_1.supabaseAdmin
                .from('buses')
                .select('id,assigned_driver_profile_id,bus_number,vehicle_no')
                .eq('is_active', true)
                .not('assigned_driver_profile_id', 'is', null);
            if (busesErr) {
                logger_1.logger.error('Error fetching buses for assigned drivers', 'production-assignment-service', { error: busesErr });
                throw busesErr;
            }
            const activeBusList = activeBuses || [];
            const driverIds = Array.from(new Set(activeBusList.map((b) => b.assigned_driver_profile_id))).filter(Boolean);
            const { data, error } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .select('id,full_name,first_name,last_name,email,phone,role,is_active,created_at,updated_at')
                .in('id', driverIds);
            if (error) {
                logger_1.logger.error('Error fetching assigned drivers', 'production-assignment-service', { error });
                throw error;
            }
            const busByDriver = new Map(activeBusList.map((b) => [b.assigned_driver_profile_id, b]));
            return (data || []).map((d) => ({
                ...d,
                buses: busByDriver.get(d.id)
                    ? [{ id: busByDriver.get(d.id).id, bus_number: busByDriver.get(d.id).bus_number, vehicle_no: busByDriver.get(d.id).vehicle_no }]
                    : []
            }));
        }
        catch (error) {
            logger_1.logger.error('Error in getAssignedDrivers', 'production-assignment-service', { error });
            throw error;
        }
    }
}
exports.ProductionAssignmentService = ProductionAssignmentService;
//# sourceMappingURL=ProductionAssignmentService.js.map