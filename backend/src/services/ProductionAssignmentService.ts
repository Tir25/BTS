/**
 * @deprecated This service is deprecated and will be removed in v2.0.0
 * Use the Assignment Microservice instead: /assignments
 * 
 * Production Assignment Service
 * Single source of truth for all driver-bus-route assignments
 * Industry-grade implementation with comprehensive validation, conflict resolution, and audit trails
 */

import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

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

export interface AssignmentValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: string[];
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

export interface BulkAssignmentResult {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    assignment: Partial<AssignmentData>;
    error: string;
  }>;
}

// Result rows for specific selects
// Bus row for getAllAssignments
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

export class ProductionAssignmentService {
  private static async fetchShiftDetails(shiftId: string | null): Promise<{
    id: string;
    name: string | null;
    start_time: string | null;
    end_time: string | null;
  } | null> {
    if (!shiftId) return null;

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .select('id,name,start_time,end_time')
      .eq('id', shiftId)
      .maybeSingle();

    if (error) {
      logger.warn('Error fetching shift details', 'production-assignment-service', { error, shiftId });
      return null;
    }

    if (!data) {
      logger.warn('Shift not found for assignment', 'production-assignment-service', { shiftId });
      return null;
    }

    return {
      id: data.id,
      name: (data as any).name || null,
      start_time: (data as any).start_time ?? null,
      end_time: (data as any).end_time ?? null,
    };
  }

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
        logger.error('Error fetching all assignments', 'production-assignment-service', { error });
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

      // PRODUCTION FIX: Log warnings for missing routes or drivers
      const missingRouteIds = busList
        .map(b => b.route_id)
        .filter(routeId => !routeMap.has(routeId));
      if (missingRouteIds.length > 0) {
        logger.warn('Some route IDs not found in routeMap', 'production-assignment-service', {
          missingRouteIds: Array.from(new Set(missingRouteIds)),
          totalMissing: missingRouteIds.length
        });
      }

      const missingDriverIds = busList
        .map(b => b.assigned_driver_profile_id)
        .filter(driverId => !driverMap.has(driverId));
      if (missingDriverIds.length > 0) {
        logger.warn('Some driver IDs not found in driverMap', 'production-assignment-service', {
          missingDriverIds: Array.from(new Set(missingDriverIds)),
          totalMissing: missingDriverIds.length
        });
      }

