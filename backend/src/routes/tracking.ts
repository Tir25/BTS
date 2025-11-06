import express from 'express';
import { authenticateUser, requireAdminOrDriver } from '../middleware/auth';
import { TrackingService } from '../services/TrackingService';
import { logger } from '../utils/logger';
import { globalIO } from '../sockets/websocket';

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
    
    logger.info('Stop reached request received', 'tracking-routes', {
      driverId,
      routeStopId,
      hasBodyDriverId: !!req.body.driverId,
      hasBodyStopId: !!req.body.stopId,
      hasUserContext: !!req.user?.id
    });
    
    if (!driverId || !routeStopId) {
      logger.warn('Missing required parameters', 'tracking-routes', {
        driverId: !!driverId,
        routeStopId: !!routeStopId,
        body: req.body
      });
      return res.status(400).json({ success: false, error: 'driverId and stopId required' });
    }
    
    logger.info('Calling TrackingService.stopReached', 'tracking-routes', {
      driverId,
      routeStopId
    });
    
    const result = await TrackingService.stopReached(driverId, routeStopId);
    
    logger.info('Stop reached service completed', 'tracking-routes', {
      driverId,
      routeStopId,
      lastStopSequence: result.last_stop_sequence,
      routeId: result.route_id
    });
    
    // PRODUCTION FIX: Broadcast stop reached event via WebSocket to update student map in real-time
    if (globalIO && result.route_id) {
      try {
        // Get updated route status for broadcast
        const routeStatus = await TrackingService.getDriverAssignmentWithStops(driverId);
        if (routeStatus) {
          globalIO.emit('route:stopReached', {
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
          
          // Also broadcast to students room specifically
          globalIO.to('students').emit('route:stopReached', {
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
          
          logger.info('Route stop reached broadcast sent', 'tracking-routes', {
            routeId: result.route_id,
            stopId: routeStopId,
            driverId
          });
        }
      } catch (broadcastError) {
        // Log but don't fail the request if broadcast fails
        logger.error('Error broadcasting stop reached event', 'tracking-routes', { 
          error: broadcastError instanceof Error ? broadcastError.message : String(broadcastError) 
        });
      }
    }
    
    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error marking stop reached', 'tracking-routes', { 
      error: error?.message,
      stack: error?.stack,
      driverId: (req.body.driverId as string) || req.user?.id,
      routeStopId: req.body.stopId as string
    });
    
    // PRODUCTION FIX: Handle specific error cases with appropriate status codes
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

// PRODUCTION FIX: Support both path parameter and query parameter for driver assignment
// Path parameter: /tracking/assignment/:driverId (RESTful)
// Query parameter: /tracking/assignment?driverId=xxx (backward compatible)
router.get('/assignment/:driverId?', requireAdminOrDriver, async (req, res) => {
  try {
    // PRODUCTION FIX: Accept driverId from path parameter first, then query, then user context
    const driverId = (req.params.driverId as string) || (req.query.driverId as string) || req.user?.id;
    
    if (!driverId) {
      logger.warn('Driver assignment request missing driverId', 'tracking-routes', {
        hasPathParam: !!req.params.driverId,
        hasQueryParam: !!req.query.driverId,
        hasUserContext: !!req.user?.id,
        userId: req.user?.id
      });
      return res.status(400).json({ success: false, error: 'driverId required' });
    }
    
    logger.info('Fetching driver assignment with stops', 'tracking-routes', {
      driverId,
      source: req.params.driverId ? 'path' : req.query.driverId ? 'query' : 'user-context'
    });
    
    const data = await TrackingService.getDriverAssignmentWithStops(driverId);
    
    if (!data) {
      logger.warn('No assignment found for driver', 'tracking-routes', { driverId });
      return res.status(404).json({ success: false, error: 'No assignment found' });
    }
    
    logger.info('Driver assignment with stops retrieved successfully', 'tracking-routes', {
      driverId,
      routeId: data.route_id,
      hasStops: !!data.stops,
      stopsCount: data.stops ? (data.stops.completed?.length || 0) + (data.stops.remaining?.length || 0) : 0,
      trackingActive: data.tracking_active
    });
    
    return res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Error getting assignment with stops', 'tracking-routes', { 
      error: error?.message,
      stack: error?.stack,
      driverId: (req.params.driverId as string) || (req.query.driverId as string) || req.user?.id
    });
    return res.status(500).json({ success: false, error: 'Failed to get assignment', message: error?.message });
  }
});

export default router;


