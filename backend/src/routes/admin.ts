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

// Helper function to validate time format (HH:MM)
function validateTimeFormat(time: string): boolean {
  if (!time || typeof time !== 'string') return false;
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

// Helper function to convert time string to minutes for comparison
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper function to validate shift times (handles overnight shifts)
function validateShiftTimes(startTime: string, endTime: string): { valid: boolean; error?: string } {
  if (!startTime || !endTime) {
    return { valid: false, error: 'Start time and end time are required' };
  }

  if (!validateTimeFormat(startTime)) {
    return { valid: false, error: `Invalid start time format: ${startTime}. Use HH:MM format (e.g., 08:00)` };
  }

  if (!validateTimeFormat(endTime)) {
    return { valid: false, error: `Invalid end time format: ${endTime}. Use HH:MM format (e.g., 14:00)` };
  }

  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  // Allow same time (0 duration) or overnight shifts (end < start)
  // For overnight shifts, we assume end time is next day
  if (start === end) {
    return { valid: false, error: 'Start time and end time cannot be the same' };
  }

  // Valid if start < end (same day) or end < start (overnight shift)
  return { valid: true };
}

// Helper function to check if shift is used in assignments
async function isShiftInUse(shiftId: string): Promise<boolean> {
  try {
    // Check if shift is used in buses table
    const { data: buses, error: busesError } = await supabaseAdmin
      .from('buses')
      .select('id')
      .or(`assigned_shift_id.eq.${shiftId},shift_id.eq.${shiftId}`)
      .limit(1);

    if (busesError) {
      logger.warn('Error checking buses for shift usage', 'admin', { error: busesError.message });
    }

    if (buses && buses.length > 0) return true;

    // Check if shift is used in assignment_history
    const { data: history, error: historyError } = await supabaseAdmin
      .from('assignment_history')
      .select('id')
      .eq('shift_id', shiftId)
      .limit(1);

    if (historyError) {
      logger.warn('Error checking assignment history for shift usage', 'admin', { error: historyError.message });
    }

    if (history && history.length > 0) return true;

    // Check if shift is used in trip_sessions
    const { data: trips, error: tripsError } = await supabaseAdmin
      .from('trip_sessions')
      .select('id')
      .eq('shift_id', shiftId)
      .limit(1);

    if (tripsError) {
      logger.warn('Error checking trip sessions for shift usage', 'admin', { error: tripsError.message });
    }

    if (trips && trips.length > 0) return true;

    return false;
  } catch (error: any) {
    logger.error('Error checking if shift is in use', 'admin', { error: error?.message });
    // If we can't check, assume it's in use to be safe
    return true;
  }
}

router.get('/shifts', async (req, res) => {
  try {
    // Include is_active field in response
    const { data, error } = await supabaseAdmin
      .from('shifts')
      .select('id, name, start_time, end_time, description, is_active, created_at, updated_at')
      .order('name');
    
    if (error) throw error;
    
    // Format times to HH:MM format (remove seconds if present)
    const formattedData = (data || []).map((shift: any) => ({
      ...shift,
      start_time: shift.start_time ? shift.start_time.substring(0, 5) : null,
      end_time: shift.end_time ? shift.end_time.substring(0, 5) : null,
      is_active: shift.is_active ?? true, // Default to true if null
    }));
    
    res.json({ success: true, data: formattedData });
  } catch (error: any) {
    logger.error('Error fetching shifts', 'admin', { error: error?.message });
    res.status(500).json({ success: false, error: 'Failed to fetch shifts', message: error?.message });
  }
});

router.post('/shifts', async (req, res) => {
  try {
    const { name, start_time, end_time, description, is_active } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name required',
        message: 'Shift name is required and cannot be empty'
      });
    }

    // Validate time format and logical consistency
    if (start_time || end_time) {
      const timeValidation = validateShiftTimes(start_time || '00:00', end_time || '23:59');
      if (!timeValidation.valid) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid time format',
          message: timeValidation.error
        });
      }
    }

    // Check for duplicate shift name
    const { data: existing } = await supabaseAdmin
      .from('shifts')
      .select('id')
      .eq('name', name.trim())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: 'Duplicate shift name',
        message: `A shift with the name "${name}" already exists`
      });
    }

    // Prepare insert data
    const insertData: any = {
      name: name.trim(),
      is_active: is_active !== undefined ? Boolean(is_active) : true, // Default to true
    };

    if (start_time) insertData.start_time = start_time;
    if (end_time) insertData.end_time = end_time;
    if (description !== undefined) insertData.description = description?.trim() || null;

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .insert(insertData)
      .select('id, name, start_time, end_time, description, is_active')
      .single();

    if (error) throw error;

    // Format response
    const formattedData = {
      ...data,
      start_time: data.start_time ? data.start_time.substring(0, 5) : null,
      end_time: data.end_time ? data.end_time.substring(0, 5) : null,
    };

    logger.info('Shift created successfully', 'admin', { shiftId: data.id, name: data.name });
    res.status(201).json({ 
      success: true, 
      data: formattedData,
      message: 'Shift created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating shift', 'admin', { error: error?.message });
    
    // Handle specific database errors
    if (error?.code === '23505') { // Unique constraint violation
      return res.status(409).json({ 
        success: false, 
        error: 'Duplicate shift',
        message: 'A shift with this name already exists'
      });
    }

    res.status(500).json({ 
      success: false, 
      error: 'Failed to create shift', 
      message: error?.message || 'An unexpected error occurred'
    });
  }
});

