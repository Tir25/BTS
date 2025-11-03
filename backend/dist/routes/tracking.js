"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const TrackingService_1 = require("../services/TrackingService");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
router.use(auth_1.authenticateUser);
router.post('/start', auth_1.requireAdminOrDriver, async (req, res) => {
    try {
        const driverId = req.body.driverId || req.user?.id;
        const shiftId = req.body.shiftId;
        if (!driverId)
            return res.status(400).json({ success: false, error: 'driverId required' });
        const session = await TrackingService_1.TrackingService.startTracking(driverId, shiftId);
        return res.json({ success: true, data: session });
    }
    catch (error) {
        logger_1.logger.error('Error starting tracking', 'tracking-routes', { error: error?.message });
        return res.status(500).json({ success: false, error: 'Failed to start tracking', message: error?.message });
    }
});
router.post('/stop', auth_1.requireAdminOrDriver, async (req, res) => {
    try {
        const driverId = req.body.driverId || req.user?.id;
        if (!driverId)
            return res.status(400).json({ success: false, error: 'driverId required' });
        const result = await TrackingService_1.TrackingService.stopTracking(driverId);
        return res.json({ success: true, data: result });
    }
    catch (error) {
        logger_1.logger.error('Error stopping tracking', 'tracking-routes', { error: error?.message });
        return res.status(500).json({ success: false, error: 'Failed to stop tracking', message: error?.message });
    }
});
router.post('/stop-reached', auth_1.requireAdminOrDriver, async (req, res) => {
    try {
        const driverId = req.body.driverId || req.user?.id;
        const routeStopId = req.body.stopId;
        if (!driverId || !routeStopId)
            return res.status(400).json({ success: false, error: 'driverId and stopId required' });
        const result = await TrackingService_1.TrackingService.stopReached(driverId, routeStopId);
        return res.json({ success: true, data: result });
    }
    catch (error) {
        logger_1.logger.error('Error marking stop reached', 'tracking-routes', { error: error?.message });
        return res.status(500).json({ success: false, error: 'Failed to mark stop reached', message: error?.message });
    }
});
router.get('/assignment', auth_1.requireAdminOrDriver, async (req, res) => {
    try {
        const driverId = req.query.driverId || req.user?.id;
        if (!driverId)
            return res.status(400).json({ success: false, error: 'driverId required' });
        const data = await TrackingService_1.TrackingService.getDriverAssignmentWithStops(driverId);
        if (!data)
            return res.status(404).json({ success: false, error: 'No assignment found' });
        return res.json({ success: true, data });
    }
    catch (error) {
        logger_1.logger.error('Error getting assignment with stops', 'tracking-routes', { error: error?.message });
        return res.status(500).json({ success: false, error: 'Failed to get assignment', message: error?.message });
    }
});
exports.default = router;
//# sourceMappingURL=tracking.js.map