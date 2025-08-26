import express from 'express';
import { authenticateUser, requireAdmin, requireAdminOrStudent } from '../middleware/auth';
import { RouteService } from '../services/routeService';
import { validateRouteData, validateUUIDWithError } from '../utils/validation';
import { sendNotFoundError, sendValidationError, sendSuccessResponse, sendInternalServerError } from '../utils/responseHelpers';

const router = express.Router();

// Get all routes with GeoJSON data (accessible to students and admins)
router.get('/', authenticateUser, requireAdminOrStudent, async (_req, res) => {
  try {
    const routes = await RouteService.getAllRoutes();
    res.json({
      success: true,
      data: routes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routes',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get specific route with GeoJSON data (accessible to students and admins)
router.get('/:routeId', authenticateUser, requireAdminOrStudent, async (req, res) => {
  try {
    const { routeId } = req.params;
    
    // Validate route ID
    const validationError = validateUUIDWithError(routeId, 'Route ID');
    if (validationError) {
      return sendValidationError(res, 'routeId', validationError);
    }
    
    const route = await RouteService.getRouteById(routeId);

    if (!route) {
      return sendNotFoundError(res, 'Route', routeId);
    }

    return sendSuccessResponse(res, route);
  } catch (error) {
    console.error('❌ Error fetching route:', error);
    return sendInternalServerError(res, error instanceof Error ? error : undefined);
  }
});

// Create new route (Admin only)
router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const routeData = req.body;

    // Validate route data
    const validationError = validateRouteData(routeData);
    if (validationError) {
      return sendValidationError(res, 'routeData', validationError);
    }

    const newRoute = await RouteService.createRoute(routeData);

    if (!newRoute) {
      return sendInternalServerError(res, new Error('Database error occurred'));
    }

    return sendSuccessResponse(res, newRoute, 'Route created successfully', 201);
  } catch (error) {
    console.error('❌ Error creating route:', error);
    return sendInternalServerError(res, error instanceof Error ? error : undefined);
  }
});

// Assign bus to route (Admin only)
router.post('/:routeId/assign-bus', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { routeId } = req.params;
    const { busId } = req.body;

    if (!busId) {
      return res.status(400).json({
        success: false,
        error: 'Missing bus ID',
        message: 'Bus ID is required',
      });
    }

    const success = await RouteService.assignBusToRoute(busId, routeId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Assignment failed',
        message: 'Bus or route not found',
      });
    }

    return res.json({
      success: true,
      message: 'Bus assigned to route successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error assigning bus to route:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to assign bus to route',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Calculate ETA for a bus on a route (accessible to students and admins)
router.post('/:routeId/calculate-eta', authenticateUser, requireAdminOrStudent, async (req, res) => {
  try {
    const { routeId } = req.params;
    const { bus_id, latitude, longitude, timestamp } = req.body;

    if (!bus_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'Bus ID, latitude, and longitude are required',
      });
    }

    const busLocation = {
      bus_id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: timestamp || new Date().toISOString(),
    };

    const etaInfo = await RouteService.calculateETA(busLocation, routeId);

    if (!etaInfo) {
      return res.status(404).json({
        success: false,
        error: 'ETA calculation failed',
        message: 'Route not found or invalid data',
      });
    }

    return res.json({
      success: true,
      data: etaInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error calculating ETA:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate ETA',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Check if bus is near a stop (accessible to students and admins)
router.post('/:routeId/check-near-stop', authenticateUser, requireAdminOrStudent, async (req, res) => {
  try {
    const { routeId } = req.params;
    const { bus_id, latitude, longitude, timestamp } = req.body;

    if (!bus_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'Bus ID, latitude, and longitude are required',
      });
    }

    const busLocation = {
      bus_id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: timestamp || new Date().toISOString(),
    };

    const nearStopInfo = await RouteService.checkBusNearStop(
      busLocation,
      routeId
    );

    return res.json({
      success: true,
      data: nearStopInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error checking bus near stop:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check bus near stop',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
