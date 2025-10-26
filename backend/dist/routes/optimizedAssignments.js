"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const OptimizedAssignmentService_1 = require("../services/OptimizedAssignmentService");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
router.use(auth_1.authenticateUser);
router.use(auth_1.requireAdmin);
router.get('/', async (req, res) => {
    try {
        const assignments = await OptimizedAssignmentService_1.OptimizedAssignmentService.getAllAssignments();
        res.json({
            success: true,
            data: assignments,
            count: assignments.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching optimized assignments:', 'optimized-assignments', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assignments',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/dashboard', async (req, res) => {
    try {
        const dashboard = await OptimizedAssignmentService_1.OptimizedAssignmentService.getAssignmentDashboard();
        res.json({
            success: true,
            data: dashboard,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching optimized dashboard:', 'optimized-assignments', { error: String(error) });
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
        const assignment = await OptimizedAssignmentService_1.OptimizedAssignmentService.getAssignmentByBus(busId);
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
        logger_1.logger.error('Error fetching optimized assignment by bus:', 'optimized-assignments', { error: String(error) });
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch assignment',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/available/drivers', async (req, res) => {
    try {
        const drivers = await OptimizedAssignmentService_1.OptimizedAssignmentService.getAvailableDrivers();
        res.json({
            success: true,
            data: drivers,
            count: drivers.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching optimized available drivers:', 'optimized-assignments', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available drivers',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/available/buses', async (req, res) => {
    try {
        const buses = await OptimizedAssignmentService_1.OptimizedAssignmentService.getAvailableBuses();
        res.json({
            success: true,
            data: buses,
            count: buses.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching optimized available buses:', 'optimized-assignments', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available buses',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/available/routes', async (req, res) => {
    try {
        const routes = await OptimizedAssignmentService_1.OptimizedAssignmentService.getAvailableRoutes();
        res.json({
            success: true,
            data: routes,
            count: routes.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching optimized available routes:', 'optimized-assignments', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available routes',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/statistics', async (req, res) => {
    try {
        const statistics = await OptimizedAssignmentService_1.OptimizedAssignmentService.getAssignmentStatistics();
        res.json({
            success: true,
            data: statistics,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching assignment statistics:', 'optimized-assignments', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assignment statistics',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/cache/invalidate', async (req, res) => {
    try {
        await OptimizedAssignmentService_1.OptimizedAssignmentService.invalidateCache();
        res.json({
            success: true,
            message: 'Assignment cache invalidated successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error invalidating assignment cache:', 'optimized-assignments', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to invalidate cache',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/performance/comparison', async (req, res) => {
    try {
        const startTime = Date.now();
        const optimizedStart = Date.now();
        const optimizedAssignments = await OptimizedAssignmentService_1.OptimizedAssignmentService.getAllAssignments();
        const optimizedTime = Date.now() - optimizedStart;
        const dashboardStart = Date.now();
        const dashboard = await OptimizedAssignmentService_1.OptimizedAssignmentService.getAssignmentDashboard();
        const dashboardTime = Date.now() - dashboardStart;
        const totalTime = Date.now() - startTime;
        res.json({
            success: true,
            data: {
                optimized_assignments: {
                    count: optimizedAssignments.length,
                    queryTime: optimizedTime,
                    performance: 'Optimized single query with joins'
                },
                dashboard: {
                    queryTime: dashboardTime,
                    performance: 'Optimized single query with aggregations'
                },
                total_time: totalTime,
                performance_improvement: 'Eliminated N+1 queries, added caching, optimized database functions'
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error in performance comparison:', 'optimized-assignments', { error: String(error) });
        res.status(500).json({
            success: false,
            error: 'Failed to run performance comparison',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=optimizedAssignments.js.map