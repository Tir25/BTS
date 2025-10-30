import express from 'express';
import { authenticateUser, requireAdmin } from '../middleware/auth';
import { optimizedLocationService } from '../services/OptimizedLocationService';
import { RouteController } from '../controllers/routeController';
import { ConsolidatedAdminService as AdminService } from '../services/ConsolidatedAdminService';
import { logger } from '../utils/logger';
import { backendDriverVerificationService } from '../services/BackendDriverVerificationService';
import { supabaseAdmin } from '../config/supabase';

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(authenticateUser);
router.use(requireAdmin);

// ===== ANALYTICS ENDPOINTS =====

// Get system analytics
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await AdminService.getAnalytics();
    res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching analytics', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get system health
router.get('/health', async (req, res) => {
  try {
    const health = await AdminService.getSystemHealth();
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching system health', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system health',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===== BUS MANAGEMENT ENDPOINTS =====

// Get all buses with driver and route information
router.get('/buses', async (req, res) => {
  try {
    const buses = await AdminService.getAllBuses();
    res.json({
      success: true,
      data: buses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching buses', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch buses',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get specific bus
router.get('/buses/:busId', async (req, res) => {
  try {
    const { busId } = req.params;
    const bus = await AdminService.getBusById(busId);

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
  } catch (error) {
    logger.error('Error fetching bus', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bus',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Create new bus
router.post('/buses', async (req, res) => {
  try {
    const busData = req.body;

    // Support both naming conventions (code/bus_number and bus_number/vehicle_no)
    const busNumber = busData.bus_number || busData.code;
    const vehicleNo = busData.vehicle_no || busData.bus_number;
    const capacity = busData.capacity;

    // Enhanced validation
    if (!busNumber || !vehicleNo || !capacity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Bus number, vehicle number and capacity are required',
      });
    }

    // Normalize the data to backend format
    const normalizedBusData = {
      ...busData,
      bus_number: busNumber,
      vehicle_no: vehicleNo,
      capacity: parseInt(capacity) || capacity, // Convert to number if string
      model: busData.model || null,
      year: busData.year ? parseInt(busData.year) : null, // Convert to number if provided
      bus_image_url: busData.bus_image_url || null,
      // Map driver field from frontend format to backend format
      assigned_driver_profile_id: busData.assigned_driver_profile_id,
      route_id: busData.route_id || null,
      // Handle boolean conversion
      is_active: busData.is_active === 'on' || busData.is_active === true || busData.is_active === 'true'
    };

    // Validate capacity
    const capacityNum = parseInt(capacity) || capacity;
    if (typeof capacityNum !== 'number' || capacityNum <= 0 || capacityNum > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid capacity',
        message: 'Capacity must be a number between 1 and 1000',
      });
    }

    // Validate year if provided
    if (normalizedBusData.year && (typeof normalizedBusData.year !== 'number' || normalizedBusData.year < 1900 || normalizedBusData.year > new Date().getFullYear() + 10)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year',
        message: 'Year must be between 1900 and ' + (new Date().getFullYear() + 10),
      });
    }

    const newBus = await AdminService.createBus(normalizedBusData);

    return res.status(201).json({
      success: true,
      data: newBus,
      message: 'Bus created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error creating bus', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });

    // Provide more specific error messages
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('already exists') || error.message.includes('already assigned')) {
        statusCode = 409; // Conflict
        errorMessage = error.message;
      } else if (error.message.includes('not found') || error.message.includes('not active')) {
        statusCode = 400; // Bad Request
        errorMessage = error.message;
      } else if (error.message.includes('Missing required fields')) {
        statusCode = 400; // Bad Request
        errorMessage = error.message;
      } else if (error.message.includes('violates')) {
        statusCode = 400; // Bad Request
        errorMessage = 'Invalid data provided';
      } else {
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

// Update bus
router.put('/buses/:busId', async (req, res) => {
  try {
    const { busId } = req.params;
    const busData = req.body;

    const updatedBus = await AdminService.updateBus(busId, busData);

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
  } catch (error) {
    logger.error('Error updating bus', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to update bus',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete bus
router.delete('/buses/:busId', async (req, res) => {
  try {
    const { busId } = req.params;
    const deletedBus = await AdminService.deleteBus(busId);

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
  } catch (error) {
    logger.error('Error deleting bus', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to delete bus',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===== DRIVER MANAGEMENT ENDPOINTS =====

// Get all drivers
router.get('/drivers', async (req, res) => {
  try {
    const drivers = await AdminService.getAllDrivers();
    res.json({
      success: true,
      data: drivers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching drivers', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch drivers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get assigned drivers - moved to /assignments/assigned-drivers
// Use GET /assignments/assigned-drivers instead

// Get specific driver
router.get('/drivers/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await AdminService.getDriverById(driverId);

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
  } catch (error) {
    logger.error('Error fetching driver', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch driver',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Assignment functionality moved to /assignments routes

// Get driver bus information
router.get('/drivers/:driverId/bus', async (req, res) => {
  try {
    const { driverId } = req.params;
    const busInfo = await optimizedLocationService.getDriverBusInfo(driverId);

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
  } catch (error) {
    logger.error('Error getting driver bus info', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to get driver bus information',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Assignment functionality moved to /assignments routes
// Use DELETE /assignments/bus/:busId to remove assignments

// Clean up inactive drivers
router.post('/drivers/cleanup', async (req, res) => {
  try {
    const result = await AdminService.cleanupInactiveDrivers();
    
    return res.json({
      success: true,
      data: result,
      message: `Cleanup completed: ${result.cleaned} drivers cleaned, ${result.errors.length} errors`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error cleaning up inactive drivers', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to clean up inactive drivers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Create new driver
router.post('/drivers', async (req, res) => {
  try {
    const driverData = req.body;

    // Enhanced validation
    if (
      !driverData.email ||
      !driverData.first_name ||
      !driverData.last_name ||
      !driverData.password
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email, first name, last name, and password are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(driverData.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        message: 'Please provide a valid email address',
      });
    }

    // Validate password strength
    if (driverData.password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Weak password',
        message: 'Password must be at least 6 characters long',
      });
    }

    // Validate name fields
    if (driverData.first_name.trim().length === 0 || driverData.last_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid name',
        message: 'First name and last name cannot be empty',
      });
    }

    // Validate phone if provided
    if (driverData.phone && typeof driverData.phone !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone',
        message: 'Phone number must be a string',
      });
    }

    const newDriver = await AdminService.createDriver(driverData);

    return res.status(201).json({
      success: true,
      data: newDriver,
      message: newDriver.is_active ? 'Driver created successfully with Supabase Auth account' : 'Driver reactivated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error creating driver', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });

    // Enhanced error handling
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        statusCode = 409; // Conflict
        errorMessage = error.message;
      } else if (error.message.includes('converting user from student to driver')) {
        statusCode = 500; // Server Error
        errorMessage = 'Error while converting student to driver. Please try again or contact support.';
      } else if (error.message.includes('Invalid email format') || 
                 error.message.includes('Weak password') ||
                 error.message.includes('Invalid name') ||
                 error.message.includes('Invalid phone')) {
        statusCode = 400; // Bad Request
        errorMessage = error.message;
      } else if (error.message.includes('Missing required fields')) {
        statusCode = 400; // Bad Request
        errorMessage = error.message;
      } else if (error.message.includes('Supabase')) {
        statusCode = 400; // Bad Request
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
    }

    return res.status(statusCode).json({
      success: false,
      error: 'Failed to create driver',
      message: errorMessage,
    });
  }
});

// Update driver
router.put('/drivers/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const driverData = req.body;

    const updatedDriver = await AdminService.updateDriver(driverId, driverData);

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
  } catch (error) {
    logger.error('Error updating driver', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to update driver',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete driver
router.delete('/drivers/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const deletedDriver = await AdminService.deleteDriver(driverId);

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
  } catch (error) {
    logger.error('Error deleting driver', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to delete driver',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===== ROUTE MANAGEMENT ENDPOINTS =====

// Get all routes (admin view)
router.get('/routes', RouteController.getAllRoutes);

// Get specific route (admin view)
router.get('/routes/:routeId', RouteController.getRouteById);

// Create new route
router.post('/routes', RouteController.createRoute);

// Update route
router.put('/routes/:routeId', RouteController.updateRoute);

// Delete route
router.delete('/routes/:routeId', RouteController.deleteRoute);

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

// ===== SHIFTS MANAGEMENT =====
router.get('/shifts', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('shifts').select('id, name, start_time, end_time, description').order('name');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Error fetching shifts', 'admin', { error: error?.message });
    res.status(500).json({ success: false, error: 'Failed to fetch shifts', message: error?.message });
  }
});

router.post('/shifts', async (req, res) => {
  try {
    const { name, start_time, end_time, description, is_active } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name required' });
    const { data, error } = await supabaseAdmin
      .from('shifts')
      .insert({ name, start_time, end_time, description })
      .select('id, name, start_time, end_time, description')
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    logger.error('Error creating shift', 'admin', { error: error?.message });
    res.status(500).json({ success: false, error: 'Failed to create shift', message: error?.message });
  }
});

router.put('/shifts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, description, is_active } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (start_time !== undefined) update.start_time = start_time;
    if (end_time !== undefined) update.end_time = end_time;
    if (description !== undefined) update.description = description;
    const { data, error } = await supabaseAdmin
      .from('shifts')
      .update(update)
      .eq('id', id)
      .select('id, name, start_time, end_time, description')
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Error updating shift', 'admin', { error: error?.message });
    res.status(500).json({ success: false, error: 'Failed to update shift', message: error?.message });
  }
});

router.delete('/shifts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('shifts').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting shift', 'admin', { error: error?.message });
    res.status(500).json({ success: false, error: 'Failed to delete shift', message: error?.message });
  }
});

// ===== ROUTE STOPS MANAGEMENT =====
router.get('/route-stops', async (req, res) => {
  try {
    const routeId = String(req.query.routeId || '');
    if (!routeId) return res.status(400).json({ success: false, error: 'routeId required' });
    const { data, error } = await supabaseAdmin
      .from('route_stops')
      .select('id, route_id, sequence, is_active, bus_stops:stop_id(name)')
      .eq('route_id', routeId)
      .order('sequence');
    if (error) throw error;
    const mapped = (data || []).map((r: any) => ({ id: r.id, route_id: r.route_id, name: r.bus_stops?.name, sequence: r.sequence, is_active: r.is_active }));
    res.json({ success: true, data: mapped });
  } catch (error: any) {
    logger.error('Error fetching route stops', 'admin', { error: error?.message });
    res.status(500).json({ success: false, error: 'Failed to fetch route stops', message: error?.message });
  }
});

router.post('/route-stops', async (req, res) => {
  try {
    const { route_id, name } = req.body;
    if (!route_id || !name) return res.status(400).json({ success: false, error: 'route_id and name required' });
    // Create or find bus stop
    const { data: busStop } = await supabaseAdmin
      .from('bus_stops')
      .insert({ name, is_active: true })
      .select('id')
      .single();
    const stopId = busStop?.id;
    // Determine next sequence
    const { data: maxStop } = await supabaseAdmin
      .from('route_stops')
      .select('sequence')
      .eq('route_id', route_id)
      .order('sequence', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSeq = (maxStop?.sequence || 0) + 1;
    const { data, error } = await supabaseAdmin
      .from('route_stops')
      .insert({ route_id, stop_id: stopId, sequence: nextSeq, is_active: true })
      .select('id')
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    logger.error('Error creating route stop', 'admin', { error: error?.message });
    res.status(500).json({ success: false, error: 'Failed to create route stop', message: error?.message });
  }
});

router.put('/route-stops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sequence, is_active } = req.body;
    // Load route_stops to get stop_id
    const { data: rs } = await supabaseAdmin.from('route_stops').select('stop_id').eq('id', id).single();
    if (!rs) return res.status(404).json({ success: false, error: 'Route stop not found' });
    if (name !== undefined && rs.stop_id) {
      await supabaseAdmin.from('bus_stops').update({ name }).eq('id', rs.stop_id);
    }
    if (sequence !== undefined || is_active !== undefined) {
      const update: any = {};
      if (sequence !== undefined) update.sequence = sequence;
      if (is_active !== undefined) update.is_active = is_active;
      await supabaseAdmin.from('route_stops').update(update).eq('id', id);
    }
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error updating route stop', 'admin', { error: error?.message });
    res.status(500).json({ success: false, error: 'Failed to update route stop', message: error?.message });
  }
});

router.delete('/route-stops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('route_stops').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting route stop', 'admin', { error: error?.message });
    res.status(500).json({ success: false, error: 'Failed to delete route stop', message: error?.message });
  }
});

router.post('/route-stops/reorder', async (req, res) => {
  try {
    const { route_id, ordered_ids } = req.body as { route_id: string; ordered_ids: string[] };
    if (!route_id || !Array.isArray(ordered_ids)) return res.status(400).json({ success: false, error: 'route_id and ordered_ids required' });
    // Update sequences in order
    let seq = 1;
    for (const id of ordered_ids) {
      await supabaseAdmin.from('route_stops').update({ sequence: seq++ }).eq('id', id).eq('route_id', route_id);
    }
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error reordering route stops', 'admin', { error: error?.message });
    res.status(500).json({ success: false, error: 'Failed to reorder route stops', message: error?.message });
  }
});

// ===== SYSTEM MANAGEMENT ENDPOINTS =====

// Clear all data (Development only)
router.post('/clear-all-data', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'This endpoint is only available in development mode',
      });
    }

    const result = await AdminService.clearAllData();

    return res.json({
      success: true,
      data: result,
      message: 'All data cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error clearing all data', 'admin', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to clear all data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===== DRIVER VERIFICATION ENDPOINT =====

// Verify driver system functionality
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
