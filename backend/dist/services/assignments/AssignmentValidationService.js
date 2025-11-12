"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentValidationService = void 0;
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../utils/logger");
class AssignmentValidationService {
    static async fetchShiftDetails(shiftId) {
        if (!shiftId)
            return null;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('shifts')
            .select('id,name,start_time,end_time')
            .eq('id', shiftId)
            .maybeSingle();
        if (error) {
            logger_1.logger.warn('Error fetching shift details', 'assignment-validation-service', { error, shiftId });
            return null;
        }
        if (!data) {
            logger_1.logger.warn('Shift not found for assignment', 'assignment-validation-service', { shiftId });
            return null;
        }
        return {
            id: data.id,
            name: data.name || null,
            start_time: data.start_time ?? null,
            end_time: data.end_time ?? null,
        };
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
            logger_1.logger.error('Error in validateAssignment', 'assignment-validation-service', { error, driverId, busId, routeId });
            return {
                is_valid: false,
                errors: ['Validation error occurred'],
                warnings: [],
                conflicts: []
            };
        }
    }
}
exports.AssignmentValidationService = AssignmentValidationService;
//# sourceMappingURL=AssignmentValidationService.js.map