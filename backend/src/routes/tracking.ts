import express from 'express';
import { authenticateUser, requireAdminOrDriver } from '../middleware/auth';
import { TrackingService } from '../services/TrackingService';
import { logger } from '../utils/logger';

const router = express.Router();

router.use(authenticateUser);

router.post('/start', requireAdminOrDriver, async (req, res) => {
  try {
    const driverId = (req.body.driverId as string) || req.user?.id;
    const shiftId = req.body.shiftId as string | undefined;
    if (!driverId) return res.status(400).json({ success: false, error: 'driverId required' });
    const session = await TrackingService.startTracking(driverId, shiftId);
    // TODO: broadcast via WebSocket: tracking_started
    return res.json({ success: true, data: session });
  } catch (error: any) {
    logger.error('Error starting tracking', 'tracking-routes', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Failed to start tracking', message: error?.message });
  }
});

router.post('/stop', requireAdminOrDriver, async (req, res) => {
  try {
    const driverId = (req.body.driverId as string) || req.user?.id;
    if (!driverId) return res.status(400).json({ success: false, error: 'driverId required' });
    const result = await TrackingService.stopTracking(driverId);
    // TODO: broadcast via WebSocket: tracking_stopped
    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error stopping tracking', 'tracking-routes', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Failed to stop tracking', message: error?.message });
  }
});

router.post('/stop-reached', requireAdminOrDriver, async (req, res) => {
  try {
    const driverId = (req.body.driverId as string) || req.user?.id;
    const routeStopId = req.body.stopId as string;
    if (!driverId || !routeStopId) return res.status(400).json({ success: false, error: 'driverId and stopId required' });
    const result = await TrackingService.stopReached(driverId, routeStopId);
    // TODO: broadcast via WebSocket: stop_reached
    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error marking stop reached', 'tracking-routes', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Failed to mark stop reached', message: error?.message });
  }
});

router.get('/assignment', requireAdminOrDriver, async (req, res) => {
  try {
    const driverId = (req.query.driverId as string) || req.user?.id;
    if (!driverId) return res.status(400).json({ success: false, error: 'driverId required' });
    const data = await TrackingService.getDriverAssignmentWithStops(driverId);
    if (!data) return res.status(404).json({ success: false, error: 'No assignment found' });
    return res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Error getting assignment with stops', 'tracking-routes', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Failed to get assignment', message: error?.message });
  }
});

export default router;


