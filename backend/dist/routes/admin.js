"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const OptimizedLocationService_1 = require("../services/OptimizedLocationService");
const routeController_1 = require("../controllers/routeController");
const ConsolidatedAdminService_1 = require("../services/ConsolidatedAdminService");
const logger_1 = require("../utils/logger");
const BackendDriverVerificationService_1 = require("../services/BackendDriverVerificationService");
const supabase_1 = require("../config/supabase");
const router = express_1.default.Router();
router.use(auth_1.authenticateUser);
router.use(auth_1.requireAdmin);
router.get('/analytics', async (req, res) => {
    try {
        const analytics = await ConsolidatedAdminService_1.ConsolidatedAdminService.getAnalytics();
        res.json({
            success: true,
            data: analytics,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching analytics', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/health', async (req, res) => {
    try {
        const health = await ConsolidatedAdminService_1.ConsolidatedAdminService.getSystemHealth();
        res.json({
            success: true,
            data: health,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching system health', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch system health',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/buses', async (req, res) => {
    try {
        const buses = await ConsolidatedAdminService_1.ConsolidatedAdminService.getAllBuses();
        res.json({
            success: true,
            data: buses,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching buses', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch buses',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/buses/:busId', async (req, res) => {
    try {
        const { busId } = req.params;
        const bus = await ConsolidatedAdminService_1.ConsolidatedAdminService.getBusById(busId);
        if (!bus) {
            return res.status(404).json({
                success: false,
                error: 'Bus not found',
                message: `Bus with ID ${busId} not found`,
            });
        }
        return res.json({
            success: true,
            data: bus,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching bus', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch bus',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/buses', async (req, res) => {
    try {
        const busData = req.body;
        const busNumber = busData.bus_number || busData.code;
        const vehicleNo = busData.vehicle_no || busData.bus_number;
        const capacity = busData.capacity;
        if (!busNumber || !vehicleNo || !capacity) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Bus number, vehicle number and capacity are required',
            });
        }
        const capacityNum = typeof capacity === 'number' ? capacity : parseInt(String(capacity), 10);
        if (isNaN(capacityNum) || capacityNum <= 0 || capacityNum > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Invalid capacity',
                message: 'Capacity must be a number between 1 and 1000',
            });
        }
        const normalizedBusData = {
            bus_number: String(busNumber).trim(),
            vehicle_no: String(vehicleNo).trim(),
            capacity: capacityNum,
            model: busData.model ? String(busData.model).trim() : null,
            year: busData.year ? parseInt(String(busData.year), 10) : null,
            bus_image_url: busData.bus_image_url ? String(busData.bus_image_url).trim() : null,
            assigned_driver_profile_id: busData.assigned_driver_profile_id && busData.assigned_driver_profile_id !== '' ? String(busData.assigned_driver_profile_id).trim() : null,
            route_id: busData.route_id && busData.route_id !== '' ? String(busData.route_id).trim() : null,
            is_active: busData.is_active === 'on' || busData.is_active === true || busData.is_active === 'true' || busData.is_active === undefined
        };
        if (normalizedBusData.year && (typeof normalizedBusData.year !== 'number' || normalizedBusData.year < 1900 || normalizedBusData.year > new Date().getFullYear() + 10)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid year',
                message: 'Year must be between 1900 and ' + (new Date().getFullYear() + 10),
            });
        }
        const newBus = await ConsolidatedAdminService_1.ConsolidatedAdminService.createBus(normalizedBusData);
        const wasReactivated = newBus.updated_at && newBus.created_at &&
            new Date(newBus.updated_at).getTime() - new Date(newBus.created_at).getTime() < 5000;
        return res.status(201).json({
            success: true,
            data: newBus,
            message: wasReactivated ? 'Bus reactivated and updated successfully' : 'Bus created successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating bus', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        let errorMessage = 'Unknown error occurred';
        let statusCode = 500;
        if (error instanceof Error) {
            if (error.message.includes('duplicate key') || error.message.includes('unique constraint') || error.message.includes('already exists')) {
                statusCode = 409;
                errorMessage = error.message.includes('bus_number')
                    ? `Bus number already exists. Please use a different bus number.`
                    : error.message.includes('vehicle_no')
                        ? `Vehicle number already exists. Please use a different vehicle number.`
                        : error.message;
            }
            else if (error.message.includes('already assigned')) {
                statusCode = 409;
                errorMessage = error.message;
            }
            else if (error.message.includes('not found') || error.message.includes('not active')) {
                statusCode = 400;
                errorMessage = error.message;
            }
            else if (error.message.includes('Missing required fields')) {
                statusCode = 400;
                errorMessage = error.message;
            }
            else if (error.message.includes('violates') || error.message.includes('constraint')) {
                statusCode = 400;
                errorMessage = error.message.includes('capacity')
                    ? 'Capacity must be between 1 and 1000'
                    : error.message.includes('year')
                        ? 'Year must be between 1900 and ' + (new Date().getFullYear() + 10)
                        : 'Invalid data provided. Please check all fields.';
            }
            else {
                errorMessage = error.message || 'Unknown error occurred';
            }
        }
        return res.status(statusCode).json({
            success: false,
            error: 'Failed to create bus',
            message: errorMessage,
        });
    }
});
router.put('/buses/:busId', async (req, res) => {
    try {
        const { busId } = req.params;
        const busData = req.body;
        const updatedBus = await ConsolidatedAdminService_1.ConsolidatedAdminService.updateBus(busId, busData);
        if (!updatedBus) {
            return res.status(404).json({
                success: false,
                error: 'Bus not found',
                message: `Bus with ID ${busId} not found`,
            });
        }
        return res.json({
            success: true,
            data: updatedBus,
            message: 'Bus updated successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating bus', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to update bus',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.delete('/buses/:busId', async (req, res) => {
    try {
        const { busId } = req.params;
        const deletedBus = await ConsolidatedAdminService_1.ConsolidatedAdminService.deleteBus(busId);
        if (!deletedBus) {
            return res.status(404).json({
                success: false,
                error: 'Bus not found',
                message: `Bus with ID ${busId} not found`,
            });
        }
        return res.json({
            success: true,
            data: deletedBus,
            message: 'Bus deleted successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting bus', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to delete bus',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/drivers', async (req, res) => {
    try {
        const drivers = await ConsolidatedAdminService_1.ConsolidatedAdminService.getAllDrivers();
        res.json({
            success: true,
            data: drivers,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching drivers', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch drivers',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/drivers/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        const driver = await ConsolidatedAdminService_1.ConsolidatedAdminService.getDriverById(driverId);
        if (!driver) {
            return res.status(404).json({
                success: false,
                error: 'Driver not found',
                message: `Driver with ID ${driverId} not found`,
            });
        }
        return res.json({
            success: true,
            data: driver,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching driver', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch driver',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/drivers/:driverId/bus', async (req, res) => {
    try {
        const { driverId } = req.params;
        const busInfo = await OptimizedLocationService_1.optimizedLocationService.getDriverBusInfo(driverId);
        if (!busInfo) {
            return res.status(404).json({
                success: false,
                error: 'Bus not found',
                message: `No bus assigned to driver ${driverId}`,
            });
        }
        return res.json({
            success: true,
            data: { busInfo },
            message: 'Driver bus information retrieved successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting driver bus info', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to get driver bus information',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/drivers/cleanup', async (req, res) => {
    try {
        const result = await ConsolidatedAdminService_1.ConsolidatedAdminService.cleanupInactiveDrivers();
        return res.json({
            success: true,
            data: result,
            message: `Cleanup completed: ${result.cleaned} drivers cleaned, ${result.errors.length} errors`,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error cleaning up inactive drivers', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to clean up inactive drivers',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/drivers', async (req, res) => {
    try {
        const driverData = req.body;
        if (!driverData.email ||
            !driverData.first_name ||
            !driverData.last_name ||
            !driverData.password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Email, first name, last name, and password are required',
            });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(driverData.email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format',
                message: 'Please provide a valid email address',
            });
        }
        if (driverData.password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Weak password',
                message: 'Password must be at least 6 characters long',
            });
        }
        if (driverData.first_name.trim().length === 0 || driverData.last_name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid name',
                message: 'First name and last name cannot be empty',
            });
        }
        if (driverData.phone && typeof driverData.phone !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone',
                message: 'Phone number must be a string',
            });
        }
        const startTime = Date.now();
        logger_1.logger.info('Creating driver', 'admin', { email: driverData.email, startTime });
        try {
            const newDriver = await ConsolidatedAdminService_1.ConsolidatedAdminService.createDriver(driverData);
            const duration = Date.now() - startTime;
            logger_1.logger.info('Driver created successfully', 'admin', {
                driverId: newDriver.id,
                email: newDriver.email,
                duration: `${duration}ms`
            });
            const isActive = newDriver.is_active !== undefined ? newDriver.is_active : true;
            return res.status(201).json({
                success: true,
                data: newDriver,
                message: isActive ? 'Driver created successfully with Supabase Auth account' : 'Driver reactivated successfully',
                timestamp: new Date().toISOString(),
            });
        }
        catch (createError) {
            const duration = Date.now() - startTime;
            logger_1.logger.error('Error in createDriver service call', 'admin', {
                error: createError instanceof Error ? createError.message : 'Unknown error',
                duration: `${duration}ms`,
                email: driverData.email
            });
            throw createError;
        }
    }
    catch (error) {
        logger_1.logger.error('Error creating driver', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        let errorMessage = 'Unknown error occurred';
        let statusCode = 500;
        if (error instanceof Error) {
            if (error.message.includes('already exists')) {
                statusCode = 409;
                errorMessage = error.message;
            }
            else if (error.message.includes('converting user from student to driver')) {
                statusCode = 500;
                errorMessage = 'Error while converting student to driver. Please try again or contact support.';
            }
            else if (error.message.includes('Invalid email format') ||
                error.message.includes('Weak password') ||
                error.message.includes('Invalid name') ||
                error.message.includes('Invalid phone')) {
                statusCode = 400;
                errorMessage = error.message;
            }
            else if (error.message.includes('Missing required fields')) {
                statusCode = 400;
                errorMessage = error.message;
            }
            else if (error.message.includes('Supabase')) {
                statusCode = 400;
                errorMessage = error.message;
            }
            else {
                errorMessage = error.message;
            }
        }
        return res.status(statusCode).json({
            success: false,
            error: 'Failed to create driver',
            message: errorMessage,
        });
    }
});
router.put('/drivers/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        const driverData = req.body;
        const updatedDriver = await ConsolidatedAdminService_1.ConsolidatedAdminService.updateDriver(driverId, driverData);
        if (!updatedDriver) {
            return res.status(404).json({
                success: false,
                error: 'Driver not found',
                message: `Driver with ID ${driverId} not found`,
            });
        }
        return res.json({
            success: true,
            data: updatedDriver,
            message: 'Driver updated successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating driver', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to update driver',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.delete('/drivers/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        const deletedDriver = await ConsolidatedAdminService_1.ConsolidatedAdminService.deleteDriver(driverId);
        if (!deletedDriver) {
            return res.status(404).json({
                success: false,
                error: 'Driver not found',
                message: `Driver with ID ${driverId} not found`,
            });
        }
        return res.json({
            success: true,
            data: deletedDriver,
            message: 'Driver deleted successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting driver', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to delete driver',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/routes', routeController_1.RouteController.getAllRoutes);
router.get('/routes/:routeId', routeController_1.RouteController.getRouteById);
router.post('/routes', routeController_1.RouteController.createRoute);
router.put('/routes/:routeId', routeController_1.RouteController.updateRoute);
router.delete('/routes/:routeId', routeController_1.RouteController.deleteRoute);
router.get('/diagnostics', async (req, res) => {
    try {
        const [{ data: shifts, error: e1 }, { data: rs, error: e2 }] = await Promise.all([
            supabase_1.supabaseAdmin.from('shifts').select('id').limit(1),
            supabase_1.supabaseAdmin.from('route_stops').select('id').limit(1)
        ]);
        if (e1 || e2)
            throw (e1 || e2);
        res.json({ success: true, data: { shifts_count: (shifts || []).length, route_stops_count: (rs || []).length } });
    }
    catch (error) {
        logger_1.logger.error('Diagnostics error', 'admin', { error: error?.message });
        res.status(500).json({ success: false, error: 'Diagnostics failed', message: error?.message });
    }
});
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
            logger_1.logger.warn('Error checking buses for shift usage', 'admin', { error: busesError.message });
        }
        if (buses && buses.length > 0)
            return true;
        const { data: history, error: historyError } = await supabase_1.supabaseAdmin
            .from('assignment_history')
            .select('id')
            .eq('shift_id', shiftId)
            .limit(1);
        if (historyError) {
            logger_1.logger.warn('Error checking assignment history for shift usage', 'admin', { error: historyError.message });
        }
        if (history && history.length > 0)
            return true;
        const { data: trips, error: tripsError } = await supabase_1.supabaseAdmin
            .from('trip_sessions')
            .select('id')
            .eq('shift_id', shiftId)
            .limit(1);
        if (tripsError) {
            logger_1.logger.warn('Error checking trip sessions for shift usage', 'admin', { error: tripsError.message });
        }
        if (trips && trips.length > 0)
            return true;
        return false;
    }
    catch (error) {
        logger_1.logger.error('Error checking if shift is in use', 'admin', { error: error?.message });
        return true;
    }
}
router.get('/shifts', async (req, res) => {
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
        logger_1.logger.error('Error fetching shifts', 'admin', { error: error?.message });
        res.status(500).json({ success: false, error: 'Failed to fetch shifts', message: error?.message });
    }
});
router.post('/shifts', async (req, res) => {
    try {
        const { name, start_time, end_time, description, is_active } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Name required',
                message: 'Shift name is required and cannot be empty'
            });
        }
        if (start_time || end_time) {
            const timeValidation = validateShiftTimes(start_time || '00:00', end_time || '23:59');
            if (!timeValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid time format',
                    message: timeValidation.error
                });
            }
        }
        const { data: existing } = await supabase_1.supabaseAdmin
            .from('shifts')
            .select('id')
            .eq('name', name.trim())
            .maybeSingle();
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Duplicate shift name',
                message: `A shift with the name "${name}" already exists`
            });
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
        logger_1.logger.info('Shift created successfully', 'admin', { shiftId: data.id, name: data.name });
        res.status(201).json({
            success: true,
            data: formattedData,
            message: 'Shift created successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating shift', 'admin', { error: error?.message });
        if (error?.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'Duplicate shift',
                message: 'A shift with this name already exists'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to create shift',
            message: error?.message || 'An unexpected error occurred'
        });
    }
});
router.put('/shifts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, start_time, end_time, description, is_active } = req.body;
        const { data: existing, error: fetchError } = await supabase_1.supabaseAdmin
            .from('shifts')
            .select('id, name, start_time, end_time')
            .eq('id', id)
            .single();
        if (fetchError || !existing) {
            return res.status(404).json({
                success: false,
                error: 'Shift not found',
                message: `Shift with ID ${id} not found`
            });
        }
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid name',
                    message: 'Shift name cannot be empty'
                });
            }
            const { data: duplicate } = await supabase_1.supabaseAdmin
                .from('shifts')
                .select('id')
                .eq('name', name.trim())
                .neq('id', id)
                .maybeSingle();
            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    error: 'Duplicate shift name',
                    message: `A shift with the name "${name}" already exists`
                });
            }
        }
        const finalStartTime = start_time !== undefined ? start_time : existing.start_time;
        const finalEndTime = end_time !== undefined ? end_time : existing.end_time;
        if (finalStartTime || finalEndTime) {
            const timeValidation = validateShiftTimes(finalStartTime || '00:00', finalEndTime || '23:59');
            if (!timeValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid time format',
                    message: timeValidation.error
                });
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
            return res.status(400).json({
                success: false,
                error: 'No changes provided',
                message: 'At least one field must be provided for update'
            });
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
        logger_1.logger.info('Shift updated successfully', 'admin', { shiftId: id });
        res.json({
            success: true,
            data: formattedData,
            message: 'Shift updated successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating shift', 'admin', { error: error?.message });
        if (error?.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'Duplicate shift',
                message: 'A shift with this name already exists'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to update shift',
            message: error?.message || 'An unexpected error occurred'
        });
    }
});
router.delete('/shifts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: existing, error: fetchError } = await supabase_1.supabaseAdmin
            .from('shifts')
            .select('id, name')
            .eq('id', id)
            .single();
        if (fetchError || !existing) {
            return res.status(404).json({
                success: false,
                error: 'Shift not found',
                message: `Shift with ID ${id} not found`
            });
        }
        const inUse = await isShiftInUse(id);
        if (inUse) {
            return res.status(409).json({
                success: false,
                error: 'Shift in use',
                message: `Cannot delete shift "${existing.name}" because it is currently assigned to buses or used in assignments. Please remove all assignments first.`
            });
        }
        const { error } = await supabase_1.supabaseAdmin
            .from('shifts')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        logger_1.logger.info('Shift deleted successfully', 'admin', { shiftId: id, name: existing.name });
        res.json({
            success: true,
            message: `Shift "${existing.name}" deleted successfully`
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting shift', 'admin', { error: error?.message });
        if (error?.code === '23503') {
            return res.status(409).json({
                success: false,
                error: 'Cannot delete shift',
                message: 'This shift is currently in use and cannot be deleted. Please remove all assignments first.'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to delete shift',
            message: error?.message || 'An unexpected error occurred'
        });
    }
});
router.get('/route-stops', async (req, res) => {
    try {
        const routeId = String(req.query.routeId || '');
        if (!routeId)
            return res.status(400).json({ success: false, error: 'routeId required' });
        const { data, error } = await supabase_1.supabaseAdmin
            .from('route_stops')
            .select('id, route_id, sequence, is_active, bus_stops:stop_id(name)')
            .eq('route_id', routeId)
            .order('sequence');
        if (error)
            throw error;
        const mapped = (data || []).map((r) => ({ id: r.id, route_id: r.route_id, name: r.bus_stops?.name, sequence: r.sequence, is_active: r.is_active }));
        res.json({ success: true, data: mapped });
    }
    catch (error) {
        logger_1.logger.error('Error fetching route stops', 'admin', { error: error?.message });
        res.status(500).json({ success: false, error: 'Failed to fetch route stops', message: error?.message });
    }
});
router.post('/route-stops', async (req, res) => {
    let busStopId = null;
    try {
        const { route_id, name } = req.body;
        if (!route_id || !name)
            return res.status(400).json({ success: false, error: 'route_id and name required' });
        const { data: routeExists, error: routeCheckError } = await supabase_1.supabaseAdmin
            .from('routes')
            .select('id')
            .eq('id', route_id)
            .single();
        if (routeCheckError || !routeExists) {
            return res.status(404).json({ success: false, error: 'Route not found' });
        }
        const trimmedName = String(name).trim();
        if (!trimmedName) {
            return res.status(400).json({ success: false, error: 'Stop name cannot be empty' });
        }
        const { data: busStop, error: busStopError } = await supabase_1.supabaseAdmin
            .from('bus_stops')
            .insert({ name: trimmedName, is_active: true })
            .select('id')
            .single();
        if (busStopError || !busStop?.id) {
            logger_1.logger.error('Error creating bus stop', 'admin', { error: busStopError?.message });
            return res.status(500).json({ success: false, error: 'Failed to create bus stop', message: busStopError?.message });
        }
        busStopId = busStop.id;
        const { data: maxStop } = await supabase_1.supabaseAdmin
            .from('route_stops')
            .select('sequence')
            .eq('route_id', route_id)
            .order('sequence', { ascending: false })
            .limit(1)
            .maybeSingle();
        const nextSeq = (maxStop?.sequence || 0) + 1;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('route_stops')
            .insert({ route_id, stop_id: busStopId, sequence: nextSeq, is_active: true })
            .select('id')
            .single();
        if (error) {
            if (busStopId) {
                try {
                    await supabase_1.supabaseAdmin.from('bus_stops').delete().eq('id', busStopId);
                    logger_1.logger.info('Cleaned up orphaned bus_stop after route_stop creation failure', 'admin', { busStopId });
                }
                catch (cleanupError) {
                    logger_1.logger.error('Error cleaning up orphaned bus_stop', 'admin', { error: cleanupError });
                }
            }
            throw error;
        }
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        logger_1.logger.error('Error creating route stop', 'admin', { error: error?.message });
        res.status(500).json({ success: false, error: 'Failed to create route stop', message: error?.message });
    }
});
router.put('/route-stops/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sequence, is_active } = req.body;
        const { data: rs } = await supabase_1.supabaseAdmin.from('route_stops').select('stop_id').eq('id', id).single();
        if (!rs)
            return res.status(404).json({ success: false, error: 'Route stop not found' });
        if (name !== undefined && rs.stop_id) {
            await supabase_1.supabaseAdmin.from('bus_stops').update({ name }).eq('id', rs.stop_id);
        }
        if (sequence !== undefined || is_active !== undefined) {
            const update = {};
            if (sequence !== undefined)
                update.sequence = sequence;
            if (is_active !== undefined)
                update.is_active = is_active;
            await supabase_1.supabaseAdmin.from('route_stops').update(update).eq('id', id);
        }
        res.json({ success: true });
    }
    catch (error) {
        logger_1.logger.error('Error updating route stop', 'admin', { error: error?.message });
        res.status(500).json({ success: false, error: 'Failed to update route stop', message: error?.message });
    }
});
router.delete('/route-stops/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase_1.supabaseAdmin.from('route_stops').delete().eq('id', id);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (error) {
        logger_1.logger.error('Error deleting route stop', 'admin', { error: error?.message });
        res.status(500).json({ success: false, error: 'Failed to delete route stop', message: error?.message });
    }
});
router.post('/route-stops/reorder', async (req, res) => {
    try {
        const { route_id, ordered_ids } = req.body;
        if (!route_id || !Array.isArray(ordered_ids)) {
            return res.status(400).json({ success: false, error: 'route_id and ordered_ids required' });
        }
        if (ordered_ids.length > 0) {
            const { data: existingStops, error: checkError } = await supabase_1.supabaseAdmin
                .from('route_stops')
                .select('id, route_id')
                .in('id', ordered_ids);
            if (checkError) {
                logger_1.logger.error('Error validating route stops', 'admin', { error: checkError.message });
                return res.status(500).json({ success: false, error: 'Failed to validate route stops', message: checkError.message });
            }
            const invalidStops = existingStops?.filter(stop => stop.route_id !== route_id) || [];
            if (invalidStops.length > 0) {
                logger_1.logger.error('Invalid route stops in reorder request', 'admin', {
                    invalidStopIds: invalidStops.map(s => s.id),
                    expectedRouteId: route_id
                });
                return res.status(400).json({
                    success: false,
                    error: 'Some stops do not belong to the specified route',
                    invalidStopIds: invalidStops.map(s => s.id)
                });
            }
            const existingIds = new Set(existingStops?.map(s => s.id) || []);
            const missingIds = ordered_ids.filter(id => !existingIds.has(id));
            if (missingIds.length > 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Some route stop IDs not found',
                    missingIds
                });
            }
        }
        let seq = 1;
        for (const id of ordered_ids) {
            const { error } = await supabase_1.supabaseAdmin
                .from('route_stops')
                .update({ sequence: seq++ })
                .eq('id', id)
                .eq('route_id', route_id);
            if (error) {
                logger_1.logger.error('Error updating sequence for route stop', 'admin', { id, error: error.message });
                throw error;
            }
        }
        res.json({ success: true });
    }
    catch (error) {
        logger_1.logger.error('Error reordering route stops', 'admin', { error: error?.message });
        res.status(500).json({ success: false, error: 'Failed to reorder route stops', message: error?.message });
    }
});
router.post('/clear-all-data', async (req, res) => {
    try {
        if (process.env.NODE_ENV !== 'development') {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: 'This endpoint is only available in development mode',
            });
        }
        const result = await ConsolidatedAdminService_1.ConsolidatedAdminService.clearAllData();
        return res.json({
            success: true,
            data: result,
            message: 'All data cleared successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error clearing all data', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to clear all data',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/verify-driver-system', async (req, res) => {
    try {
        logger_1.logger.info('🔍 Admin requested driver system verification', 'admin');
        const verificationResult = await BackendDriverVerificationService_1.backendDriverVerificationService.verifyBackendDriverSystem();
        res.json({
            success: true,
            data: verificationResult,
            summary: BackendDriverVerificationService_1.backendDriverVerificationService.getVerificationSummary(verificationResult),
            isReady: BackendDriverVerificationService_1.backendDriverVerificationService.isBackendReady(verificationResult),
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error verifying driver system', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({
            success: false,
            error: 'Failed to verify driver system',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map