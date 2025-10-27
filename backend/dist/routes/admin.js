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