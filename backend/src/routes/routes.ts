import express from 'express';
import { RouteService } from '../services/routeService';
import { validateRouteData } from '../utils/validation';

const router = express.Router();

// Get all routes with GeoJSON data
router.get('/', async (_req, res) => {
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

// Get specific route with GeoJSON data
router.get('/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const route = await RouteService.getRouteById(routeId);

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
  } catch (error) {
    console.error('❌ Error fetching route:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch route',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Create new route (Admin only)
router.post('/', async (req, res) => {
  try {
    const routeData = req.body;

    // Validate route data
    const validationError = validateRouteData(routeData);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid route data',
        message: validationError,
      });
    }

    const newRoute = await RouteService.createRoute(routeData);

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
  } catch (error) {
    console.error('❌ Error creating route:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create route',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Assign bus to route (Admin only)
router.post('/:routeId/assign-bus', async (req, res) => {
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

// Calculate ETA for a bus on a route
router.post('/:routeId/calculate-eta', async (req, res) => {
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

// Check if bus is near a stop
router.post('/:routeId/check-near-stop', async (req, res) => {
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
