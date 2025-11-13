"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteStopController = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
class RouteStopController {
    static async getRouteStops(req, res) {
        try {
            const routeId = String(req.query.routeId || '');
            if (!routeId) {
                res.status(400).json({ success: false, error: 'routeId required' });
                return;
            }
            const { data, error } = await supabase_1.supabaseAdmin
                .from('route_stops')
                .select('id, route_id, sequence, is_active, bus_stops:stop_id(name)')
                .eq('route_id', routeId)
                .order('sequence');
            if (error)
                throw error;
            const mapped = (data || []).map((r) => ({
                id: r.id,
                route_id: r.route_id,
                name: r.bus_stops?.name,
                sequence: r.sequence,
                is_active: r.is_active
            }));
            res.json({ success: true, data: mapped });
        }
        catch (error) {
            logger_1.logger.error('Error fetching route stops', 'route-stop-controller', { error: error?.message });
            res.status(500).json({ success: false, error: 'Failed to fetch route stops', message: error?.message });
        }
    }
    static async createRouteStop(req, res) {
        let busStopId = null;
        try {
            const { route_id, name } = req.body;
            if (!route_id || !name) {
                res.status(400).json({ success: false, error: 'route_id and name required' });
                return;
            }
            const { data: routeExists, error: routeCheckError } = await supabase_1.supabaseAdmin
                .from('routes')
                .select('id')
                .eq('id', route_id)
                .single();
            if (routeCheckError || !routeExists) {
                res.status(404).json({ success: false, error: 'Route not found' });
                return;
            }
            const trimmedName = String(name).trim();
            if (!trimmedName) {
                res.status(400).json({ success: false, error: 'Stop name cannot be empty' });
                return;
            }
            const { data: busStop, error: busStopError } = await supabase_1.supabaseAdmin
                .from('bus_stops')
                .insert({ name: trimmedName, is_active: true })
                .select('id')
                .single();
            if (busStopError || !busStop?.id) {
                logger_1.logger.error('Error creating bus stop', 'route-stop-controller', { error: busStopError?.message });
                res.status(500).json({ success: false, error: 'Failed to create bus stop', message: busStopError?.message });
                return;
            }
            busStopId = busStop.id;
            const { data: maxStop } = await supabase_1.supabaseAdmin
                .from('route_stops')
                .select('sequence')
                .eq('route_id', route_id)
                .order('sequence', { ascending: false })
                .limit(1)
                .maybeSingle();
            const nextSeq = (maxStop?.sequence || 0) + 1;
            const { data, error } = await supabase_1.supabaseAdmin
                .from('route_stops')
                .insert({ route_id, stop_id: busStopId, sequence: nextSeq, is_active: true })
                .select('id')
                .single();
            if (error) {
                if (busStopId) {
                    try {
                        await supabase_1.supabaseAdmin.from('bus_stops').delete().eq('id', busStopId);
                        logger_1.logger.info('Cleaned up orphaned bus_stop after route_stop creation failure', 'route-stop-controller', { busStopId });
                    }
                    catch (cleanupError) {
                        logger_1.logger.error('Error cleaning up orphaned bus_stop', 'route-stop-controller', { error: cleanupError });
                    }
                }
                throw error;
            }
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            logger_1.logger.error('Error creating route stop', 'route-stop-controller', { error: error?.message });
            res.status(500).json({ success: false, error: 'Failed to create route stop', message: error?.message });
        }
    }
    static async updateRouteStop(req, res) {
        try {
            const { id } = req.params;
            const { name, sequence, is_active } = req.body;
            const { data: rs } = await supabase_1.supabaseAdmin
                .from('route_stops')
                .select('stop_id')
                .eq('id', id)
                .single();
            if (!rs) {
                res.status(404).json({ success: false, error: 'Route stop not found' });
                return;
            }
            if (name !== undefined && rs.stop_id) {
                await supabase_1.supabaseAdmin
                    .from('bus_stops')
                    .update({ name })
                    .eq('id', rs.stop_id);
            }
            if (sequence !== undefined || is_active !== undefined) {
                const update = {};
                if (sequence !== undefined)
                    update.sequence = sequence;
                if (is_active !== undefined)
                    update.is_active = is_active;
                await supabase_1.supabaseAdmin
                    .from('route_stops')
                    .update(update)
                    .eq('id', id);
            }
            res.json({ success: true });
        }
        catch (error) {
            logger_1.logger.error('Error updating route stop', 'route-stop-controller', { error: error?.message });
            res.status(500).json({ success: false, error: 'Failed to update route stop', message: error?.message });
        }
    }
    static async deleteRouteStop(req, res) {
        try {
            const { id } = req.params;
            const { error } = await supabase_1.supabaseAdmin
                .from('route_stops')
                .delete()
                .eq('id', id);
            if (error)
                throw error;
            res.json({ success: true });
        }
        catch (error) {
            logger_1.logger.error('Error deleting route stop', 'route-stop-controller', { error: error?.message });
            res.status(500).json({ success: false, error: 'Failed to delete route stop', message: error?.message });
        }
    }
    static async reorderRouteStops(req, res) {
        try {
            const { route_id, ordered_ids } = req.body;
            if (!route_id || !Array.isArray(ordered_ids)) {
                res.status(400).json({ success: false, error: 'route_id and ordered_ids required' });
                return;
            }
            if (ordered_ids.length > 0) {
                const { data: existingStops, error: checkError } = await supabase_1.supabaseAdmin
                    .from('route_stops')
                    .select('id, route_id')
                    .in('id', ordered_ids);
                if (checkError) {
                    logger_1.logger.error('Error validating route stops', 'route-stop-controller', { error: checkError.message });
                    res.status(500).json({ success: false, error: 'Failed to validate route stops', message: checkError.message });
                    return;
                }
                const invalidStops = existingStops?.filter(stop => stop.route_id !== route_id) || [];
                if (invalidStops.length > 0) {
                    logger_1.logger.error('Invalid route stops in reorder request', 'route-stop-controller', {
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
            let seq = 1;
            for (const id of ordered_ids) {
                const { error } = await supabase_1.supabaseAdmin
                    .from('route_stops')
                    .update({ sequence: seq++ })
                    .eq('id', id)
                    .eq('route_id', route_id);
                if (error) {
                    logger_1.logger.error('Error updating sequence for route stop', 'route-stop-controller', { id, error: error.message });
                    throw error;
                }
            }
            res.json({ success: true });
        }
        catch (error) {
            logger_1.logger.error('Error reordering route stops', 'route-stop-controller', { error: error?.message });
            res.status(500).json({ success: false, error: 'Failed to reorder route stops', message: error?.message });
        }
    }
}
exports.RouteStopController = RouteStopController;
//# sourceMappingURL=routeStopController.js.map