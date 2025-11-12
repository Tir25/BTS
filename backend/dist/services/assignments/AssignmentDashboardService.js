"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentDashboardService = void 0;
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../utils/logger");
const AssignmentValidationService_1 = require("./AssignmentValidationService");
class AssignmentDashboardService {
    static async getAllAssignments() {
        try {
            const { data: buses, error } = await supabase_1.supabaseAdmin
                .from('buses')
                .select('id,bus_number,vehicle_no,assigned_driver_profile_id,route_id,assigned_shift_id,assignment_status,assignment_notes,updated_at')
                .eq('is_active', true)
                .not('assigned_driver_profile_id', 'is', null)
                .not('route_id', 'is', null);
            if (error) {
                logger_1.logger.error('Error fetching all assignments', 'assignment-dashboard-service', { error });
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
                logger_1.logger.warn('Some route IDs not found in routeMap', 'assignment-dashboard-service', {
                    missingRouteIds: Array.from(new Set(missingRouteIds)),
                    totalMissing: missingRouteIds.length
                });
            }
            const missingDriverIds = busList
                .map(b => b.assigned_driver_profile_id)
                .filter(driverId => !driverMap.has(driverId));
            if (missingDriverIds.length > 0) {
                logger_1.logger.warn('Some driver IDs not found in driverMap', 'assignment-dashboard-service', {
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
                    logger_1.logger.warn('Route not found in assignment', 'assignment-dashboard-service', {
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
            logger_1.logger.info(`Fetched ${assignments.length} assignments`, 'assignment-dashboard-service');
            return assignments;
        }
        catch (error) {
            logger_1.logger.error('Error in getAllAssignments', 'assignment-dashboard-service', { error });
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
            logger_1.logger.info('Fetched assignment dashboard', 'assignment-dashboard-service', {
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
            logger_1.logger.error('Error in getAssignmentDashboard', 'assignment-dashboard-service', { error });
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
                logger_1.logger.error('Error fetching assignment by bus', 'assignment-dashboard-service', { error, busId });
                throw error;
            }
            if (!data || !data.assigned_driver_profile_id || !data.route_id) {
                return null;
            }
            const shiftId = data.assigned_shift_id || null;
            const shiftDetails = await AssignmentValidationService_1.AssignmentValidationService.fetchShiftDetails(shiftId);
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
            logger_1.logger.error('Error in getAssignmentByBus', 'assignment-dashboard-service', { error, busId });
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
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                logger_1.logger.error('Error fetching assignment by driver', 'assignment-dashboard-service', { error, driverId });
                throw error;
            }
            if (!data || !data.route_id) {
                logger_1.logger.warn('Bus assignment found but no route_id', 'assignment-dashboard-service', {
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
                logger_1.logger.error('Error fetching route information', 'assignment-dashboard-service', {
                    error: routeError,
                    routeId: data.route_id,
                    driverId
                });
                routeName = `Route ${data.route_id.substring(0, 8)}... (Error loading name)`;
            }
            else if (!routeData) {
                logger_1.logger.warn('Route not found for assignment', 'assignment-dashboard-service', {
                    routeId: data.route_id,
                    driverId
                });
                routeName = `Route ${data.route_id.substring(0, 8)}... (Not found)`;
            }
            else if (!routeData.is_active) {
                logger_1.logger.warn('Route found but is inactive', 'assignment-dashboard-service', {
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
                logger_1.logger.error('Error fetching driver information', 'assignment-dashboard-service', {
                    error: driverError,
                    driverId
                });
                driverName = 'Unknown Driver';
            }
            else if (!driverData) {
                logger_1.logger.warn('Driver profile not found', 'assignment-dashboard-service', { driverId });
                driverName = 'Unknown Driver';
            }
            else {
                driverName = driverData.full_name || 'Unknown Driver';
            }
            if (!routeName || routeName.includes('Error loading') || routeName.includes('Not found')) {
                logger_1.logger.error('Critical: Route name could not be loaded for driver assignment', 'assignment-dashboard-service', {
                    driverId,
                    routeId: data.route_id,
                    busId: data.id,
                    routeName
                });
            }
            const shiftId = data.assigned_shift_id || null;
            const shiftDetails = shiftId ? await AssignmentValidationService_1.AssignmentValidationService.fetchShiftDetails(shiftId) : null;
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
            logger_1.logger.error('Error in getDriverAssignment', 'assignment-dashboard-service', { error, driverId });
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
                logger_1.logger.error('Error fetching available drivers', 'assignment-dashboard-service', { error });
                throw error;
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getAvailableDrivers', 'assignment-dashboard-service', { error });
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
                logger_1.logger.error('Error fetching available buses', 'assignment-dashboard-service', { error });
                throw error;
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getAvailableBuses', 'assignment-dashboard-service', { error });
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
                logger_1.logger.error('Error fetching available routes', 'assignment-dashboard-service', { error });
                throw error;
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getAvailableRoutes', 'assignment-dashboard-service', { error });
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
                logger_1.logger.error('Error fetching buses for assigned drivers', 'assignment-dashboard-service', { error: busesErr });
                throw busesErr;
            }
            const activeBusList = activeBuses || [];
            const driverIds = Array.from(new Set(activeBusList.map((b) => b.assigned_driver_profile_id))).filter(Boolean);
            const { data, error } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .select('id,full_name,first_name,last_name,email,phone,role,is_active,created_at,updated_at')
                .in('id', driverIds);
            if (error) {
                logger_1.logger.error('Error fetching assigned drivers', 'assignment-dashboard-service', { error });
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
            logger_1.logger.error('Error in getAssignedDrivers', 'assignment-dashboard-service', { error });
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
                .limit(20);
            if (error) {
                logger_1.logger.error('Error fetching assignment history', 'assignment-dashboard-service', { error, busId });
                throw error;
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Error in getAssignmentHistory', 'assignment-dashboard-service', { error, busId });
            throw error;
        }
    }
}
exports.AssignmentDashboardService = AssignmentDashboardService;
//# sourceMappingURL=AssignmentDashboardService.js.map