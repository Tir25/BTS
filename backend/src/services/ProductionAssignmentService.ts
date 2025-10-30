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

export class ProductionAssignmentService {
  /**
   * Get all assignments with comprehensive data
   */
  static async getAllAssignments(): Promise<AssignmentData[]> {
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
          updated_at,
          user_profiles!buses_assigned_driver_profile_id_fkey(
            id,
            full_name,
            first_name,
            last_name,
            email,
            phone
          ),
          routes!buses_route_id_fkey(
            id,
            name,
            description,
            city
          )
        `)
        .not('assigned_driver_profile_id', 'is', null)
        .not('route_id', 'is', null)
        .eq('is_active', true);

      if (error) {
        logger.error('Error fetching all assignments', 'production-assignment-service', { error });
        throw error;
      }

      const assignments = (data || []).map(bus => ({
        id: bus.id,
        driver_id: bus.assigned_driver_profile_id,
        bus_id: bus.id,
        route_id: bus.route_id,
        assigned_by: 'system', // TODO: Get from assignment history
        notes: bus.assignment_notes,
        assigned_at: bus.updated_at,
        status: bus.assignment_status || 'active',
        shift_id: (bus as any).assigned_shift_id || null,
        // Additional display data
        bus_number: bus.bus_number,
        vehicle_no: bus.vehicle_no,
        driver_name: (bus.user_profiles as any)?.full_name || 'Unknown',
        driver_email: (bus.user_profiles as any)?.email || '',
        driver_phone: (bus.user_profiles as any)?.phone || '',
        route_name: (bus.routes as any)?.name || 'Unknown',
        route_description: (bus.routes as any)?.description || '',
        route_city: (bus.routes as any)?.city || '',
      }));

      logger.info(`Fetched ${assignments.length} assignments`, 'production-assignment-service');
      return assignments;
    } catch (error) {
      logger.error('Error in getAllAssignments', 'production-assignment-service', { error });
      throw error;
    }
  }

  /**
   * Get assignment dashboard data
   */
  static async getAssignmentDashboard(): Promise<AssignmentDashboard> {
    try {
      const [assignmentsRes, driversRes, busesRes, routesRes] = await Promise.all([
        this.getAllAssignments(),
        supabaseAdmin.from('user_profiles').select('id', { count: 'exact' }).eq('is_driver', true).eq('is_active', true),
        supabaseAdmin.from('buses').select('id, assigned_driver_profile_id, route_id', { count: 'exact' }).eq('is_active', true),
        supabaseAdmin.from('routes').select('id', { count: 'exact' }).eq('is_active', true)
      ]);

      const activeAssignments = assignmentsRes.length;
      const totalDrivers = driversRes.count || 0;
      const totalBuses = busesRes.count || 0;
      const totalRoutes = routesRes.count || 0;
      
      const assignedBuses = (busesRes.data || []).filter(b => b.assigned_driver_profile_id && b.route_id).length;
      const unassignedDrivers = totalDrivers - assignedBuses;
      const unassignedBuses = totalBuses - assignedBuses;
      const unassignedRoutes = totalRoutes - assignedBuses;

      logger.info('Fetched assignment dashboard', 'production-assignment-service', {
        activeAssignments,
        totalDrivers,
        totalBuses,
        totalRoutes,
        unassignedDrivers,
        unassignedBuses,
        unassignedRoutes
      });

      return {
        total_assignments: activeAssignments,
        active_assignments: activeAssignments,
        unassigned_drivers: unassignedDrivers,
        unassigned_buses: unassignedBuses,
        unassigned_routes: unassignedRoutes,
        pending_assignments: 0, // TODO: Implement pending assignments
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
          assigned_driver_profile_id,
          route_id,
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

      return {
        id: data.id,
        driver_id: data.assigned_driver_profile_id,
        bus_id: data.id,
        route_id: data.route_id,
        assigned_by: 'system', // TODO: Get from assignment history
        notes: data.assignment_notes,
        assigned_at: data.updated_at,
        status: data.assignment_status || 'active',
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
        return null;
      }

      // Get route information
      const { data: routeData } = await supabaseAdmin
        .from('routes')
        .select('name')
        .eq('id', data.route_id)
        .single();

      // Get driver information
      const { data: driverData } = await supabaseAdmin
        .from('user_profiles')
        .select('full_name')
        .eq('id', driverId)
        .single();

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
        route_name: routeData?.name || '',
        driver_name: driverData?.full_name || '',
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
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select(`
          id,
          full_name,
          first_name,
          last_name,
          email,
          phone,
          role,
          is_active,
          created_at,
          updated_at,
          buses!buses_assigned_driver_profile_id_fkey(
            id,
            bus_number,
            vehicle_no
          )
        `)
        .eq('role', 'driver')
        .eq('is_active', true)
        .not('buses', 'is', null);

      if (error) {
        logger.error('Error fetching assigned drivers', 'production-assignment-service', { error });
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAssignedDrivers', 'production-assignment-service', { error });
      throw error;
    }
  }
}
