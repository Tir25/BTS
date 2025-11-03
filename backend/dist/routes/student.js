"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const StudentRouteService_1 = require("../services/StudentRouteService");
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
router.get('/route-status', async (req, res) => {
    try {
        const routeId = req.query.routeId;
        let shiftId = req.query.shiftId || undefined;
        const shiftName = req.query.shiftName || undefined;
        if (!shiftId && shiftName) {
            const { data: shift } = await supabase_1.supabaseAdmin
                .from('shifts')
                .select('id')
                .ilike('name', shiftName)
                .maybeSingle();
            shiftId = shift?.id;
        }
        if (!routeId)
            return res.status(400).json({ success: false, error: 'routeId required' });
        const data = await StudentRouteService_1.StudentRouteService.getRouteStatus(routeId, { shiftId });
        if (!data.tracking_active) {
            return res.json({ success: true, data: { tracking_active: false, stops: { completed: [], next: null, remaining: [] } } });
        }
        return res.json({ success: true, data });
    }
    catch (error) {
        logger_1.logger.error('Error in student route-status', 'student-routes', { error: error?.message });
        return res.status(500).json({ success: false, error: 'Failed to fetch route status', message: error?.message });
    }
});
router.get('/route-stops', async (req, res) => {
    try {
        const routeId = req.query.routeId;
        if (!routeId)
            return res.status(400).json({ success: false, error: 'routeId required' });
        const stops = await StudentRouteService_1.StudentRouteService.getRouteStops(routeId);
        return res.json({ success: true, data: stops });
    }
    catch (error) {
        logger_1.logger.error('Error in student route-stops', 'student-routes', { error: error?.message });
        return res.status(500).json({ success: false, error: 'Failed to fetch route stops', message: error?.message });
    }
});
router.get('/active-routes', async (req, res) => {
    try {
        const shiftId = req.query.shiftId || undefined;
        const shiftName = req.query.shiftName || undefined;
        if (!shiftId && !shiftName) {
            return res.status(400).json({ success: false, error: 'shiftId or shiftName required' });
        }
        const routes = await StudentRouteService_1.StudentRouteService.getActiveRoutesByShift({ shiftId, shiftName });
        return res.json({ success: true, data: routes });
    }
    catch (error) {
        logger_1.logger.error('Error in student active-routes', 'student-routes', { error: error?.message });
        return res.status(500).json({ success: false, error: 'Failed to fetch active routes', message: error?.message });
    }
});
router.get('/routes-by-shift', async (req, res) => {
    try {
        const shiftId = req.query.shiftId || undefined;
        const shiftName = req.query.shiftName || undefined;
        if (!shiftId && !shiftName) {
            return res.status(400).json({ success: false, error: 'shiftId or shiftName required' });
        }
        const routes = await StudentRouteService_1.StudentRouteService.getRoutesByShift({ shiftId, shiftName });
        return res.json({ success: true, data: routes });
    }
    catch (error) {
        logger_1.logger.error('Error in student routes-by-shift', 'student-routes', { error: error?.message });
        return res.status(500).json({ success: false, error: 'Failed to fetch routes', message: error?.message });
    }
});
exports.default = router;
//# sourceMappingURL=student.js.map