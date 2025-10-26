"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const AssignmentService_1 = require("../services/AssignmentService");
const router = express_1.default.Router();
router.use(auth_1.authenticateUser);
router.use(auth_1.requireAdmin);
router.get('/', async (req, res) => {
    try {
        const assignments = await AssignmentService_1.AssignmentService.getAllAssignments();
        res.json({
            success: true,
            data: assignments,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error fetching assignments:', error);
        console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
        });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assignments',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/status', async (req, res) => {
    try {
        const status = await AssignmentService_1.AssignmentService.getAssignmentStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error fetching assignment status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assignment status',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/bus/:busId', async (req, res) => {
    try {
        const { busId } = req.params;
        const assignment = await AssignmentService_1.AssignmentService.getAssignmentByBus(busId);
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
        console.error('❌ Error fetching assignment by bus:', error);
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
        const history = await AssignmentService_1.AssignmentService.getAssignmentHistory(busId);
        return res.json({
            success: true,
            data: history,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error fetching assignment history:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch assignment history',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/', async (req, res) => {
    try {
        const { driver_id, bus_id, route_id, notes } = req.body;
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
        const assignment = await AssignmentService_1.AssignmentService.createAssignment({
            driver_id,
            bus_id,
            route_id,
            assigned_by,
            notes,
        });
        return res.status(201).json({
            success: true,
            data: assignment,
            message: 'Assignment created successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error creating assignment:', error);
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
        const { driver_id, route_id, notes } = req.body;
        const assigned_by = req.user?.id;
        if (!assigned_by) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'User ID not found in request',
            });
        }
        const assignment = await AssignmentService_1.AssignmentService.updateAssignment(busId, {
            driver_id,
            route_id,
            assigned_by,
            notes,
        });
        return res.json({
            success: true,
            data: assignment,
            message: 'Assignment updated successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error updating assignment:', error);
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
        const success = await AssignmentService_1.AssignmentService.removeAssignment(busId, assigned_by, notes);
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
        console.error('❌ Error removing assignment:', error);
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
        const validation = await AssignmentService_1.AssignmentService.validateAssignment(driver_id, bus_id, route_id);
        return res.json({
            success: true,
            data: validation,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error validating assignment:', error);
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
        const result = await AssignmentService_1.AssignmentService.bulkAssignDrivers(assignmentsWithAssigner);
        const successCount = result.filter(r => r.success).length;
        const failedCount = result.filter(r => !r.success).length;
        return res.json({
            success: true,
            data: result,
            message: `Bulk assignment completed: ${successCount} successful, ${failedCount} failed`,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error in bulk assignment:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to process bulk assignments',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=assignments.js.map