/**
 * Assignment Creation Service
 * Handles creating, updating, and deleting assignments
 */

import { supabaseAdmin } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { AssignmentValidationService } from './AssignmentValidationService';
import { AssignmentDashboardService, AssignmentData } from './AssignmentDashboardService';

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

/**
 * Service for creating, updating, and deleting assignments
 */
export class AssignmentCreationService {
  /**
   * Create a new assignment with comprehensive validation
   */
  static async createAssignment(assignmentData: Omit<AssignmentData, 'id' | 'assigned_at'>): Promise<AssignmentData> {
    try {
      const { driver_id, bus_id, route_id, shift_id, assigned_by, notes, status = 'active' } = assignmentData;

      // Comprehensive validation
      const validation = await AssignmentValidationService.validateAssignment(driver_id, bus_id, route_id);
      if (!validation.is_valid) {
        throw new Error(`Assignment validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for conflicts
      if (validation.conflicts.length > 0) {
        logger.warn('Assignment conflicts detected', 'assignment-creation-service', { conflicts: validation.conflicts });
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
        logger.error('Error creating assignment', 'assignment-creation-service', { error: updateError, assignmentData });
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
        logger.error('Error inserting assignment history', 'assignment-creation-service', { error: historyError, driver_id, bus_id, route_id });
        // Log the error but don't fail the assignment
      }

      logger.info('Assignment created successfully', 'assignment-creation-service', { driver_id, bus_id, route_id });
      
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
      logger.error('Error in createAssignment', 'assignment-creation-service', { error, assignmentData });
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
      const currentAssignment = await AssignmentDashboardService.getAssignmentByBus(busId);
      if (!currentAssignment) {
        throw new Error('No assignment found for this bus');
      }

      // Validate new assignment
      const newDriverId = driver_id || currentAssignment.driver_id;
      const newRouteId = route_id || currentAssignment.route_id;
      
      const validation = await AssignmentValidationService.validateAssignment(newDriverId, busId, newRouteId);
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
        logger.error('Error updating assignment', 'assignment-creation-service', { error: updateError, busId, updateData });
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

      logger.info('Assignment updated successfully', 'assignment-creation-service', { busId });
      
      // Broadcast WebSocket update to affected driver
      try {
        const { globalIO } = require('../../sockets/websocket');
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
        logger.warn('Failed to broadcast WebSocket update', 'assignment-creation-service', { 
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
      logger.error('Error in updateAssignment', 'assignment-creation-service', { error, busId, updateData });
      throw error;
    }
  }

  /**
   * Remove an assignment
   */
  static async removeAssignment(busId: string, assignedBy: string, notes?: string): Promise<boolean> {
    try {
      // Get current assignment
      const currentAssignment = await AssignmentDashboardService.getAssignmentByBus(busId);
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
        logger.error('Error removing assignment', 'assignment-creation-service', { error: updateError, busId });
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

      logger.info('Assignment removed successfully', 'assignment-creation-service', { busId });
      return true;
    } catch (error) {
      logger.error('Error in removeAssignment', 'assignment-creation-service', { error, busId });
      throw error;
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
        logger.error('Bulk assignment failed for one entry', 'assignment-creation-service', { assignment, error: error.message });
      }
    }

    results.success = results.failed === 0;
    return results;
  }
}

