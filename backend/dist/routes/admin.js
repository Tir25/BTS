"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminService_1 = require("../services/adminService");
const routeService_1 = require("../services/routeService");
const locationService_1 = require("../services/locationService");
const router = express_1.default.Router();
router.use(auth_1.authenticateUser);
router.use(auth_1.requireAdmin);
router.get('/analytics', async (req, res) => {
    try {
        const analytics = await adminService_1.AdminService.getAnalytics();
        res.json({
            success: true,
            data: analytics,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/health', async (req, res) => {
    try {
        const health = await adminService_1.AdminService.getSystemHealth();
        res.json({
            success: true,
            data: health,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error fetching system health:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch system health',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/buses', async (req, res) => {
    try {
        const buses = await adminService_1.AdminService.getAllBuses();
        res.json({
            success: true,
            data: buses,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error fetching buses:', error);
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
        const bus = await adminService_1.AdminService.getBusById(busId);
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
        console.error('❌ Error fetching bus:', error);
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
        if (!busData.code || !busData.number_plate || !busData.capacity) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Code, number plate and capacity are required',
            });
        }
        const newBus = await adminService_1.AdminService.createBus(busData);
        return res.status(201).json({
            success: true,
            data: newBus,
            message: 'Bus created successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error creating bus:', error);
        let errorMessage = 'Unknown error occurred';
        let statusCode = 500;
        if (error instanceof Error) {
            if (error.message.includes('already exists')) {
                statusCode = 409;
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
        const updatedBus = await adminService_1.AdminService.updateBus(busId, busData);
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
        console.error('❌ Error updating bus:', error);
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
        const deletedBus = await adminService_1.AdminService.deleteBus(busId);
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
        console.error('❌ Error deleting bus:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete bus',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/drivers', async (req, res) => {
    try {
        const drivers = await adminService_1.AdminService.getAllDrivers();
        res.json({
            success: true,
            data: drivers,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error fetching drivers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch drivers',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/assigned-drivers', async (req, res) => {
    try {
        const assignedDrivers = await adminService_1.AdminService.getAssignedDrivers();
        res.json({
            success: true,
            data: assignedDrivers,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error fetching assigned drivers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assigned drivers',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/drivers/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        const driver = await adminService_1.AdminService.getDriverById(driverId);
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
        console.error('❌ Error fetching driver:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch driver',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/drivers/:driverId/assign-bus', async (req, res) => {
    try {
        const { driverId } = req.params;
        const { busId } = req.body;
        if (!busId) {
            return res.status(400).json({
                success: false,
                error: 'Missing bus ID',
                message: 'Bus ID is required',
            });
        }
        const updatedBus = await adminService_1.AdminService.assignDriverToBus(driverId, busId);
        if (!updatedBus) {
            return res.status(404).json({
                success: false,
                error: 'Assignment failed',
                message: 'Driver or bus not found',
            });
        }
        return res.json({
            success: true,
            data: updatedBus,
            message: 'Driver assigned to bus successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error assigning driver to bus:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to assign driver to bus',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/drivers/:driverId/bus', async (req, res) => {
    try {
        const { driverId } = req.params;
        const busInfo = await (0, locationService_1.getDriverBusInfo)(driverId);
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
        console.error('❌ Error getting driver bus info:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get driver bus information',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/drivers/:driverId/unassign-bus', async (req, res) => {
    try {
        const { driverId } = req.params;
        const updatedBuses = await adminService_1.AdminService.unassignDriverFromBus(driverId);
        return res.json({
            success: true,
            data: updatedBuses,
            message: 'Driver unassigned from bus successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error unassigning driver from bus:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to unassign driver from bus',
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
        if (driverData.password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Weak password',
                message: 'Password must be at least 6 characters long',
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
        const newDriver = await adminService_1.AdminService.createDriver(driverData);
        return res.status(201).json({
            success: true,
            data: newDriver,
            message: 'Driver created successfully with Supabase Auth account',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error creating driver:', error);
        if (error instanceof Error && error.message.includes('Supabase')) {
            return res.status(400).json({
                success: false,
                error: 'Driver creation failed',
                message: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Failed to create driver',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.put('/drivers/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        const driverData = req.body;
        const updatedDriver = await adminService_1.AdminService.updateDriver(driverId, driverData);
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
        console.error('❌ Error updating driver:', error);
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
        const deletedDriver = await adminService_1.AdminService.deleteDriver(driverId);
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
        console.error('❌ Error deleting driver:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete driver',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/routes', async (req, res) => {
    try {
        const routes = await adminService_1.AdminService.getAllRoutes();
        res.json({
            success: true,
            data: routes,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error fetching routes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch routes',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/routes/:routeId', async (req, res) => {
    try {
        const { routeId } = req.params;
        const route = await routeService_1.RouteService.getRouteById(routeId);
        if (!route) {
            return res.status(404).json({
                success: false,
                error: 'Route not found',
                message: `Route with ID ${routeId} not found`,
            });
        }
        return res.json({
            success: true,
            data: route,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error fetching route:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch route',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/routes', async (req, res) => {
    try {
        const routeData = req.body;
        if (!routeData.name || !routeData.name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Route name is required',
                message: 'Route name cannot be empty',
            });
        }
        if (!routeData.city || !routeData.city.trim()) {
            return res.status(400).json({
                success: false,
                error: 'City is required',
                message: 'City cannot be empty',
            });
        }
        if (!routeData.description || !routeData.description.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Route description is required',
                message: 'Route description cannot be empty',
            });
        }
        const newRoute = await adminService_1.AdminService.createRoute(routeData);
        if (!newRoute) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create route',
                message: 'Database error occurred',
            });
        }
        return res.status(201).json({
            success: true,
            data: newRoute,
            message: 'Route created successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error creating route:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create route',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.put('/routes/:routeId', async (req, res) => {
    try {
        const { routeId } = req.params;
        const routeData = req.body;
        const updatedRoute = await adminService_1.AdminService.updateRoute(routeId, routeData);
        if (!updatedRoute) {
            return res.status(404).json({
                success: false,
                error: 'Route not found',
                message: `Route with ID ${routeId} not found`,
            });
        }
        return res.json({
            success: true,
            data: updatedRoute,
            message: 'Route updated successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error updating route:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update route',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.delete('/routes/:routeId', async (req, res) => {
    try {
        const { routeId } = req.params;
        const deletedRoute = await adminService_1.AdminService.deleteRoute(routeId);
        if (!deletedRoute) {
            return res.status(404).json({
                success: false,
                error: 'Route not found',
                message: `Route with ID ${routeId} not found`,
            });
        }
        return res.json({
            success: true,
            data: deletedRoute,
            message: 'Route deleted successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error deleting route:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete route',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
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
        const result = await adminService_1.AdminService.clearAllData();
        return res.json({
            success: true,
            data: result,
            message: 'All data cleared successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error clearing all data:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to clear all data',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map