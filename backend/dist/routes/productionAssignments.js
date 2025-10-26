"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const ProductionAssignmentService_1 = require("../services/ProductionAssignmentService");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
router.use(auth_1.authenticateUser);
router.use(auth_1.requireAdmin);
router.get('/', async (req, res) => {
    try {
        const assignments = await ProductionAssignmentService_1.ProductionAssignmentService.getAllAssignments();
        res.json({
            success: true,
            data: assignments,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching assignments', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assignments',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/dashboard', async (req, res) => {
    try {
        const dashboard = await ProductionAssignmentService_1.ProductionAssignmentService.getAssignmentDashboard();
        res.json({
            success: true,
            data: dashboard,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching assignment dashboard', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assignment dashboard',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/bus/:busId', async (req, res) => {
    try {
        const { busId } = req.params;
        const assignment = await ProductionAssignmentService_1.ProductionAssignmentService.getAssignmentByBus(busId);
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
    }
    catch (error) {
        logger_1.logger.error('Error fetching assignment by bus', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch assignment',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/bus/:busId/history', async (req, res) => {
    try {
        const { busId } = req.params;
        const history = await ProductionAssignmentService_1.ProductionAssignmentService.getAssignmentHistory(busId);
        return res.json({
            success: true,
            data: history,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching assignment history', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch assignment history',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/', async (req, res) => {
    try {
        const { driver_id, bus_id, route_id, notes, status } = req.body;
        if (!driver_id || !bus_id || !route_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Driver ID, Bus ID, and Route ID are required',
            });
        }
        const assigned_by = req.user?.id;
        if (!assigned_by) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'User ID not found in request',
            });
        }
        const assignment = await ProductionAssignmentService_1.ProductionAssignmentService.createAssignment({
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
    }
    catch (error) {
        logger_1.logger.error('Error creating assignment', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
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
router.put('/bus/:busId', async (req, res) => {
    try {
        const { busId } = req.params;
        const { driver_id, route_id, notes, status } = req.body;
        const assigned_by = req.user?.id;
        if (!assigned_by) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'User ID not found in request',
            });
        }
        const assignment = await ProductionAssignmentService_1.ProductionAssignmentService.updateAssignment(busId, {
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
    }
    catch (error) {
        logger_1.logger.error('Error updating assignment', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
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
router.delete('/bus/:busId', async (req, res) => {
    try {
        const { busId } = req.params;
        const { notes } = req.body;
        const assigned_by = req.user?.id;
        if (!assigned_by) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'User ID not found in request',
            });
        }
        const success = await ProductionAssignmentService_1.ProductionAssignmentService.removeAssignment(busId, assigned_by, notes);
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
    }
    catch (error) {
        logger_1.logger.error('Error removing assignment', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to remove assignment',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/validate', async (req, res) => {
    try {
        const { driver_id, bus_id, route_id } = req.body;
        if (!driver_id || !bus_id || !route_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Driver ID, Bus ID, and Route ID are required',
            });
        }
        const validation = await ProductionAssignmentService_1.ProductionAssignmentService.validateAssignment(driver_id, bus_id, route_id);
        return res.json({
            success: true,
            data: validation,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error validating assignment', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to validate assignment',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/bulk', async (req, res) => {
    try {
        const { assignments } = req.body;
        if (!Array.isArray(assignments) || assignments.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid assignments data',
                message: 'Assignments must be a non-empty array',
            });
        }
        const assigned_by = req.user?.id;
        if (!assigned_by) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'User ID not found in request',
            });
        }
        const assignmentsWithAssigner = assignments.map(assignment => ({
            ...assignment,
            assigned_by
        }));
        const result = await ProductionAssignmentService_1.ProductionAssignmentService.bulkAssignDrivers(assignmentsWithAssigner);
        return res.json({
            success: result.success,
            data: result,
            message: `Bulk assignment completed: ${result.successful} successful, ${result.failed} failed`,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error in bulk assignment', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Failed to process bulk assignments',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/available/drivers', async (req, res) => {
    try {
        const drivers = await ProductionAssignmentService_1.ProductionAssignmentService.getAvailableDrivers();
        res.json({
            success: true,
            data: drivers,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching available drivers', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available drivers',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/available/buses', async (req, res) => {
    try {
        const buses = await ProductionAssignmentService_1.ProductionAssignmentService.getAvailableBuses();
        res.json({
            success: true,
            data: buses,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching available buses', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available buses',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/available/routes', async (req, res) => {
    try {
        const routes = await ProductionAssignmentService_1.ProductionAssignmentService.getAvailableRoutes();
        res.json({
            success: true,
            data: routes,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching available routes', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available routes',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/assigned-drivers', async (req, res) => {
    try {
        const assignedDrivers = await ProductionAssignmentService_1.ProductionAssignmentService.getAssignedDrivers();
        res.json({
            success: true,
            data: assignedDrivers,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching assigned drivers', 'production-assignments', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assigned drivers',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=productionAssignments.js.map