router.put('/shifts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, description, is_active } = req.body;

    // Check if shift exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('shifts')
      .select('id, name, start_time, end_time')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ 
        success: false, 
        error: 'Shift not found',
        message: `Shift with ID ${id} not found`
      });
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid name',
          message: 'Shift name cannot be empty'
        });
      }

      // Check for duplicate name (excluding current shift)
      const { data: duplicate } = await supabaseAdmin
        .from('shifts')
        .select('id')
        .eq('name', name.trim())
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return res.status(409).json({ 
          success: false, 
          error: 'Duplicate shift name',
          message: `A shift with the name "${name}" already exists`
        });
      }
    }

    // Validate times if provided
    const finalStartTime = start_time !== undefined ? start_time : existing.start_time;
    const finalEndTime = end_time !== undefined ? end_time : existing.end_time;
    
    if (finalStartTime || finalEndTime) {
      const timeValidation = validateShiftTimes(
        finalStartTime || '00:00', 
        finalEndTime || '23:59'
      );
      if (!timeValidation.valid) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid time format',
          message: timeValidation.error
        });
      }
    }

    // Build update object
    const update: any = {};
    if (name !== undefined) update.name = name.trim();
    if (start_time !== undefined) update.start_time = start_time;
    if (end_time !== undefined) update.end_time = end_time;
    if (description !== undefined) update.description = description?.trim() || null;
    if (is_active !== undefined) update.is_active = Boolean(is_active);

    // Only update if there are changes
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No changes provided',
        message: 'At least one field must be provided for update'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .update(update)
      .eq('id', id)
      .select('id, name, start_time, end_time, description, is_active')
      .single();

    if (error) throw error;

    // Format response
    const formattedData = {
      ...data,
      start_time: data.start_time ? data.start_time.substring(0, 5) : null,
      end_time: data.end_time ? data.end_time.substring(0, 5) : null,
    };

    logger.info('Shift updated successfully', 'admin', { shiftId: id });
    res.json({ 
      success: true, 
      data: formattedData,
      message: 'Shift updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating shift', 'admin', { error: error?.message });
    
    // Handle specific database errors
    if (error?.code === '23505') { // Unique constraint violation
      return res.status(409).json({ 
        success: false, 
        error: 'Duplicate shift',
        message: 'A shift with this name already exists'
      });
    }

    res.status(500).json({ 
      success: false, 
      error: 'Failed to update shift', 
      message: error?.message || 'An unexpected error occurred'
    });
  }
});

