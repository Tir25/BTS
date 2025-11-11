"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentRouteService = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
class StudentRouteService {
    static async getRouteStatus(routeId, opts) {
        const { data: sessions, error: sessErr } = await supabase_1.supabaseAdmin
            .from('trip_sessions')
            .select('id, driver_id, bus_id, shift_id, last_stop_sequence, started_at')
            .eq('route_id', routeId)
            .is('ended_at', null)
            .order('started_at', { ascending: false });
        if (sessErr)
            throw sessErr;
        const active = (opts?.shiftId ? (sessions || []).find(s => s.shift_id === opts.shiftId) : (sessions || [])[0]) || null;
        if (!active) {
            return { tracking_active: false, stops: { completed: [], next: null, remaining: [] } };
        }
        const lastSeq = active.last_stop_sequence || 0;
        const { data: stops, error } = await supabase_1.supabaseAdmin
            .from('route_stops')
            .select('id, sequence, is_active, bus_stops:stop_id(name)')
            .eq('route_id', routeId)
            .eq('is_active', true)
            .order('sequence');
        if (error)
            throw error;
        const all = (stops || []).map((s) => ({ id: s.id, name: s.bus_stops?.name, sequence: s.sequence }));
        const completed = all.filter(s => s.sequence <= lastSeq);
        const remaining = all.filter(s => s.sequence > lastSeq);
        const nextStop = remaining[0] || null;
        return {
            tracking_active: true,
            session: { id: active.id, driver_id: active.driver_id, bus_id: active.bus_id, shift_id: active.shift_id, started_at: active.started_at },
            stops: { completed, next: nextStop, remaining }
        };
    }
    static async getRouteStops(routeId) {
        const { data: stops, error } = await supabase_1.supabaseAdmin
            .from('route_stops')
            .select('id, sequence, is_active, bus_stops:stop_id(name)')
            .eq('route_id', routeId)
            .eq('is_active', true)
            .order('sequence');
        if (error)
            throw error;
        return (stops || []).map((s) => ({ id: s.id, name: s.bus_stops?.name, sequence: s.sequence }));
    }
    static async getActiveRoutesByShift(opts) {
        let shiftId = opts.shiftId || null;
        if (!shiftId && opts.shiftName) {
            const { data: shift } = await supabase_1.supabaseAdmin
                .from('shifts')
                .select('id')
                .ilike('name', opts.shiftName)
                .maybeSingle();
            shiftId = shift?.id || null;
        }
        const query = supabase_1.supabaseAdmin
            .from('trip_sessions')
            .select('route_id')
            .is('ended_at', null);
        if (shiftId)
            query.eq('shift_id', shiftId);
        const { data: sessions, error } = await query;
        if (error)
            throw error;
        const routeIds = Array.from(new Set((sessions || []).map((s) => s.route_id))).filter(Boolean);
        if (routeIds.length === 0)
            return [];
        const { data: routes, error: rErr } = await supabase_1.supabaseAdmin
            .from('routes')
            .select('id, name')
            .in('id', routeIds)
            .order('name');
        if (rErr)
            throw rErr;
        return routes || [];
    }
    static async getRoutesByShift(opts) {
        let shiftId = opts.shiftId || null;
        if (!shiftId && opts.shiftName) {
            let { data: shift, error: shiftErr } = await supabase_1.supabaseAdmin
                .from('shifts')
                .select('id')
                .eq('name', opts.shiftName)
                .maybeSingle();
            if (!shift && !shiftErr) {
                ({ data: shift, error: shiftErr } = await supabase_1.supabaseAdmin
                    .from('shifts')
                    .select('id')
                    .ilike('name', opts.shiftName)
                    .maybeSingle());
            }
            if (shiftErr) {
                logger_1.logger.error('Error looking up shift by name', 'StudentRouteService', { shiftName: opts.shiftName, error: shiftErr });
                throw shiftErr;
            }
            shiftId = shift?.id || null;
            logger_1.logger.info('Shift lookup result', 'StudentRouteService', { shiftName: opts.shiftName, shiftId, found: !!shift });
        }
        if (!shiftId) {
            logger_1.logger.warn('No shift ID found', 'StudentRouteService', { opts });
            return [];
        }
        let shiftRoutes = [];
        try {
            const { data: routesWithShift, error: routesErr } = await supabase_1.supabaseAdmin
                .from('routes')
                .select('*')
                .eq('is_active', true)
                .eq('assigned_shift_id', shiftId)
                .order('name');
            if (!routesErr && routesWithShift) {
                shiftRoutes = routesWithShift;
            }
            else if (routesErr && routesErr.code !== '42703') {
                logger_1.logger.error('Error fetching routes by shift', 'StudentRouteService', { shiftId, error: routesErr });
                throw routesErr;
            }
        }
        catch (err) {
            if (err.code !== '42703') {
                logger_1.logger.warn('Error checking routes.assigned_shift_id (column may not exist)', 'StudentRouteService', { error: err });
            }
        }
        logger_1.logger.info('Routes found by shift assignment', 'StudentRouteService', { shiftId, count: shiftRoutes?.length || 0 });
        const { data: buses, error: bErr } = await supabase_1.supabaseAdmin
            .from('buses')
            .select('route_id')
            .eq('is_active', true)
            .eq('assigned_shift_id', shiftId)
            .not('route_id', 'is', null);
        if (bErr)
            throw bErr;
        const routeIdsFromBuses = new Set((buses || []).map((b) => b.route_id).filter(Boolean));
        const merged = new Map();
        (shiftRoutes || []).forEach(r => merged.set(r.id, r));
        logger_1.logger.info('Merging routes from buses', 'StudentRouteService', { routeIdsFromBuses: Array.from(routeIdsFromBuses), existingRoutes: Array.from(merged.keys()) });
        if (routeIdsFromBuses.size > 0) {
            const { data: busRoutes, error: brErr } = await supabase_1.supabaseAdmin
                .from('routes')
                .select('*')
                .in('id', Array.from(routeIdsFromBuses))
                .eq('is_active', true);
            if (brErr) {
                logger_1.logger.error('Error fetching routes from buses', 'StudentRouteService', { routeIds: Array.from(routeIdsFromBuses), error: brErr });
                throw brErr;
            }
            logger_1.logger.info('Routes found from bus assignments', 'StudentRouteService', { count: busRoutes?.length || 0 });
            (busRoutes || []).forEach(r => merged.set(r.id, r));
        }
        const finalRoutes = Array.from(merged.values()).map((route) => {
            let coordinates = [];
            const geometry = route.stops || route.geom;
            if (geometry) {
                if (geometry.coordinates && Array.isArray(geometry.coordinates)) {
                    coordinates = geometry.coordinates;
                }
                else if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
                    coordinates = geometry.coordinates;
                }
                else if (typeof geometry === 'string') {
                    try {
                        const parsed = JSON.parse(geometry);
                        if (parsed.coordinates && Array.isArray(parsed.coordinates)) {
                            coordinates = parsed.coordinates;
                        }
                    }
                    catch (e) {
                        logger_1.logger.warn('Failed to parse route geometry as JSON', 'StudentRouteService', { routeId: route.id });
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
                coordinates: coordinates,
                geom: route.geom,
                stops: route.stops,
                ...route
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
        logger_1.logger.info('Final routes for shift', 'StudentRouteService', {
            shiftId,
            shiftName: opts.shiftName,
            count: finalRoutes.length,
            routesWithGeometry: finalRoutes.filter(r => r.coordinates && r.coordinates.length > 0).length
        });
        return finalRoutes;
    }
}
exports.StudentRouteService = StudentRouteService;
//# sourceMappingURL=StudentRouteService.js.map