/**
 * Assignment Dashboard Service
 * Handles read operations for assignment dashboard and queries
 */

import { supabaseAdmin } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { AssignmentValidationService } from './AssignmentValidationService';

export interface AssignmentData {
  id?: string;
  driver_id: string;
  bus_id: string;
  route_id: string;
  shift_id?: string | null;
  shift_name?: string | null;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  assigned_by: string;
  notes?: string;
  assigned_at?: string;
  status: 'active' | 'inactive' | 'pending';
  // Additional fields for driver interface
  bus_number?: string;
  vehicle_no?: string;
  route_name?: string;
  driver_name?: string;
}

export interface AssignmentDashboard {
  total_assignments: number;
  active_assignments: number;
  unassigned_drivers: number;
  unassigned_buses: number;
  unassigned_routes: number;
  pending_assignments: number;
  recent_assignments: AssignmentData[];
}

// Result rows for specific selects
type BusRow = {
  id: string;
  bus_number?: string;
  vehicle_no?: string;
  assigned_driver_profile_id: string;
  route_id: string;
  assigned_shift_id?: string | null;
  assignment_status?: string;
  assignment_notes?: string;
  updated_at?: string;
};

type DriverRow = {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
};

type RouteRow = {
  id: string;
  name?: string;
  description?: string;
  city?: string;
};

/**
 * Service for assignment dashboard and query operations
 */
