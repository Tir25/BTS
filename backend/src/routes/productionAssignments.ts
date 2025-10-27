/**
 * Production Assignment Routes
 * Single consolidated API for all assignment operations
 * Industry-grade implementation with comprehensive error handling
 */

import express from 'express';
import { authenticateUser, requireAdmin, requireAdminOrDriver } from '../middleware/auth';
import { ProductionAssignmentService } from '../services/ProductionAssignmentService';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all assignment routes
router.use(authenticateUser);

// ===== PRODUCTION ASSIGNMENT MANAGEMENT ENDPOINTS =====

// Get all assignments with comprehensive data (Admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const assignments = await ProductionAssignmentService.getAllAssignments();
    res.json({
      success: true,
      data: assignments,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching assignments', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignments',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get driver's own assignment (Driver only)
router.get('/my-assignment', requireAdminOrDriver, async (req, res) => {
  try {
    const driverId = req.user?.id;
    if (!driverId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User ID not found in request',
      });
    }

    // Check if user is requesting their own assignment or if admin
    if (req.user?.role !== 'admin' && req.user?.role !== 'driver') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only drivers and admins can access assignment data',
      });
    }

    const assignment = await ProductionAssignmentService.getDriverAssignment(driverId);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'No assignment found',
        message: 'No active assignment found for this driver',
      });
    }

    res.json({
      success: true,
      data: assignment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching driver assignment', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get assignment dashboard (Admin only)
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const dashboard = await ProductionAssignmentService.getAssignmentDashboard();
    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching assignment dashboard', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignment dashboard',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get assignment by bus ID (Admin only)
router.get('/bus/:busId', requireAdmin, async (req, res) => {
  try {
    const { busId } = req.params;
    const assignment = await ProductionAssignmentService.getAssignmentByBus(busId);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
        message: `No assignment found for bus ${busId}`,
      });
    }

    return res.json({
      success: true,
      data: assignment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching assignment by bus', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch assignment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get assignment history for a bus (Admin only)
router.get('/bus/:busId/history', requireAdmin, async (req, res) => {
  try {
    const { busId } = req.params;
    const history = await ProductionAssignmentService.getAssignmentHistory(busId);

    return res.json({
      success: true,
      data: history,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching assignment history', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch assignment history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Create new assignment (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { driver_id, bus_id, route_id, notes, status } = req.body;

    // Validate required fields
    if (!driver_id || !bus_id || !route_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Driver ID, Bus ID, and Route ID are required',
      });
    }

    // Get the current user as the assigner
    const assigned_by = req.user?.id;
    if (!assigned_by) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User ID not found in request',
      });
    }

    const assignment = await ProductionAssignmentService.createAssignment({
      driver_id,
      bus_id,
      route_id,
      assigned_by,
      notes,
      status: status || 'active',
    });

    return res.status(201).json({
      success: true,
      data: assignment,
      message: 'Assignment created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error creating assignment', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });

    // Handle specific validation errors
    if (error instanceof Error && error.message.includes('validation failed')) {
      return res.status(400).json({
        success: false,
        error: 'Assignment validation failed',
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create assignment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update assignment (Admin only)
router.put('/bus/:busId', requireAdmin, async (req, res) => {
  try {
    const { busId } = req.params;
    const { driver_id, route_id, notes, status } = req.body;

    // Get the current user as the assigner
    const assigned_by = req.user?.id;
    if (!assigned_by) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User ID not found in request',
      });
    }

    const assignment = await ProductionAssignmentService.updateAssignment(busId, {
      driver_id,
      route_id,
      assigned_by,
      notes,
      status,
    });

    return res.json({
      success: true,
      data: assignment,
      message: 'Assignment updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error updating assignment', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });

    if (error instanceof Error && error.message.includes('validation failed')) {
      return res.status(400).json({
        success: false,
        error: 'Assignment validation failed',
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update assignment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Remove assignment (Admin only)
router.delete('/bus/:busId', requireAdmin, async (req, res) => {
  try {
    const { busId } = req.params;
    const { notes } = req.body;

    // Get the current user as the assigner
    const assigned_by = req.user?.id;
    if (!assigned_by) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User ID not found in request',
      });
    }

    const success = await ProductionAssignmentService.removeAssignment(busId, assigned_by, notes);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to remove assignment',
        message: 'Assignment removal failed',
      });
    }

    return res.json({
      success: true,
      message: 'Assignment removed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error removing assignment', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to remove assignment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Validate assignment before creating (Admin only)
router.post('/validate', requireAdmin, async (req, res) => {
  try {
    const { driver_id, bus_id, route_id } = req.body;

    if (!driver_id || !bus_id || !route_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Driver ID, Bus ID, and Route ID are required',
      });
    }

    const validation = await ProductionAssignmentService.validateAssignment(driver_id, bus_id, route_id);

    return res.json({
      success: true,
      data: validation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error validating assignment', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to validate assignment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Bulk assignment operations (Admin only)
router.post('/bulk', requireAdmin, async (req, res) => {
  try {
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assignments data',
        message: 'Assignments must be a non-empty array',
      });
    }

    // Get the current user as the assigner for all assignments
    const assigned_by = req.user?.id;
    if (!assigned_by) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User ID not found in request',
      });
    }

    // Add assigned_by to all assignments
    const assignmentsWithAssigner = assignments.map(assignment => ({
      ...assignment,
      assigned_by
    }));

    const result = await ProductionAssignmentService.bulkAssignDrivers(assignmentsWithAssigner);
    
    return res.json({
      success: result.success,
      data: result,
      message: `Bulk assignment completed: ${result.successful} successful, ${result.failed} failed`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in bulk assignment', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Failed to process bulk assignments',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get available drivers for assignment (Admin only)
router.get('/available/drivers', requireAdmin, async (req, res) => {
  try {
    const drivers = await ProductionAssignmentService.getAvailableDrivers();
    res.json({
      success: true,
      data: drivers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching available drivers', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available drivers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get available buses for assignment (Admin only)
router.get('/available/buses', requireAdmin, async (req, res) => {
  try {
    const buses = await ProductionAssignmentService.getAvailableBuses();
    res.json({
      success: true,
      data: buses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching available buses', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available buses',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get available routes for assignment (Admin only)
router.get('/available/routes', requireAdmin, async (req, res) => {
  try {
    const routes = await ProductionAssignmentService.getAvailableRoutes();
    res.json({
      success: true,
      data: routes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching available routes', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available routes',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get assigned drivers (Admin only)
router.get('/assigned-drivers', requireAdmin, async (req, res) => {
  try {
    const assignedDrivers = await ProductionAssignmentService.getAssignedDrivers();
    res.json({
      success: true,
      data: assignedDrivers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching assigned drivers', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assigned drivers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
