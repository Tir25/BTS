import express from 'express';
import { StudentRouteService } from '../services/StudentRouteService';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

const router = express.Router();

// Public endpoint: students view route status (gated by active tracking session)
router.get('/route-status', async (req, res) => {
  try {
    const routeId = req.query.routeId as string;
    let shiftId = (req.query.shiftId as string) || undefined;
    const shiftName = (req.query.shiftName as string) || undefined;
    if (!shiftId && shiftName) {
      const { data: shift } = await supabaseAdmin
        .from('shifts')
        .select('id')
        .ilike('name', shiftName)
        .maybeSingle();
      shiftId = shift?.id;
    }
    if (!routeId) return res.status(400).json({ success: false, error: 'routeId required' });

    const data = await StudentRouteService.getRouteStatus(routeId, { shiftId });
    if (!data.tracking_active) {
      return res.json({ success: true, data: { tracking_active: false, stops: { completed: [], next: null, remaining: [] } } });
    }
    return res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Error in student route-status', 'student-routes', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch route status', message: error?.message });
  }
});

// Public endpoint: list static route stops for a given route (independent of tracking)
router.get('/route-stops', async (req, res) => {
  try {
    const routeId = req.query.routeId as string;
    if (!routeId) return res.status(400).json({ success: false, error: 'routeId required' });

    const stops = await StudentRouteService.getRouteStops(routeId);
    return res.json({ success: true, data: stops });
  } catch (error: any) {
    logger.error('Error in student route-stops', 'student-routes', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch route stops', message: error?.message });
  }
});

// Public endpoint: list routes that have an active trip for a given shift
router.get('/active-routes', async (req, res) => {
  try {
    const shiftId = (req.query.shiftId as string) || undefined;
    const shiftName = (req.query.shiftName as string) || undefined;
    if (!shiftId && !shiftName) {
      return res.status(400).json({ success: false, error: 'shiftId or shiftName required' });
    }
    const routes = await StudentRouteService.getActiveRoutesByShift({ shiftId, shiftName });
    return res.json({ success: true, data: routes });
  } catch (error: any) {
    logger.error('Error in student active-routes', 'student-routes', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch active routes', message: error?.message });
  }
});

// Public endpoint: list routes available for a given shift (independent of tracking)
router.get('/routes-by-shift', async (req, res) => {
  try {
    const shiftId = (req.query.shiftId as string) || undefined;
    const shiftName = (req.query.shiftName as string) || undefined;
    if (!shiftId && !shiftName) {
      return res.status(400).json({ success: false, error: 'shiftId or shiftName required' });
    }
    const routes = await StudentRouteService.getRoutesByShift({ shiftId, shiftName });
    return res.json({ success: true, data: routes });
  } catch (error: any) {
    logger.error('Error in student routes-by-shift', 'student-routes', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch routes', message: error?.message });
  }
});

// Public endpoint: get all shifts (for student map filter)
router.get('/shifts', async (req, res) => {
  try {
    // Fetch all active shifts, ordered by name
    const { data, error } = await supabaseAdmin
      .from('shifts')
      .select('id, name, start_time, end_time, is_active')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    
    // Format times to HH:MM format (remove seconds if present)
    const formattedData = (data || []).map((shift: any) => ({
      id: shift.id,
      name: shift.name,
      start_time: shift.start_time ? shift.start_time.substring(0, 5) : null,
      end_time: shift.end_time ? shift.end_time.substring(0, 5) : null,
      is_active: shift.is_active ?? true,
    }));
    
    logger.info('Shifts fetched for student', 'student-routes', { count: formattedData.length });
    return res.json({ success: true, data: formattedData });
  } catch (error: any) {
    logger.error('Error fetching shifts for student', 'student-routes', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch shifts', message: error?.message });
  }
});

export default router;


