"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentCreationService = void 0;
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../utils/logger");
const AssignmentValidationService_1 = require("./AssignmentValidationService");
const AssignmentDashboardService_1 = require("./AssignmentDashboardService");
class AssignmentCreationService {
    static async createAssignment(assignmentData) {
        try {
            const { driver_id, bus_id, route_id, shift_id, assigned_by, notes, status = 'active' } = assignmentData;
            const validation = await AssignmentValidationService_1.AssignmentValidationService.validateAssignment(driver_id, bus_id, route_id);
            if (!validation.is_valid) {
                throw new Error(`Assignment validation failed: ${validation.errors.join(', ')}`);
            }
            if (validation.conflicts.length > 0) {
                logger_1.logger.warn('Assignment conflicts detected', 'assignment-creation-service', { conflicts: validation.conflicts });
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
                logger_1.logger.error('Error creating assignment', 'assignment-creation-service', { error: updateError, assignmentData });
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
                logger_1.logger.error('Error inserting assignment history', 'assignment-creation-service', { error: historyError, driver_id, bus_id, route_id });
            }
            logger_1.logger.info('Assignment created successfully', 'assignment-creation-service', { driver_id, bus_id, route_id });
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
            logger_1.logger.error('Error in createAssignment', 'assignment-creation-service', { error, assignmentData });
            throw error;
        }
    }
    static async updateAssignment(busId, updateData) {
        try {
            const { driver_id, route_id, shift_id, assigned_by, notes, status } = updateData;
            const currentAssignment = await AssignmentDashboardService_1.AssignmentDashboardService.getAssignmentByBus(busId);
            if (!currentAssignment) {
                throw new Error('No assignment found for this bus');
            }
            const newDriverId = driver_id || currentAssignment.driver_id;
            const newRouteId = route_id || currentAssignment.route_id;
            const validation = await AssignmentValidationService_1.AssignmentValidationService.validateAssignment(newDriverId, busId, newRouteId);
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
                logger_1.logger.error('Error updating assignment', 'assignment-creation-service', { error: updateError, busId, updateData });
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
            logger_1.logger.info('Assignment updated successfully', 'assignment-creation-service', { busId });
            try {
                const { globalIO } = require('../../websocket/socketServer');
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
                logger_1.logger.warn('Failed to broadcast WebSocket update', 'assignment-creation-service', {
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
            logger_1.logger.error('Error in updateAssignment', 'assignment-creation-service', { error, busId, updateData });
            throw error;
        }
    }
    static async removeAssignment(busId, assignedBy, notes) {
        try {
            const currentAssignment = await AssignmentDashboardService_1.AssignmentDashboardService.getAssignmentByBus(busId);
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
                logger_1.logger.error('Error removing assignment', 'assignment-creation-service', { error: updateError, busId });
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
            logger_1.logger.info('Assignment removed successfully', 'assignment-creation-service', { busId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error in removeAssignment', 'assignment-creation-service', { error, busId });
            throw error;
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
                logger_1.logger.error('Bulk assignment failed for one entry', 'assignment-creation-service', { assignment, error: error.message });
            }
        }
        results.success = results.failed === 0;
        return results;
    }
}
exports.AssignmentCreationService = AssignmentCreationService;
//# sourceMappingURL=AssignmentCreationService.js.map