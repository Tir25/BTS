"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftController = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
function validateTimeFormat(time) {
    if (!time || typeof time !== 'string')
        return false;
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
}
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}
function validateShiftTimes(startTime, endTime) {
    if (!startTime || !endTime) {
        return { valid: false, error: 'Start time and end time are required' };
    }
    if (!validateTimeFormat(startTime)) {
        return { valid: false, error: `Invalid start time format: ${startTime}. Use HH:MM format (e.g., 08:00)` };
    }
    if (!validateTimeFormat(endTime)) {
        return { valid: false, error: `Invalid end time format: ${endTime}. Use HH:MM format (e.g., 14:00)` };
    }
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (start === end) {
        return { valid: false, error: 'Start time and end time cannot be the same' };
    }
    return { valid: true };
}
async function isShiftInUse(shiftId) {
    try {
        const { data: buses, error: busesError } = await supabase_1.supabaseAdmin
            .from('buses')
            .select('id')
            .or(`assigned_shift_id.eq.${shiftId},shift_id.eq.${shiftId}`)
            .limit(1);
        if (busesError) {
            logger_1.logger.warn('Error checking buses for shift usage', 'shift-controller', { error: busesError.message });
        }
        if (buses && buses.length > 0)
            return true;
        const { data: history, error: historyError } = await supabase_1.supabaseAdmin
            .from('assignment_history')
            .select('id')
            .eq('shift_id', shiftId)
            .limit(1);
        if (historyError) {
            logger_1.logger.warn('Error checking assignment history for shift usage', 'shift-controller', { error: historyError.message });
        }
        if (history && history.length > 0)
            return true;
        const { data: trips, error: tripsError } = await supabase_1.supabaseAdmin
            .from('trip_sessions')
            .select('id')
            .eq('shift_id', shiftId)
            .limit(1);
        if (tripsError) {
            logger_1.logger.warn('Error checking trip sessions for shift usage', 'shift-controller', { error: tripsError.message });
        }
        if (trips && trips.length > 0)
            return true;
        return false;
    }
    catch (error) {
        logger_1.logger.error('Error checking if shift is in use', 'shift-controller', { error: error?.message });
        return true;
    }
}
class ShiftController {
    static async getAllShifts(req, res) {
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('shifts')
                .select('id, name, start_time, end_time, description, is_active, created_at, updated_at')
                .order('name');
            if (error)
                throw error;
            const formattedData = (data || []).map((shift) => ({
                ...shift,
                start_time: shift.start_time ? shift.start_time.substring(0, 5) : null,
                end_time: shift.end_time ? shift.end_time.substring(0, 5) : null,
                is_active: shift.is_active ?? true,
            }));
            res.json({ success: true, data: formattedData });
        }
        catch (error) {
            logger_1.logger.error('Error fetching shifts', 'shift-controller', { error: error?.message });
            res.status(500).json({ success: false, error: 'Failed to fetch shifts', message: error?.message });
        }
    }
    static async createShift(req, res) {
        try {
            const { name, start_time, end_time, description, is_active } = req.body;
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'Name required',
                    message: 'Shift name is required and cannot be empty'
                });
                return;
            }
            if (start_time || end_time) {
                const timeValidation = validateShiftTimes(start_time || '00:00', end_time || '23:59');
                if (!timeValidation.valid) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid time format',
                        message: timeValidation.error
                    });
                    return;
                }
            }
            const { data: existing } = await supabase_1.supabaseAdmin
                .from('shifts')
                .select('id')
                .eq('name', name.trim())
                .maybeSingle();
            if (existing) {
                res.status(409).json({
                    success: false,
                    error: 'Duplicate shift name',
                    message: `A shift with the name "${name}" already exists`
                });
                return;
            }
            const insertData = {
                name: name.trim(),
                is_active: is_active !== undefined ? Boolean(is_active) : true,
            };
            if (start_time)
                insertData.start_time = start_time;
            if (end_time)
                insertData.end_time = end_time;
            if (description !== undefined)
                insertData.description = description?.trim() || null;
            const { data, error } = await supabase_1.supabaseAdmin
                .from('shifts')
                .insert(insertData)
                .select('id, name, start_time, end_time, description, is_active')
                .single();
            if (error)
                throw error;
            const formattedData = {
                ...data,
                start_time: data.start_time ? data.start_time.substring(0, 5) : null,
                end_time: data.end_time ? data.end_time.substring(0, 5) : null,
            };
            logger_1.logger.info('Shift created successfully', 'shift-controller', { shiftId: data.id, name: data.name });
            res.status(201).json({
                success: true,
                data: formattedData,
                message: 'Shift created successfully'
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating shift', 'shift-controller', { error: error?.message });
            if (error?.code === '23505') {
                res.status(409).json({
                    success: false,
                    error: 'Duplicate shift',
                    message: 'A shift with this name already exists'
                });
                return;
            }
            res.status(500).json({
                success: false,
                error: 'Failed to create shift',
                message: error?.message || 'An unexpected error occurred'
            });
        }
    }
    static async updateShift(req, res) {
        try {
            const { id } = req.params;
            const { name, start_time, end_time, description, is_active } = req.body;
            const { data: existing, error: fetchError } = await supabase_1.supabaseAdmin
                .from('shifts')
                .select('id, name, start_time, end_time')
                .eq('id', id)
                .single();
            if (fetchError || !existing) {
                res.status(404).json({
                    success: false,
                    error: 'Shift not found',
                    message: `Shift with ID ${id} not found`
                });
                return;
            }
            if (name !== undefined) {
                if (typeof name !== 'string' || name.trim().length === 0) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid name',
                        message: 'Shift name cannot be empty'
                    });
                    return;
                }
                const { data: duplicate } = await supabase_1.supabaseAdmin
                    .from('shifts')
                    .select('id')
                    .eq('name', name.trim())
                    .neq('id', id)
                    .maybeSingle();
                if (duplicate) {
                    res.status(409).json({
                        success: false,
                        error: 'Duplicate shift name',
                        message: `A shift with the name "${name}" already exists`
                    });
                    return;
                }
            }
            const finalStartTime = start_time !== undefined ? start_time : existing.start_time;
            const finalEndTime = end_time !== undefined ? end_time : existing.end_time;
            if (finalStartTime || finalEndTime) {
                const timeValidation = validateShiftTimes(finalStartTime || '00:00', finalEndTime || '23:59');
                if (!timeValidation.valid) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid time format',
                        message: timeValidation.error
                    });
                    return;
                }
            }
            const update = {};
            if (name !== undefined)
                update.name = name.trim();
            if (start_time !== undefined)
                update.start_time = start_time;
            if (end_time !== undefined)
                update.end_time = end_time;
            if (description !== undefined)
                update.description = description?.trim() || null;
            if (is_active !== undefined)
                update.is_active = Boolean(is_active);
            if (Object.keys(update).length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'No changes provided',
                    message: 'At least one field must be provided for update'
                });
                return;
            }
            const { data, error } = await supabase_1.supabaseAdmin
                .from('shifts')
                .update(update)
                .eq('id', id)
                .select('id, name, start_time, end_time, description, is_active')
                .single();
            if (error)
                throw error;
            const formattedData = {
                ...data,
                start_time: data.start_time ? data.start_time.substring(0, 5) : null,
                end_time: data.end_time ? data.end_time.substring(0, 5) : null,
            };
            logger_1.logger.info('Shift updated successfully', 'shift-controller', { shiftId: id });
            res.json({
                success: true,
                data: formattedData,
                message: 'Shift updated successfully'
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating shift', 'shift-controller', { error: error?.message });
            if (error?.code === '23505') {
                res.status(409).json({
                    success: false,
                    error: 'Duplicate shift',
                    message: 'A shift with this name already exists'
                });
                return;
            }
            res.status(500).json({
                success: false,
                error: 'Failed to update shift',
                message: error?.message || 'An unexpected error occurred'
            });
        }
    }
    static async deleteShift(req, res) {
        try {
            const { id } = req.params;
            const { data: existing, error: fetchError } = await supabase_1.supabaseAdmin
                .from('shifts')
                .select('id, name')
                .eq('id', id)
                .single();
            if (fetchError || !existing) {
                res.status(404).json({
                    success: false,
                    error: 'Shift not found',
                    message: `Shift with ID ${id} not found`
                });
                return;
            }
            const inUse = await isShiftInUse(id);
            if (inUse) {
                res.status(409).json({
                    success: false,
                    error: 'Shift in use',
                    message: `Cannot delete shift "${existing.name}" because it is currently assigned to buses or used in assignments. Please remove all assignments first.`
                });
                return;
            }
            const { error } = await supabase_1.supabaseAdmin
                .from('shifts')
                .delete()
                .eq('id', id);
            if (error)
                throw error;
            logger_1.logger.info('Shift deleted successfully', 'shift-controller', { shiftId: id, name: existing.name });
            res.json({
                success: true,
                message: `Shift "${existing.name}" deleted successfully`
            });
        }
        catch (error) {
            logger_1.logger.error('Error deleting shift', 'shift-controller', { error: error?.message });
            if (error?.code === '23503') {
                res.status(409).json({
                    success: false,
                    error: 'Cannot delete shift',
                    message: 'This shift is currently in use and cannot be deleted. Please remove all assignments first.'
                });
                return;
            }
            res.status(500).json({
                success: false,
                error: 'Failed to delete shift',
                message: error?.message || 'An unexpected error occurred'
            });
        }
    }
}
exports.ShiftController = ShiftController;
//# sourceMappingURL=shiftController.js.map