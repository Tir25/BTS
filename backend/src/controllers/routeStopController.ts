/**
 * Route Stop Controller
 * Handles HTTP requests for route stop management endpoints
 */

import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export class RouteStopController {
  /**
   * Get route stops for a specific route
   */
  static async getRouteStops(req: Request, res: Response): Promise<void> {
    try {
      const routeId = String(req.query.routeId || '');
      if (!routeId) {
        res.status(400).json({ success: false, error: 'routeId required' });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('route_stops')
        .select('id, route_id, sequence, is_active, bus_stops:stop_id(name)')
        .eq('route_id', routeId)
        .order('sequence');

      if (error) throw error;

      const mapped = (data || []).map((r: any) => ({ 
        id: r.id, 
        route_id: r.route_id, 
        name: r.bus_stops?.name, 
        sequence: r.sequence, 
        is_active: r.is_active 
      }));

      res.json({ success: true, data: mapped });
    } catch (error: any) {
      logger.error('Error fetching route stops', 'route-stop-controller', { error: error?.message });
      res.status(500).json({ success: false, error: 'Failed to fetch route stops', message: error?.message });
    }
  }

  /**
   * Create new route stop
   */
  static async createRouteStop(req: Request, res: Response): Promise<void> {
    let busStopId: string | null = null;
    try {
      const { route_id, name } = req.body;
      if (!route_id || !name) {
        res.status(400).json({ success: false, error: 'route_id and name required' });
        return;
      }
      
      // PRODUCTION FIX: Validate route exists
      const { data: routeExists, error: routeCheckError } = await supabaseAdmin
        .from('routes')
        .select('id')
        .eq('id', route_id)
        .single();

      if (routeCheckError || !routeExists) {
        res.status(404).json({ success: false, error: 'Route not found' });
        return;
      }
      
      // PRODUCTION FIX: Validate name is not empty
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        res.status(400).json({ success: false, error: 'Stop name cannot be empty' });
        return;
      }
      
      // Create bus stop
      const { data: busStop, error: busStopError } = await supabaseAdmin
        .from('bus_stops')
        .insert({ name: trimmedName, is_active: true })
        .select('id')
        .single();
      
      if (busStopError || !busStop?.id) {
        logger.error('Error creating bus stop', 'route-stop-controller', { error: busStopError?.message });
        res.status(500).json({ success: false, error: 'Failed to create bus stop', message: busStopError?.message });
        return;
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
            logger.info('Cleaned up orphaned bus_stop after route_stop creation failure', 'route-stop-controller', { busStopId });
          } catch (cleanupError) {
            logger.error('Error cleaning up orphaned bus_stop', 'route-stop-controller', { error: cleanupError });
          }
        }
        throw error;
      }
      
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      logger.error('Error creating route stop', 'route-stop-controller', { error: error?.message });
      res.status(500).json({ success: false, error: 'Failed to create route stop', message: error?.message });
    }
  }

  /**
   * Update route stop
   */
  static async updateRouteStop(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, sequence, is_active } = req.body;

      // Load route_stops to get stop_id
      const { data: rs } = await supabaseAdmin
        .from('route_stops')
        .select('stop_id')
        .eq('id', id)
        .single();

      if (!rs) {
        res.status(404).json({ success: false, error: 'Route stop not found' });
        return;
      }

      if (name !== undefined && rs.stop_id) {
        await supabaseAdmin
          .from('bus_stops')
          .update({ name })
          .eq('id', rs.stop_id);
      }

      if (sequence !== undefined || is_active !== undefined) {
        const update: any = {};
        if (sequence !== undefined) update.sequence = sequence;
        if (is_active !== undefined) update.is_active = is_active;
        await supabaseAdmin
          .from('route_stops')
          .update(update)
          .eq('id', id);
      }

      res.json({ success: true });
    } catch (error: any) {
      logger.error('Error updating route stop', 'route-stop-controller', { error: error?.message });
      res.status(500).json({ success: false, error: 'Failed to update route stop', message: error?.message });
    }
  }

  /**
   * Delete route stop
   */
  static async deleteRouteStop(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error } = await supabaseAdmin
        .from('route_stops')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({ success: true });
    } catch (error: any) {
      logger.error('Error deleting route stop', 'route-stop-controller', { error: error?.message });
      res.status(500).json({ success: false, error: 'Failed to delete route stop', message: error?.message });
    }
  }

  /**
   * Reorder route stops
   */
  static async reorderRouteStops(req: Request, res: Response): Promise<void> {
    try {
      const { route_id, ordered_ids } = req.body as { route_id: string; ordered_ids: string[] };
      if (!route_id || !Array.isArray(ordered_ids)) {
        res.status(400).json({ success: false, error: 'route_id and ordered_ids required' });
        return;
      }
      
      // PRODUCTION FIX: Validate that all IDs belong to the specified route
      if (ordered_ids.length > 0) {
        const { data: existingStops, error: checkError } = await supabaseAdmin
          .from('route_stops')
          .select('id, route_id')
          .in('id', ordered_ids);
        
        if (checkError) {
          logger.error('Error validating route stops', 'route-stop-controller', { error: checkError.message });
          res.status(500).json({ success: false, error: 'Failed to validate route stops', message: checkError.message });
          return;
        }
        
        // Check if all stops belong to the specified route
        const invalidStops = existingStops?.filter(stop => stop.route_id !== route_id) || [];
        if (invalidStops.length > 0) {
          logger.error('Invalid route stops in reorder request', 'route-stop-controller', { 
            invalidStopIds: invalidStops.map(s => s.id),
            expectedRouteId: route_id
          });
          res.status(400).json({ 
            success: false, 
            error: 'Some stops do not belong to the specified route',
            invalidStopIds: invalidStops.map(s => s.id)
          });
          return;
        }
        
        // Check if all requested IDs exist
        const existingIds = new Set(existingStops?.map(s => s.id) || []);
        const missingIds = ordered_ids.filter(id => !existingIds.has(id));
        if (missingIds.length > 0) {
          res.status(404).json({ 
            success: false, 
            error: 'Some route stop IDs not found',
            missingIds 
          });
          return;
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
          logger.error('Error updating sequence for route stop', 'route-stop-controller', { id, error: error.message });
          throw error;
        }
      }
      
      res.json({ success: true });
    } catch (error: any) {
      logger.error('Error reordering route stops', 'route-stop-controller', { error: error?.message });
      res.status(500).json({ success: false, error: 'Failed to reorder route stops', message: error?.message });
    }
  }
}