router.delete('/shifts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if shift exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('shifts')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ 
        success: false, 
        error: 'Shift not found',
        message: `Shift with ID ${id} not found`
      });
    }

    // Check if shift is in use
    const inUse = await isShiftInUse(id);
    if (inUse) {
      return res.status(409).json({ 
        success: false, 
        error: 'Shift in use',
        message: `Cannot delete shift "${existing.name}" because it is currently assigned to buses or used in assignments. Please remove all assignments first.`
      });
    }

    // Delete the shift
    const { error } = await supabaseAdmin
      .from('shifts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info('Shift deleted successfully', 'admin', { shiftId: id, name: existing.name });
    res.json({ 
      success: true,
      message: `Shift "${existing.name}" deleted successfully`
    });
  } catch (error: any) {
    logger.error('Error deleting shift', 'admin', { error: error?.message });
    
    // Handle foreign key constraint violations
    if (error?.code === '23503') {
      return res.status(409).json({ 
        success: false, 
        error: 'Cannot delete shift',
        message: 'This shift is currently in use and cannot be deleted. Please remove all assignments first.'
      });
    }

    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete shift', 
      message: error?.message || 'An unexpected error occurred'
    });
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
  let busStopId: string | null = null;
  try {
    const { route_id, name } = req.body;
    if (!route_id || !name) return res.status(400).json({ success: false, error: 'route_id and name required' });
    
    // PRODUCTION FIX: Validate route exists
    const { data: routeExists, error: routeCheckError } = await supabaseAdmin
      .from('routes')
      .select('id')
      .eq('id', route_id)
      .single();
    if (routeCheckError || !routeExists) {
      return res.status(404).json({ success: false, error: 'Route not found' });
    }
    
    // PRODUCTION FIX: Validate name is not empty
    const trimmedName = String(name).trim();
    if (!trimmedName) {
      return res.status(400).json({ success: false, error: 'Stop name cannot be empty' });
    }
    
    // Create bus stop
    const { data: busStop, error: busStopError } = await supabaseAdmin
      .from('bus_stops')
      .insert({ name: trimmedName, is_active: true })
      .select('id')
      .single();
    
    if (busStopError || !busStop?.id) {
      logger.error('Error creating bus stop', 'admin', { error: busStopError?.message });
      return res.status(500).json({ success: false, error: 'Failed to create bus stop', message: busStopError?.message });
    }
    
    busStopId = busStop.id;
    
    // Determine next sequence
    const { data: maxStop } = await supabaseAdmin
      .from('route_stops')
      .select('sequence')
      .eq('route_id', route_id)
      .order('sequence', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSeq = (maxStop?.sequence || 0) + 1;
    
    // Create route stop
    const { data, error } = await supabaseAdmin
      .from('route_stops')
      .insert({ route_id, stop_id: busStopId, sequence: nextSeq, is_active: true })
      .select('id')
      .single();
    
    if (error) {
      // PRODUCTION FIX: Cleanup orphaned bus_stop if route_stop creation fails
      if (busStopId) {
        try {
          await supabaseAdmin.from('bus_stops').delete().eq('id', busStopId);
          logger.info('Cleaned up orphaned bus_stop after route_stop creation failure', 'admin', { busStopId });
        } catch (cleanupError) {
          logger.error('Error cleaning up orphaned bus_stop', 'admin', { error: cleanupError });
        }
      }
      throw error;
    }
    
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
    if (!route_id || !Array.isArray(ordered_ids)) {
      return res.status(400).json({ success: false, error: 'route_id and ordered_ids required' });
    }
    
    // PRODUCTION FIX: Validate that all IDs belong to the specified route
    if (ordered_ids.length > 0) {
      const { data: existingStops, error: checkError } = await supabaseAdmin
        .from('route_stops')
        .select('id, route_id')
        .in('id', ordered_ids);
      
      if (checkError) {
        logger.error('Error validating route stops', 'admin', { error: checkError.message });
        return res.status(500).json({ success: false, error: 'Failed to validate route stops', message: checkError.message });
      }
      
      // Check if all stops belong to the specified route
      const invalidStops = existingStops?.filter(stop => stop.route_id !== route_id) || [];
      if (invalidStops.length > 0) {
        logger.error('Invalid route stops in reorder request', 'admin', { 
          invalidStopIds: invalidStops.map(s => s.id),
          expectedRouteId: route_id
        });
        return res.status(400).json({ 
          success: false, 
          error: 'Some stops do not belong to the specified route',
          invalidStopIds: invalidStops.map(s => s.id)
        });
      }
      
      // Check if all requested IDs exist
      const existingIds = new Set(existingStops?.map(s => s.id) || []);
      const missingIds = ordered_ids.filter(id => !existingIds.has(id));
      if (missingIds.length > 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Some route stop IDs not found',
          missingIds 
        });
      }
    }
    
    // Update sequences in order
    let seq = 1;
    for (const id of ordered_ids) {
      const { error } = await supabaseAdmin
        .from('route_stops')
        .update({ sequence: seq++ })
        .eq('id', id)
        .eq('route_id', route_id);
      
      if (error) {
        logger.error('Error updating sequence for route stop', 'admin', { id, error: error.message });
        throw error;
      }
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