export class AssignmentDashboardService {
  /**
   * Get all assignments with comprehensive data
   */
  static async getAllAssignments(): Promise<AssignmentData[]> {
    try {
      // Fetch active buses with assignments
      const { data: buses, error } = await supabaseAdmin
        .from('buses')
        .select('id,bus_number,vehicle_no,assigned_driver_profile_id,route_id,assigned_shift_id,assignment_status,assignment_notes,updated_at')
        .eq('is_active', true)
        .not('assigned_driver_profile_id', 'is', null)
        .not('route_id', 'is', null);

      if (error) {
        logger.error('Error fetching all assignments', 'assignment-dashboard-service', { error });
        throw error;
      }

      const busList: BusRow[] = (buses as any[]) || [];
      const driverIds = Array.from(new Set(busList.map((b: BusRow) => b.assigned_driver_profile_id))).filter(Boolean) as string[];
      const routeIds = Array.from(new Set(busList.map((b: BusRow) => b.route_id))).filter(Boolean) as string[];
      const shiftIds = Array.from(new Set(busList.map((b: BusRow) => b.assigned_shift_id))).filter(Boolean) as string[];

      const [{ data: drivers }, { data: routes }, { data: shifts }] = await Promise.all([
        driverIds.length
          ? supabaseAdmin.from('user_profiles').select('id,full_name,first_name,last_name,email,phone').in('id', driverIds)
          : Promise.resolve({ data: [] as any[] } as any),
        routeIds.length
          ? supabaseAdmin.from('routes').select('id,name,description,city').in('id', routeIds)
          : Promise.resolve({ data: [] as any[] } as any),
        shiftIds.length
          ? supabaseAdmin.from('shifts').select('id,name,start_time,end_time').in('id', shiftIds)
          : Promise.resolve({ data: [] as any[] } as any),
      ]);

      const driverMap = new Map<string, DriverRow>((drivers as DriverRow[] | undefined || []).map((d: DriverRow) => [d.id, d]));
      const routeMap = new Map<string, RouteRow>((routes as RouteRow[] | undefined || []).map((r: RouteRow) => [r.id, r]));
      const shiftMap = new Map<string, { id: string; name?: string; start_time?: string | null; end_time?: string | null }>(
        ((shifts as any[]) || []).map((s: any) => [s.id, { id: s.id, name: s.name, start_time: s.start_time ?? null, end_time: s.end_time ?? null }])
      );

      // Log warnings for missing routes or drivers
      const missingRouteIds = busList
        .map(b => b.route_id)
        .filter(routeId => !routeMap.has(routeId));
      if (missingRouteIds.length > 0) {
        logger.warn('Some route IDs not found in routeMap', 'assignment-dashboard-service', {
          missingRouteIds: Array.from(new Set(missingRouteIds)),
          totalMissing: missingRouteIds.length
        });
      }

      const missingDriverIds = busList
        .map(b => b.assigned_driver_profile_id)
        .filter(driverId => !driverMap.has(driverId));
      if (missingDriverIds.length > 0) {
        logger.warn('Some driver IDs not found in driverMap', 'assignment-dashboard-service', {
          missingDriverIds: Array.from(new Set(missingDriverIds)),
          totalMissing: missingDriverIds.length
        });
      }

      const assignments = busList.map((bus: BusRow) => {
        const d: DriverRow | undefined = driverMap.get(bus.assigned_driver_profile_id);
        const r: RouteRow | undefined = routeMap.get(bus.route_id);
        const shiftId = bus.assigned_shift_id || null;
        const shift = shiftId ? shiftMap.get(shiftId) : undefined;
        
        // Provide meaningful fallback values
        const routeName = r?.name || `Route ${bus.route_id.substring(0, 8)}... (Not found)`;
        if (!r) {
          logger.warn('Route not found in assignment', 'assignment-dashboard-service', {
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
          bus_number: (bus as any).bus_number,
          vehicle_no: (bus as any).vehicle_no,
          driver_name: d?.full_name || 'Unknown Driver',
          driver_email: d?.email || '',
          driver_phone: d?.phone || '',
          route_name: routeName,
          route_description: r?.description || '',
          route_city: r?.city || '',
        } as any;
      });

      logger.info(`Fetched ${assignments.length} assignments`, 'assignment-dashboard-service');
      return assignments;
    } catch (error) {
      logger.error('Error in getAllAssignments', 'assignment-dashboard-service', { error });
      throw error;
    }
  }

  /**
   * Get assignment dashboard data
   */
  static async getAssignmentDashboard(): Promise<AssignmentDashboard> {
    try {
      // Fetch all necessary data in parallel
      const [assignmentsRes, driversRes, busesRes, routesRes] = await Promise.all([
        // Get all assignments (buses with both driver and route assigned)
        this.getAllAssignments(),
        // Get total active drivers
        supabaseAdmin.from('user_profiles').select('id', { count: 'exact' }).eq('role', 'driver').eq('is_active', true),
        // Get all active buses with assignment details
        supabaseAdmin.from('buses')
          .select('id, assigned_driver_profile_id, route_id, assignment_status')
          .eq('is_active', true),
        // Get all active routes with IDs
        supabaseAdmin.from('routes').select('id').eq('is_active', true)
      ]);

      const totalDrivers = driversRes.count || 0;
      const totalBuses = (busesRes.data || []).length;
      const allRoutesData = routesRes.data || [];
      const totalRoutes = allRoutesData.length;
      const allBuses = busesRes.data || [];

      // Calculate total assignments (buses with both driver AND route assigned, regardless of status)
      const totalAssignments = allBuses.filter(
        b => b.assigned_driver_profile_id && b.route_id
      ).length;

      // Calculate active assignments (buses with both driver and route AND status = 'active')
      const activeAssignments = allBuses.filter(
        b => b.assigned_driver_profile_id && 
             b.route_id && 
             (b.assignment_status === 'active' || b.assignment_status === 'assigned')
      ).length;

      // Calculate pending assignments (buses with both driver and route but status is 'inactive' or 'pending')
      const pendingAssignments = allBuses.filter(
        b => b.assigned_driver_profile_id && 
             b.route_id && 
             (b.assignment_status === 'inactive' || b.assignment_status === 'pending' || b.assignment_status === 'unassigned')
      ).length;

      // Calculate assigned buses (buses with both driver and route)
      const assignedBuses = allBuses.filter(
        b => b.assigned_driver_profile_id && b.route_id
      );

      // Count unique assigned drivers
      const uniqueAssignedDrivers = new Set(
        assignedBuses
          .map(b => b.assigned_driver_profile_id)
          .filter(Boolean)
      ).size;

      // Calculate unassigned drivers
      const unassignedDrivers = Math.max(0, totalDrivers - uniqueAssignedDrivers);

      // Calculate unassigned buses (buses missing either driver OR route)
      const unassignedBuses = allBuses.filter(
        b => !b.assigned_driver_profile_id || !b.route_id
      ).length;

      // Calculate unassigned routes (routes that have NO buses assigned to them)
      const assignedRouteIds = new Set(
        assignedBuses
          .map(b => b.route_id)
          .filter(Boolean)
      );
      
      // Find routes that have no buses assigned
      const allRouteIds = new Set(allRoutesData.map(r => r.id));
      const unassignedRoutes = Array.from(allRouteIds).filter(
        routeId => !assignedRouteIds.has(routeId)
      ).length;

      logger.info('Fetched assignment dashboard', 'assignment-dashboard-service', {
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
    } catch (error) {
      logger.error('Error in getAssignmentDashboard', 'assignment-dashboard-service', { error });
      throw error;
    }
  }

  /**
   * Get assignment by bus ID
   */
  static async getAssignmentByBus(busId: string): Promise<AssignmentData | null> {
    try {
      const { data, error } = await supabaseAdmin
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
        logger.error('Error fetching assignment by bus', 'assignment-dashboard-service', { error, busId });
        throw error;
      }

      if (!data || !data.assigned_driver_profile_id || !data.route_id) {
        return null;
      }

      const shiftId = (data as any).assigned_shift_id || null;
      const shiftDetails = await AssignmentValidationService.fetchShiftDetails(shiftId);

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
    } catch (error) {
      logger.error('Error in getAssignmentByBus', 'assignment-dashboard-service', { error, busId });
      throw error;
    }
  }

  /**
   * Get assignment by driver ID
   */
  static async getDriverAssignment(driverId: string): Promise<AssignmentData | null> {
    try {
      const { data, error } = await supabaseAdmin
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
        logger.error('Error fetching assignment by driver', 'assignment-dashboard-service', { error, driverId });
        throw error;
      }

      if (!data || !data.route_id) {
        logger.warn('Bus assignment found but no route_id', 'assignment-dashboard-service', { 
          driverId, 
          busId: data?.id,
          message: 'Driver has bus assignment but no route assigned. Admin should assign a route to this bus.'
        });
        return null;
      }

      // Get route information with proper error handling
      let routeName = '';
      const { data: routeData, error: routeError } = await supabaseAdmin
        .from('routes')
        .select('name, is_active')
        .eq('id', data.route_id)
        .maybeSingle();

      if (routeError) {
        logger.error('Error fetching route information', 'assignment-dashboard-service', { 
          error: routeError, 
          routeId: data.route_id,
          driverId 
        });
        routeName = `Route ${data.route_id.substring(0, 8)}... (Error loading name)`;
      } else if (!routeData) {
        logger.warn('Route not found for assignment', 'assignment-dashboard-service', { 
          routeId: data.route_id,
          driverId 
        });
        routeName = `Route ${data.route_id.substring(0, 8)}... (Not found)`;
      } else if (!routeData.is_active) {
        logger.warn('Route found but is inactive', 'assignment-dashboard-service', { 
          routeId: data.route_id,
          routeName: routeData.name,
          driverId 
        });
        routeName = routeData.name || `Route ${data.route_id.substring(0, 8)}...`;
      } else {
        routeName = routeData.name || '';
      }

      // Get driver information with proper error handling
      let driverName = '';
      const { data: driverData, error: driverError } = await supabaseAdmin
        .from('user_profiles')
        .select('full_name')
        .eq('id', driverId)
        .maybeSingle();

      if (driverError) {
        logger.error('Error fetching driver information', 'assignment-dashboard-service', { 
          error: driverError, 
          driverId 
        });
        driverName = 'Unknown Driver';
      } else if (!driverData) {
        logger.warn('Driver profile not found', 'assignment-dashboard-service', { driverId });
        driverName = 'Unknown Driver';
      } else {
        driverName = driverData.full_name || 'Unknown Driver';
      }

      // Validate that we have essential route information
      if (!routeName || routeName.includes('Error loading') || routeName.includes('Not found')) {
        logger.error('Critical: Route name could not be loaded for driver assignment', 'assignment-dashboard-service', {
          driverId,
          routeId: data.route_id,
          busId: data.id,
          routeName
        });
      }

      const shiftId = (data as any).assigned_shift_id || null;
      const shiftDetails = shiftId ? await AssignmentValidationService.fetchShiftDetails(shiftId) : null;

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
    } catch (error) {
      logger.error('Error in getDriverAssignment', 'assignment-dashboard-service', { error, driverId });
      throw error;
    }
  }

  /**
   * Get available drivers for assignment
   */
  static async getAvailableDrivers(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
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
        logger.error('Error fetching available drivers', 'assignment-dashboard-service', { error });
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAvailableDrivers', 'assignment-dashboard-service', { error });
      throw error;
    }
  }

  /**
   * Get available buses for assignment
   */
  static async getAvailableBuses(): Promise<any[]> {
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
          is_active
        `)
        .eq('is_active', true)
        .is('assigned_driver_profile_id', null);

      if (error) {
        logger.error('Error fetching available buses', 'assignment-dashboard-service', { error });
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAvailableBuses', 'assignment-dashboard-service', { error });
      throw error;
    }
  }

  /**
   * Get available routes for assignment
   */
  static async getAvailableRoutes(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
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
        logger.error('Error fetching available routes', 'assignment-dashboard-service', { error });
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAvailableRoutes', 'assignment-dashboard-service', { error });
      throw error;
    }
  }

  /**
   * Get assigned drivers
   */
  static async getAssignedDrivers(): Promise<any[]> {
    try {
      const { data: activeBuses, error: busesErr } = await supabaseAdmin
        .from('buses')
        .select('id,assigned_driver_profile_id,bus_number,vehicle_no')
        .eq('is_active', true)
        .not('assigned_driver_profile_id', 'is', null);

      if (busesErr) {
        logger.error('Error fetching buses for assigned drivers', 'assignment-dashboard-service', { error: busesErr });
        throw busesErr;
      }

      type ActiveBusRow = { id: string; assigned_driver_profile_id: string; bus_number?: string; vehicle_no?: string };
      const activeBusList: ActiveBusRow[] = (activeBuses as any[]) || [];
      const driverIds = Array.from(new Set(activeBusList.map((b: ActiveBusRow) => b.assigned_driver_profile_id))).filter(Boolean) as string[];

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id,full_name,first_name,last_name,email,phone,role,is_active,created_at,updated_at')
        .in('id', driverIds);

      if (error) {
        logger.error('Error fetching assigned drivers', 'assignment-dashboard-service', { error });
        throw error;
      }

      // Merge bus info into driver entries (first bus only for summary)
      const busByDriver = new Map<string, ActiveBusRow>(activeBusList.map((b: ActiveBusRow) => [b.assigned_driver_profile_id, b]));
      return ((data as any[]) || []).map((d: any) => ({
        ...d,
        buses: busByDriver.get(d.id)
          ? [{ id: busByDriver.get(d.id)!.id, bus_number: busByDriver.get(d.id)!.bus_number, vehicle_no: busByDriver.get(d.id)!.vehicle_no }]
          : []
      } as any));
    } catch (error) {
      logger.error('Error in getAssignedDrivers', 'assignment-dashboard-service', { error });
      throw error;
    }
  }

  /**
   * Get assignment history for a bus
   */
  static async getAssignmentHistory(busId: string): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('assignment_history')
        .select('*')
        .eq('bus_id', busId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('Error fetching assignment history', 'assignment-dashboard-service', { error, busId });
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAssignmentHistory', 'assignment-dashboard-service', { error, busId });
      throw error;
    }
  }
}

