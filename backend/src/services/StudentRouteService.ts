import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export class StudentRouteService {
  static async getRouteStatus(routeId: string, opts?: { shiftId?: string }) {
    // Find an active session on this route (optionally by shift), prefer most recent
    const { data: sessions, error: sessErr } = await supabaseAdmin
      .from('trip_sessions')
      .select('id, driver_id, bus_id, shift_id, last_stop_sequence, started_at')
      .eq('route_id', routeId)
      .is('ended_at', null)
      .order('started_at', { ascending: false });
    if (sessErr) throw sessErr;

    const active = (opts?.shiftId ? (sessions || []).find(s => s.shift_id === opts.shiftId) : (sessions || [])[0]) || null;
    if (!active) {
      return { tracking_active: false, stops: { completed: [], next: null, remaining: [] } };
    }

    const lastSeq = active.last_stop_sequence || 0;
    const { data: stops, error } = await supabaseAdmin
      .from('route_stops')
      .select('id, sequence, is_active, bus_stops:stop_id(name)')
      .eq('route_id', routeId)
      .eq('is_active', true)
      .order('sequence');
    if (error) throw error;

    const all = (stops || []).map((s: any) => ({ id: s.id, name: s.bus_stops?.name, sequence: s.sequence }));
    const completed = all.filter(s => s.sequence <= lastSeq);
    const remaining = all.filter(s => s.sequence > lastSeq);
    const nextStop = remaining[0] || null;

    return {
      tracking_active: true,
      session: { id: active.id, driver_id: active.driver_id, bus_id: active.bus_id, shift_id: active.shift_id, started_at: active.started_at },
      stops: { completed, next: nextStop, remaining }
    };
  }

  static async getRouteStops(routeId: string) {
    const { data: stops, error } = await supabaseAdmin
      .from('route_stops')
      .select('id, sequence, is_active, bus_stops:stop_id(name)')
      .eq('route_id', routeId)
      .eq('is_active', true)
      .order('sequence');
    if (error) throw error;

    return (stops || []).map((s: any) => ({ id: s.id, name: s.bus_stops?.name, sequence: s.sequence }));
  }

  static async getActiveRoutesByShift(opts: { shiftId?: string; shiftName?: string }) {
    let shiftId = opts.shiftId || null;
    if (!shiftId && opts.shiftName) {
      const { data: shift } = await supabaseAdmin
        .from('shifts')
        .select('id')
        .ilike('name', opts.shiftName)
        .maybeSingle();
      shiftId = shift?.id || null;
    }

    const query = supabaseAdmin
      .from('trip_sessions')
      .select('route_id')
      .is('ended_at', null);
    if (shiftId) query.eq('shift_id', shiftId);

    const { data: sessions, error } = await query;
    if (error) throw error;
    const routeIds = Array.from(new Set((sessions || []).map((s: any) => s.route_id))).filter(Boolean);
    if (routeIds.length === 0) return [] as Array<{ id: string; name: string }>;

    const { data: routes, error: rErr } = await supabaseAdmin
      .from('routes')
      .select('id, name')
      .in('id', routeIds)
      .order('name');
    if (rErr) throw rErr;
    return routes || [];
  }

  static async getRoutesByShift(opts: { shiftId?: string; shiftName?: string }) {
    let shiftId = opts.shiftId || null;
    if (!shiftId && opts.shiftName) {
      // Try exact match first (case-sensitive)
      let { data: shift, error: shiftErr } = await supabaseAdmin
        .from('shifts')
        .select('id')
        .eq('name', opts.shiftName)
        .maybeSingle();
      
      // If not found, try case-insensitive using ilike with exact pattern
      if (!shift && !shiftErr) {
        ({ data: shift, error: shiftErr } = await supabaseAdmin
          .from('shifts')
          .select('id')
          .ilike('name', opts.shiftName)
          .maybeSingle());
      }
      
      if (shiftErr) {
        logger.error('Error looking up shift by name', 'StudentRouteService', { shiftName: opts.shiftName, error: shiftErr });
        throw shiftErr;
      }
      shiftId = shift?.id || null;
      logger.info('Shift lookup result', 'StudentRouteService', { shiftName: opts.shiftName, shiftId, found: !!shift });
    }

    if (!shiftId) {
      logger.warn('No shift ID found', 'StudentRouteService', { opts });
      return [] as Array<{ id: string; name: string; [key: string]: any }>;
    }

    // 1) Route-level mapping: all routes explicitly assigned to this shift
    // PRODUCTION FIX: Query routes table directly to get geometry and check if assigned_shift_id column exists
    // Note: assigned_shift_id may not exist on routes table, so we'll check buses instead
    let shiftRoutes: any[] = [];
    try {
      // Try to query routes with assigned_shift_id (if column exists)
      const { data: routesWithShift, error: routesErr } = await supabaseAdmin
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .eq('assigned_shift_id', shiftId)
        .order('name');
      
      if (!routesErr && routesWithShift) {
        shiftRoutes = routesWithShift;
      } else if (routesErr && routesErr.code !== '42703') { // 42703 = column doesn't exist
        logger.error('Error fetching routes by shift', 'StudentRouteService', { shiftId, error: routesErr });
        throw routesErr;
      }
    } catch (err: any) {
      // If column doesn't exist, that's okay - we'll rely on bus assignments
      if (err.code !== '42703') {
        logger.warn('Error checking routes.assigned_shift_id (column may not exist)', 'StudentRouteService', { error: err });
      }
    }
    logger.info('Routes found by shift assignment', 'StudentRouteService', { shiftId, count: shiftRoutes?.length || 0 });

    // 2) Fallback: routes that are assigned to buses with this shift (in case some routes weren't annotated yet)
    const { data: buses, error: bErr } = await supabaseAdmin
      .from('buses')
      .select('route_id')
      .eq('is_active', true)
      .eq('assigned_shift_id', shiftId)
      .not('route_id', 'is', null);
    if (bErr) throw bErr;

    const routeIdsFromBuses = new Set((buses || []).map((b: any) => b.route_id).filter(Boolean));
    const merged = new Map<string, any>();
    // Add routes from direct shift assignment
    (shiftRoutes || []).forEach(r => merged.set(r.id, r));
    logger.info('Merging routes from buses', 'StudentRouteService', { routeIdsFromBuses: Array.from(routeIdsFromBuses), existingRoutes: Array.from(merged.keys()) });
    
    // Fetch routes from bus assignments with full data including geometry
    if (routeIdsFromBuses.size > 0) {
      // PRODUCTION FIX: Query routes table directly to get geometry (stops column)
      const { data: busRoutes, error: brErr } = await supabaseAdmin
        .from('routes')
        .select('*')
        .in('id', Array.from(routeIdsFromBuses))
        .eq('is_active', true);
      if (brErr) {
        logger.error('Error fetching routes from buses', 'StudentRouteService', { routeIds: Array.from(routeIdsFromBuses), error: brErr });
        throw brErr;
      }
      logger.info('Routes found from bus assignments', 'StudentRouteService', { count: busRoutes?.length || 0 });
      (busRoutes || []).forEach(r => merged.set(r.id, r));
    }

    // PRODUCTION FIX: Transform routes to include geometry in format expected by frontend
    const finalRoutes = Array.from(merged.values()).map((route: any) => {
      // Extract coordinates from geometry if available
      // Routes table has 'stops' column (GEOMETRY(LINESTRING, 4326)) which contains route path
      let coordinates: [number, number][] = [];
      
      // Try to get coordinates from 'stops' column first (route path geometry)
      const geometry = route.stops || route.geom;
      if (geometry) {
        // Handle PostGIS geometry format (GeoJSON)
        if (geometry.coordinates && Array.isArray(geometry.coordinates)) {
          coordinates = geometry.coordinates;
        } else if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
          coordinates = geometry.coordinates;
        } else if (typeof geometry === 'string') {
          // Try to parse as GeoJSON string
          try {
            const parsed = JSON.parse(geometry);
            if (parsed.coordinates && Array.isArray(parsed.coordinates)) {
              coordinates = parsed.coordinates;
            }
          } catch (e) {
            logger.warn('Failed to parse route geometry as JSON', 'StudentRouteService', { routeId: route.id });
          }
        }
      }

      return {
        id: route.id,
        name: route.name,
        description: route.description,
        distance_km: route.distance_km,
        estimated_duration_minutes: route.estimated_duration_minutes,
        city: route.city,
        is_active: route.is_active,
        created_at: route.created_at,
        updated_at: route.updated_at,
        // PRODUCTION FIX: Include geometry data for map display
        coordinates: coordinates,
        geom: route.geom,
        stops: route.stops,
        // Include all other route properties
        ...route
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    
    logger.info('Final routes for shift', 'StudentRouteService', { 
      shiftId, 
      shiftName: opts.shiftName, 
      count: finalRoutes.length,
      routesWithGeometry: finalRoutes.filter(r => r.coordinates && r.coordinates.length > 0).length 
    });
    return finalRoutes;
  }
}


