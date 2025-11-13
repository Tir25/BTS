"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const routeController_1 = require("../controllers/routeController");
const busController_1 = require("../controllers/busController");
const driverController_1 = require("../controllers/driverController");
const shiftController_1 = require("../controllers/shiftController");
const routeStopController_1 = require("../controllers/routeStopController");
const analyticsController_1 = require("../controllers/analyticsController");
const logger_1 = require("../utils/logger");
const BackendDriverVerificationService_1 = require("../services/BackendDriverVerificationService");
const supabase_1 = require("../config/supabase");
const router = express_1.default.Router();
router.use(auth_1.authenticateUser);
router.use(auth_1.requireAdmin);
router.get('/analytics', analyticsController_1.AnalyticsController.getAnalytics);
router.get('/health', analyticsController_1.AnalyticsController.getSystemHealth);
router.get('/buses', busController_1.BusController.getAllBuses);
router.get('/buses/:busId', busController_1.BusController.getBusById);
router.post('/buses', busController_1.BusController.createBus);
router.put('/buses/:busId', busController_1.BusController.updateBus);
router.delete('/buses/:busId', busController_1.BusController.deleteBus);
router.get('/drivers', driverController_1.DriverController.getAllDrivers);
router.get('/drivers/:driverId', driverController_1.DriverController.getDriverById);
router.get('/drivers/:driverId/bus', driverController_1.DriverController.getDriverBusInfo);
router.post('/drivers', driverController_1.DriverController.createDriver);
router.put('/drivers/:driverId', driverController_1.DriverController.updateDriver);
router.delete('/drivers/:driverId', driverController_1.DriverController.deleteDriver);
router.post('/drivers/cleanup', driverController_1.DriverController.cleanupInactiveDrivers);
router.get('/routes', routeController_1.RouteController.getAllRoutes);
router.get('/routes/:routeId', routeController_1.RouteController.getRouteById);
router.post('/routes', routeController_1.RouteController.createRoute);
router.put('/routes/:routeId', routeController_1.RouteController.updateRoute);
router.delete('/routes/:routeId', routeController_1.RouteController.deleteRoute);
router.get('/shifts', shiftController_1.ShiftController.getAllShifts);
router.post('/shifts', shiftController_1.ShiftController.createShift);
router.put('/shifts/:id', shiftController_1.ShiftController.updateShift);
router.delete('/shifts/:id', shiftController_1.ShiftController.deleteShift);
router.get('/route-stops', routeStopController_1.RouteStopController.getRouteStops);
router.post('/route-stops', routeStopController_1.RouteStopController.createRouteStop);
router.put('/route-stops/:id', routeStopController_1.RouteStopController.updateRouteStop);
router.delete('/route-stops/:id', routeStopController_1.RouteStopController.deleteRouteStop);
router.post('/route-stops/reorder', routeStopController_1.RouteStopController.reorderRouteStops);
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
router.post('/clear-all-data', analyticsController_1.AnalyticsController.clearAllData);
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