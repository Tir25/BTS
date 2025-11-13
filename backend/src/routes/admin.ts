/**
 * Admin Routes
 * Consolidated admin API routes using dedicated controllers
 * Each controller handles a specific domain (buses, drivers, routes, shifts, etc.)
 */

import express from 'express';
import { authenticateUser, requireAdmin } from '../middleware/auth';
import { RouteController } from '../controllers/routeController';
import { BusController } from '../controllers/busController';
import { DriverController } from '../controllers/driverController';
import { ShiftController } from '../controllers/shiftController';
import { RouteStopController } from '../controllers/routeStopController';
import { AnalyticsController } from '../controllers/analyticsController';
import { logger } from '../utils/logger';
import { backendDriverVerificationService } from '../services/BackendDriverVerificationService';
import { supabaseAdmin } from '../config/supabase';

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(authenticateUser);
router.use(requireAdmin);

// ===== ANALYTICS ENDPOINTS =====
router.get('/analytics', AnalyticsController.getAnalytics);
router.get('/health', AnalyticsController.getSystemHealth);

// ===== BUS MANAGEMENT ENDPOINTS =====
router.get('/buses', BusController.getAllBuses);
router.get('/buses/:busId', BusController.getBusById);
router.post('/buses', BusController.createBus);
router.put('/buses/:busId', BusController.updateBus);
router.delete('/buses/:busId', BusController.deleteBus);

// ===== DRIVER MANAGEMENT ENDPOINTS =====
router.get('/drivers', DriverController.getAllDrivers);
router.get('/drivers/:driverId', DriverController.getDriverById);
router.get('/drivers/:driverId/bus', DriverController.getDriverBusInfo);
router.post('/drivers', DriverController.createDriver);
router.put('/drivers/:driverId', DriverController.updateDriver);
router.delete('/drivers/:driverId', DriverController.deleteDriver);
router.post('/drivers/cleanup', DriverController.cleanupInactiveDrivers);

// ===== ROUTE MANAGEMENT ENDPOINTS =====
router.get('/routes', RouteController.getAllRoutes);
router.get('/routes/:routeId', RouteController.getRouteById);
router.post('/routes', RouteController.createRoute);
router.put('/routes/:routeId', RouteController.updateRoute);
router.delete('/routes/:routeId', RouteController.deleteRoute);

// ===== SHIFTS MANAGEMENT =====
router.get('/shifts', ShiftController.getAllShifts);
router.post('/shifts', ShiftController.createShift);
router.put('/shifts/:id', ShiftController.updateShift);
router.delete('/shifts/:id', ShiftController.deleteShift);

// ===== ROUTE STOPS MANAGEMENT =====
router.get('/route-stops', RouteStopController.getRouteStops);
router.post('/route-stops', RouteStopController.createRouteStop);
router.put('/route-stops/:id', RouteStopController.updateRouteStop);
router.delete('/route-stops/:id', RouteStopController.deleteRouteStop);
router.post('/route-stops/reorder', RouteStopController.reorderRouteStops);

// ===== ADMIN DIAGNOSTICS =====
router.get('/diagnostics', async (req, res) => {
  try {
    const [{ data: shifts, error: e1 }, { data: rs, error: e2 }] = await Promise.all([
      supabaseAdmin.from('shifts').select('id').limit(1),
      supabaseAdmin.from('route_stops').select('id').limit(1)
    ]);
    if (e1 || e2) throw (e1 || e2);
    res.json({ success: true, data: { shifts_count: (shifts || []).length, route_stops_count: (rs || []).length } });
  } catch (error: any) {
    logger.error('Diagnostics error', 'admin', { error: error?.message });
    res.status(500).json({ success: false, error: 'Diagnostics failed', message: error?.message });
  }
});

// ===== SYSTEM MANAGEMENT ENDPOINTS =====
router.post('/clear-all-data', AnalyticsController.clearAllData);

// ===== DRIVER VERIFICATION ENDPOINT =====
router.get('/verify-driver-system', async (req, res) => {
  try {
    logger.info('🔍 Admin requested driver system verification', 'admin');
    
    const verificationResult = await backendDriverVerificationService.verifyBackendDriverSystem();
    
    res.json({
      success: true,
      data: verificationResult,
      summary: backendDriverVerificationService.getVerificationSummary(verificationResult),
      isReady: backendDriverVerificationService.isBackendReady(verificationResult),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error verifying driver system', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to verify driver system',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
