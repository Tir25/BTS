"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const TrackingService_1 = require("../services/TrackingService");
const logger_1 = require("../utils/logger");
const websocket_1 = require("../sockets/websocket");
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
        logger_1.logger.info('Stop reached request received', 'tracking-routes', {
            driverId,
            routeStopId,
            hasBodyDriverId: !!req.body.driverId,
            hasBodyStopId: !!req.body.stopId,
            hasUserContext: !!req.user?.id
        });
        if (!driverId || !routeStopId) {
            logger_1.logger.warn('Missing required parameters', 'tracking-routes', {
                driverId: !!driverId,
                routeStopId: !!routeStopId,
                body: req.body
            });
            return res.status(400).json({ success: false, error: 'driverId and stopId required' });
        }
        logger_1.logger.info('Calling TrackingService.stopReached', 'tracking-routes', {
            driverId,
            routeStopId
        });
        const result = await TrackingService_1.TrackingService.stopReached(driverId, routeStopId);
        logger_1.logger.info('Stop reached service completed', 'tracking-routes', {
            driverId,
            routeStopId,
            lastStopSequence: result.last_stop_sequence,
            routeId: result.route_id
        });
        if (websocket_1.globalIO && result.route_id) {
            try {
                const routeStatus = await TrackingService_1.TrackingService.getDriverAssignmentWithStops(driverId);
                if (routeStatus) {
                    websocket_1.globalIO.emit('route:stopReached', {
                        routeId: result.route_id,
                        stopId: routeStopId,
                        driverId: driverId,
                        lastStopSequence: result.last_stop_sequence,
                        routeStatus: {
                            tracking_active: routeStatus.tracking_active,
                            stops: routeStatus.stops
                        },
                        timestamp: new Date().toISOString()
                    });
                    websocket_1.globalIO.to('students').emit('route:stopReached', {
                        routeId: result.route_id,
                        stopId: routeStopId,
                        driverId: driverId,
                        lastStopSequence: result.last_stop_sequence,
                        routeStatus: {
                            tracking_active: routeStatus.tracking_active,
                            stops: routeStatus.stops
                        },
                        timestamp: new Date().toISOString()
                    });
                    logger_1.logger.info('Route stop reached broadcast sent', 'tracking-routes', {
                        routeId: result.route_id,
                        stopId: routeStopId,
                        driverId
                    });
                }
            }
            catch (broadcastError) {
                logger_1.logger.error('Error broadcasting stop reached event', 'tracking-routes', {
                    error: broadcastError instanceof Error ? broadcastError.message : String(broadcastError)
                });
            }
        }
        return res.json({ success: true, data: result });
    }
    catch (error) {
        logger_1.logger.error('Error marking stop reached', 'tracking-routes', {
            error: error?.message,
            stack: error?.stack,
            driverId: req.body.driverId || req.user?.id,
            routeStopId: req.body.stopId
        });
        if (error?.message?.includes('No active session')) {
            return res.status(400).json({
                success: false,
                error: 'No active tracking session. Please start tracking first.',
                message: error?.message
            });
        }
        if (error?.message?.includes('Stop is not on session route')) {
            return res.status(400).json({
                success: false,
                error: 'Stop does not belong to the current route.',
                message: error?.message
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Failed to mark stop reached',
            message: error?.message || 'Unknown error'
        });
    }
});
router.get('/assignment/:driverId?', auth_1.requireAdminOrDriver, async (req, res) => {
    try {
        const driverId = req.params.driverId || req.query.driverId || req.user?.id;
        if (!driverId) {
            logger_1.logger.warn('Driver assignment request missing driverId', 'tracking-routes', {
                hasPathParam: !!req.params.driverId,
                hasQueryParam: !!req.query.driverId,
                hasUserContext: !!req.user?.id,
                userId: req.user?.id
            });
            return res.status(400).json({ success: false, error: 'driverId required' });
        }
        logger_1.logger.info('Fetching driver assignment with stops', 'tracking-routes', {
            driverId,
            source: req.params.driverId ? 'path' : req.query.driverId ? 'query' : 'user-context'
        });
        const data = await TrackingService_1.TrackingService.getDriverAssignmentWithStops(driverId);
        if (!data) {
            logger_1.logger.warn('No assignment found for driver', 'tracking-routes', { driverId });
            return res.status(404).json({ success: false, error: 'No assignment found' });
        }
        logger_1.logger.info('Driver assignment with stops retrieved successfully', 'tracking-routes', {
            driverId,
            routeId: data.route_id,
            hasStops: !!data.stops,
            stopsCount: data.stops ? (data.stops.completed?.length || 0) + (data.stops.remaining?.length || 0) : 0,
            trackingActive: data.tracking_active
        });
        return res.json({ success: true, data });
    }
    catch (error) {
        logger_1.logger.error('Error getting assignment with stops', 'tracking-routes', {
            error: error?.message,
            stack: error?.stack,
            driverId: req.params.driverId || req.query.driverId || req.user?.id
        });
        return res.status(500).json({ success: false, error: 'Failed to get assignment', message: error?.message });
    }
});
exports.default = router;
//# sourceMappingURL=tracking.js.map