import express from 'express';
import { authenticateUser, requireAdmin } from '../middleware/auth';
import { getDriverBusInfo } from '../services/locationService';
import { RouteController } from '../controllers/routeController';
import { ConsolidatedAdminService as AdminService } from '../services/ConsolidatedAdminService';
import { logger } from '../utils/logger';

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

    // Support both naming conventions (code/number_plate and bus_number/vehicle_no)
    const busNumber = busData.bus_number || busData.code;
    const vehicleNo = busData.vehicle_no || busData.number_plate;
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
      assigned_driver_profile_id: busData.assigned_driver_profile_id || busData.assigned_driver_id,
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
    const busInfo = await getDriverBusInfo(driverId);

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

export default router;
