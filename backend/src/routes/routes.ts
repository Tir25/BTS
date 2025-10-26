import express from 'express';
import { RouteController } from '../controllers/routeController';

const router = express.Router();

// Get all routes with GeoJSON data
router.get('/', RouteController.getAllRoutes);

// Get routes within viewport (spatial query) - MUST come before /:routeId
router.get('/viewport', RouteController.getRoutesInViewport);

// Get specific route with GeoJSON data
router.get('/:routeId', RouteController.getRouteById);

// Create new route (Admin only)
router.post('/', RouteController.createRoute);

// Assign bus to route (Admin only)
router.post('/:routeId/assign-bus', RouteController.assignBusToRoute);

// Calculate ETA for a bus on a route
router.post('/:routeId/calculate-eta', RouteController.calculateETA);

// Check if bus is near a stop
router.post('/:routeId/check-near-stop', RouteController.checkBusNearStop);

export default router;
