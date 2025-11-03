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
        const normalizedBusData = {
            ...busData,
            bus_number: busNumber,
            vehicle_no: vehicleNo,
            capacity: parseInt(capacity) || capacity,
            model: busData.model || null,
            year: busData.year ? parseInt(busData.year) : null,
            bus_image_url: busData.bus_image_url || null,
            assigned_driver_profile_id: busData.assigned_driver_profile_id,
            route_id: busData.route_id || null,
            is_active: busData.is_active === 'on' || busData.is_active === true || busData.is_active === 'true'
        };
        const capacityNum = parseInt(capacity) || capacity;
        if (typeof capacityNum !== 'number' || capacityNum <= 0 || capacityNum > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Invalid capacity',
                message: 'Capacity must be a number between 1 and 1000',
            });
        }
        if (normalizedBusData.year && (typeof normalizedBusData.year !== 'number' || normalizedBusData.year < 1900 || normalizedBusData.year > new Date().getFullYear() + 10)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid year',
                message: 'Year must be between 1900 and ' + (new Date().getFullYear() + 10),
            });
        }
        const newBus = await ConsolidatedAdminService_1.ConsolidatedAdminService.createBus(normalizedBusData);
        return res.status(201).json({
            success: true,
            data: newBus,
            message: 'Bus created successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating bus', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
        let errorMessage = 'Unknown error occurred';
        let statusCode = 500;
        if (error instanceof Error) {
            if (error.message.includes('already exists') || error.message.includes('already assigned')) {
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
            else if (error.message.includes('violates')) {
                statusCode = 400;
                errorMessage = 'Invalid data provided';
            }
            else {
                errorMessage = error.message;
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
        const newDriver = await ConsolidatedAdminService_1.ConsolidatedAdminService.createDriver(driverData);
        return res.status(201).json({
            success: true,
            data: newDriver,
            message: newDriver.is_active ? 'Driver created successfully with Supabase Auth account' : 'Driver reactivated successfully',
            timestamp: new Date().toISOString(),
        });
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
router.get('/shifts', async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabaseAdmin.from('shifts').select('id, name, start_time, end_time, description').order('name');
        if (error)
            throw error;
        res.json({ success: true, data });
    }
    catch (error) {
        logger_1.logger.error('Error fetching shifts', 'admin', { error: error?.message });
        res.status(500).json({ success: false, error: 'Failed to fetch shifts', message: error?.message });
    }
});
router.post('/shifts', async (req, res) => {
    try {
        const { name, start_time, end_time, description, is_active } = req.body;
        if (!name)
            return res.status(400).json({ success: false, error: 'Name required' });
        const { data, error } = await supabase_1.supabaseAdmin
            .from('shifts')
            .insert({ name, start_time, end_time, description })
            .select('id, name, start_time, end_time, description')
            .single();
        if (error)
            throw error;
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        logger_1.logger.error('Error creating shift', 'admin', { error: error?.message });
        res.status(500).json({ success: false, error: 'Failed to create shift', message: error?.message });
    }
});
router.put('/shifts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, start_time, end_time, description, is_active } = req.body;
        const update = {};
        if (name !== undefined)
            update.name = name;
        if (start_time !== undefined)
            update.start_time = start_time;
        if (end_time !== undefined)
            update.end_time = end_time;
        if (description !== undefined)
            update.description = description;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('shifts')
            .update(update)
            .eq('id', id)
            .select('id, name, start_time, end_time, description')
            .single();
        if (error)
            throw error;
        res.json({ success: true, data });
    }
    catch (error) {
        logger_1.logger.error('Error updating shift', 'admin', { error: error?.message });
        res.status(500).json({ success: false, error: 'Failed to update shift', message: error?.message });
    }
});
router.delete('/shifts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase_1.supabaseAdmin.from('shifts').delete().eq('id', id);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (error) {
        logger_1.logger.error('Error deleting shift', 'admin', { error: error?.message });
        res.status(500).json({ success: false, error: 'Failed to delete shift', message: error?.message });
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
    try {
        const { route_id, name } = req.body;
        if (!route_id || !name)
            return res.status(400).json({ success: false, error: 'route_id and name required' });
        const { data: busStop } = await supabase_1.supabaseAdmin
            .from('bus_stops')
            .insert({ name, is_active: true })
            .select('id')
            .single();
        const stopId = busStop?.id;
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
            .insert({ route_id, stop_id: stopId, sequence: nextSeq, is_active: true })
            .select('id')
            .single();
        if (error)
            throw error;
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
        if (!route_id || !Array.isArray(ordered_ids))
            return res.status(400).json({ success: false, error: 'route_id and ordered_ids required' });
        let seq = 1;
        for (const id of ordered_ids) {
            await supabase_1.supabaseAdmin.from('route_stops').update({ sequence: seq++ }).eq('id', id).eq('route_id', route_id);
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