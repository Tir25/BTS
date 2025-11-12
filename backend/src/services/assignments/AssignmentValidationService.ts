/**
 * Assignment Validation Service
 * Handles validation logic for driver-bus-route assignments
 */

import { supabaseAdmin } from '../../config/supabase';
import { logger } from '../../utils/logger';

export interface AssignmentValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: string[];
}

/**
 * Service for validating assignments
 */
export class AssignmentValidationService {
  /**
   * Fetch shift details
   */
  static async fetchShiftDetails(shiftId: string | null): Promise<{
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
      logger.warn('Error fetching shift details', 'assignment-validation-service', { error, shiftId });
      return null;
    }

    if (!data) {
      logger.warn('Shift not found for assignment', 'assignment-validation-service', { shiftId });
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
      logger.error('Error in validateAssignment', 'assignment-validation-service', { error, driverId, busId, routeId });
      return {
        is_valid: false,
        errors: ['Validation error occurred'],
        warnings: [],
        conflicts: []
      };
    }
  }
}