      const assignments = busList.map((bus: BusRow) => {
        const d: DriverRow | undefined = driverMap.get(bus.assigned_driver_profile_id);
        const r: RouteRow | undefined = routeMap.get(bus.route_id);
        const shiftId = bus.assigned_shift_id || null;
        const shift = shiftId ? shiftMap.get(shiftId) : undefined;
        
        // PRODUCTION FIX: Provide meaningful fallback values
        const routeName = r?.name || `Route ${bus.route_id.substring(0, 8)}... (Not found)`;
        if (!r) {
          logger.warn('Route not found in assignment', 'production-assignment-service', {
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

      logger.info(`Fetched ${assignments.length} assignments`, 'production-assignment-service');
      return assignments;
    } catch (error) {
      logger.error('Error in getAllAssignments', 'production-assignment-service', { error });
      throw error;
    }
  }

  /**
   * Get assignment dashboard data
   * Returns accurate metrics for assignment management
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

      // Count unique assigned drivers (drivers who have at least one bus with both driver and route assigned)
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

      logger.info('Fetched assignment dashboard', 'production-assignment-service', {
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
      logger.error('Error in getAssignmentDashboard', 'production-assignment-service', { error });
      throw error;
    }
  }

  /**
   * Create a new assignment with comprehensive validation
   */
  static async createAssignment(assignmentData: Omit<AssignmentData, 'id' | 'assigned_at'>): Promise<AssignmentData> {
    try {
      const { driver_id, bus_id, route_id, shift_id, assigned_by, notes, status = 'active' } = assignmentData;

      // Comprehensive validation
      const validation = await this.validateAssignment(driver_id, bus_id, route_id);
      if (!validation.is_valid) {
        throw new Error(`Assignment validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for conflicts
      if (validation.conflicts.length > 0) {
        logger.warn('Assignment conflicts detected', 'production-assignment-service', { conflicts: validation.conflicts });
      }

      // Update bus with assignment
      const { data: updatedBus, error: updateError } = await supabaseAdmin
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
        logger.error('Error creating assignment', 'production-assignment-service', { error: updateError, assignmentData });
        throw updateError;
      }

      // Log to assignment history
      const { error: historyError } = await supabaseAdmin
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
        logger.error('Error inserting assignment history', 'production-assignment-service', { error: historyError, driver_id, bus_id, route_id });
        // Log the error but don't fail the assignment
      }

      logger.info('Assignment created successfully', 'production-assignment-service', { driver_id, bus_id, route_id });
      
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
    } catch (error) {
      logger.error('Error in createAssignment', 'production-assignment-service', { error, assignmentData });
      throw error;
    }
  }

  /**
   * Update an existing assignment
   */
  static async updateAssignment(busId: string, updateData: Partial<Omit<AssignmentData, 'id' | 'assigned_at'>>): Promise<AssignmentData> {
    try {
      const { driver_id, route_id, shift_id, assigned_by, notes, status } = updateData;

      // Get current assignment
      const currentAssignment = await this.getAssignmentByBus(busId);
      if (!currentAssignment) {
        throw new Error('No assignment found for this bus');
      }

      // Validate new assignment
      const newDriverId = driver_id || currentAssignment.driver_id;
      const newRouteId = route_id || currentAssignment.route_id;
      
      const validation = await this.validateAssignment(newDriverId, busId, newRouteId);
      if (!validation.is_valid) {
        throw new Error(`Assignment validation failed: ${validation.errors.join(', ')}`);
      }

      // Update bus
      const { data: updatedBus, error: updateError } = await supabaseAdmin
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
        logger.error('Error updating assignment', 'production-assignment-service', { error: updateError, busId, updateData });
        throw updateError;
      }

      // Log to history
      await supabaseAdmin
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

      logger.info('Assignment updated successfully', 'production-assignment-service', { busId });
      
      // Broadcast WebSocket update to affected driver
      try {
        const { globalIO } = require('../sockets/websocket');
        if (globalIO && (globalIO as any).broadcastAssignmentUpdate) {
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
          (globalIO as any).broadcastAssignmentUpdate(newDriverId, assignmentData);
        }
      } catch (wsError) {
        logger.warn('Failed to broadcast WebSocket update', 'production-assignment-service', { 
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
    } catch (error) {
      logger.error('Error in updateAssignment', 'production-assignment-service', { error, busId, updateData });
      throw error;
    }
  }

  /**
   * Remove an assignment
   */
  static async removeAssignment(busId: string, assignedBy: string, notes?: string): Promise<boolean> {
    try {
      // Get current assignment
      const currentAssignment = await this.getAssignmentByBus(busId);
      if (!currentAssignment) {
        throw new Error('No assignment found for this bus');
      }

      // Update bus to remove assignment
      const { error: updateError } = await supabaseAdmin
        .from('buses')
        .update({
          assigned_driver_profile_id: null,
          route_id: null,
          assignment_status: 'inactive',
          assignment_notes: notes || 'Assignment removed',
        })
        .eq('id', busId);

      if (updateError) {
        logger.error('Error removing assignment', 'production-assignment-service', { error: updateError, busId });
        throw updateError;
      }

      // Log to history
      await supabaseAdmin
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

      logger.info('Assignment removed successfully', 'production-assignment-service', { busId });
      return true;
    } catch (error) {
      logger.error('Error in removeAssignment', 'production-assignment-service', { error, busId });
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
        logger.error('Error fetching assignment by bus', 'production-assignment-service', { error, busId });
        throw error;
      }

      if (!data || !data.assigned_driver_profile_id || !data.route_id) {
        return null;
      }

      const shiftId = (data as any).assigned_shift_id || null;
      const shiftDetails = await this.fetchShiftDetails(shiftId);

      return {
        id: data.id,
        driver_id: data.assigned_driver_profile_id,
        bus_id: data.id,
        route_id: data.route_id,
        assigned_by: 'system', // TODO: Get from assignment history
        notes: data.assignment_notes,
        assigned_at: data.updated_at,
        status: data.assignment_status || 'active',
        shift_id: shiftId,
        shift_name: shiftDetails?.name || null,
        shift_start_time: shiftDetails?.start_time ?? null,
        shift_end_time: shiftDetails?.end_time ?? null,
      };
    } catch (error) {
      logger.error('Error in getAssignmentByBus', 'production-assignment-service', { error, busId });
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
        logger.error('Error fetching assignment by driver', 'production-assignment-service', { error, driverId });
        throw error;
      }

      if (!data || !data.route_id) {
        // PRODUCTION FIX: Better error message for drivers without route assignment
        // This helps new drivers understand why stops aren't showing
        logger.warn('Bus assignment found but no route_id', 'production-assignment-service', { 
          driverId, 
          busId: data?.id,
          message: 'Driver has bus assignment but no route assigned. Admin should assign a route to this bus.'
        });
        return null;
      }

      // PRODUCTION FIX: Get route information with proper error handling
      let routeName = '';
      const { data: routeData, error: routeError } = await supabaseAdmin
        .from('routes')
        .select('name, is_active')
        .eq('id', data.route_id)
        .maybeSingle();

      if (routeError) {
        logger.error('Error fetching route information', 'production-assignment-service', { 
          error: routeError, 
          routeId: data.route_id,
          driverId 
        });
        // Don't fail the entire assignment if route lookup fails, but log it
        routeName = `Route ${data.route_id.substring(0, 8)}... (Error loading name)`;
      } else if (!routeData) {
        logger.warn('Route not found for assignment', 'production-assignment-service', { 
          routeId: data.route_id,
          driverId 
        });
        routeName = `Route ${data.route_id.substring(0, 8)}... (Not found)`;
      } else if (!routeData.is_active) {
        logger.warn('Route found but is inactive', 'production-assignment-service', { 
          routeId: data.route_id,
          routeName: routeData.name,
          driverId 
        });
        routeName = routeData.name || `Route ${data.route_id.substring(0, 8)}...`;
      } else {
        routeName = routeData.name || '';
      }

      // PRODUCTION FIX: Get driver information with proper error handling
      let driverName = '';
      const { data: driverData, error: driverError } = await supabaseAdmin
        .from('user_profiles')
        .select('full_name')
        .eq('id', driverId)
        .maybeSingle();

      if (driverError) {
        logger.error('Error fetching driver information', 'production-assignment-service', { 
          error: driverError, 
          driverId 
        });
        driverName = 'Unknown Driver';
      } else if (!driverData) {
        logger.warn('Driver profile not found', 'production-assignment-service', { driverId });
        driverName = 'Unknown Driver';
      } else {
        driverName = driverData.full_name || 'Unknown Driver';
      }

      // PRODUCTION FIX: Validate that we have essential route information
      if (!routeName || routeName.includes('Error loading') || routeName.includes('Not found')) {
        logger.error('Critical: Route name could not be loaded for driver assignment', 'production-assignment-service', {
          driverId,
          routeId: data.route_id,
          busId: data.id,
          routeName
        });
      }

      const shiftId = (data as any).assigned_shift_id || null;
      const shiftDetails = shiftId ? await this.fetchShiftDetails(shiftId) : null;

      return {
        id: data.id,
        driver_id: driverId,
        bus_id: data.id,
        route_id: data.route_id,
        assigned_by: 'system', // TODO: Get from assignment history
        notes: data.assignment_notes,
        assigned_at: data.updated_at,
        status: data.assignment_status || 'active',
        // Additional data for driver interface
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
      logger.error('Error in getDriverAssignment', 'production-assignment-service', { error, driverId });
      throw error;
    }
  }

  /**
   * Comprehensive assignment validation
   */
  static async validateAssignment(driverId: string, busId: string, routeId: string): Promise<AssignmentValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const conflicts: string[] = [];

    try {
      // Check driver
      const { data: driver, error: driverError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, is_active, role, full_name')
        .eq('id', driverId)
        .maybeSingle();

      if (driverError || !driver) {
        errors.push('Driver not found');
      } else if (driver.role !== 'driver') {
        errors.push('User is not a driver');
      } else if (!driver.is_active) {
        errors.push('Driver is not active');
      }

      // Check if driver is already assigned to another bus
      if (driver && driver.is_active) {
        const { data: existingBus, error: existingBusError } = await supabaseAdmin
          .from('buses')
          .select('id, bus_number, route_id')
          .eq('assigned_driver_profile_id', driverId)
          .eq('is_active', true)
          .maybeSingle();

        if (!existingBusError && existingBus && existingBus.id !== busId) {
          conflicts.push(`Driver ${driver.full_name} is already assigned to bus ${existingBus.bus_number}`);
        }
      }

      // Check bus
      const { data: bus, error: busError } = await supabaseAdmin
        .from('buses')
        .select('id, is_active, bus_number, assigned_driver_profile_id')
        .eq('id', busId)
        .maybeSingle();

      if (busError || !bus) {
        errors.push('Bus not found');
      } else if (!bus.is_active) {
        errors.push('Bus is not active');
      } else if (bus.assigned_driver_profile_id && bus.assigned_driver_profile_id !== driverId) {
        warnings.push(`Bus ${bus.bus_number} already has a different driver assigned`);
      }

      // Check route
      const { data: route, error: routeError } = await supabaseAdmin
        .from('routes')
        .select('id, is_active, name')
        .eq('id', routeId)
        .maybeSingle();

      if (routeError || !route) {
        errors.push('Route not found');
      } else if (!route.is_active) {
        errors.push('Route is not active');
      }

      // Check if route is already assigned to another bus
      if (route && route.is_active) {
        const { data: existingBusWithRoute, error: existingBusWithRouteError } = await supabaseAdmin
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
    } catch (error) {
      logger.error('Error in validateAssignment', 'production-assignment-service', { error, driverId, busId, routeId });
      return {
        is_valid: false,
        errors: ['Validation error occurred'],
        warnings: [],
        conflicts: []
      };
    }
  }

  /**
   * Bulk assignment operations
   */
  static async bulkAssignDrivers(assignments: Array<Omit<AssignmentData, 'id' | 'assigned_at'>>): Promise<BulkAssignmentResult> {
    const results: BulkAssignmentResult = {
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
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          assignment,
          error: error.message
        });
        logger.error('Bulk assignment failed for one entry', 'production-assignment-service', { assignment, error: error.message });
      }
    }

    results.success = results.failed === 0;
    return results;
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
        logger.error('Error fetching assignment history', 'production-assignment-service', { error, busId });
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAssignmentHistory', 'production-assignment-service', { error, busId });
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
        logger.error('Error fetching available drivers', 'production-assignment-service', { error });
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAvailableDrivers', 'production-assignment-service', { error });
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
        logger.error('Error fetching available buses', 'production-assignment-service', { error });
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAvailableBuses', 'production-assignment-service', { error });
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
        logger.error('Error fetching available routes', 'production-assignment-service', { error });
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAvailableRoutes', 'production-assignment-service', { error });
      throw error;
    }
  }

  /**
   * Get assigned drivers (moved from ConsolidatedAdminService)
   */
  static async getAssignedDrivers(): Promise<any[]> {
    try {
      // find drivers who have a bus assigned via separate queries
      const { data: activeBuses, error: busesErr } = await supabaseAdmin
        .from('buses')
        .select('id,assigned_driver_profile_id,bus_number,vehicle_no')
        .eq('is_active', true)
        .not('assigned_driver_profile_id', 'is', null);

      if (busesErr) {
        logger.error('Error fetching buses for assigned drivers', 'production-assignment-service', { error: busesErr });
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
        logger.error('Error fetching assigned drivers', 'production-assignment-service', { error });
        throw error;
      }

      // merge bus info into driver entries (first bus only for summary)
      const busByDriver = new Map<string, ActiveBusRow>(activeBusList.map((b: ActiveBusRow) => [b.assigned_driver_profile_id, b]));
      return ((data as any[]) || []).map((d: any) => ({
        ...d,
        buses: busByDriver.get(d.id)
          ? [{ id: busByDriver.get(d.id)!.id, bus_number: busByDriver.get(d.id)!.bus_number, vehicle_no: busByDriver.get(d.id)!.vehicle_no }]
          : []
      } as any));
    } catch (error) {
      logger.error('Error in getAssignedDrivers', 'production-assignment-service', { error });
      throw error;
    }
  }
}
