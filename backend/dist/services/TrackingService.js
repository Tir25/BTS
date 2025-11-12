"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingService = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const AssignmentDashboardService_1 = require("./assignments/AssignmentDashboardService");
class TrackingService {
    static async startTracking(driverId, shiftId) {
        const assignment = await AssignmentDashboardService_1.AssignmentDashboardService.getDriverAssignment(driverId);
        if (!assignment)
            throw new Error('No active assignment for driver');
        const routeId = assignment.route_id;
        const busId = assignment.bus_id;
        let finalShiftId = shiftId || assignment.shift_id || null;
        if (!finalShiftId) {
            const { data: dayShift } = await supabase_1.supabaseAdmin
                .from('shifts')
                .select('id')
                .ilike('name', 'day')
                .maybeSingle();
            finalShiftId = dayShift?.id;
            if (!finalShiftId) {
                const { data: created, error: createError } = await supabase_1.supabaseAdmin
                    .from('shifts')
                    .insert({ name: 'Day' })
                    .select('id')
                    .single();
                if (createError)
                    throw createError;
                finalShiftId = created.id;
            }
        }
        const { data: existingActive } = await supabase_1.supabaseAdmin
            .from('trip_sessions')
            .select('id, shift_id')
            .eq('driver_id', driverId)
            .is('ended_at', null)
            .maybeSingle();
        if (existingActive) {
            logger_1.logger.info('Reusing active trip session', 'tracking-service', { driverId, routeId, busId, shiftId: finalShiftId, sessionShiftId: existingActive.shift_id });
            if (finalShiftId && existingActive.shift_id !== finalShiftId) {
                const { error: shiftUpdateError } = await supabase_1.supabaseAdmin
                    .from('trip_sessions')
                    .update({ shift_id: finalShiftId })
                    .eq('id', existingActive.id);
                if (shiftUpdateError) {
                    logger_1.logger.warn('Failed to update session shift_id', 'tracking-service', { error: shiftUpdateError, driverId, sessionId: existingActive.id, desiredShiftId: finalShiftId });
                }
                else {
                    logger_1.logger.info('Session shift_id updated to match assignment', 'tracking-service', { driverId, sessionId: existingActive.id, shiftId: finalShiftId });
                    existingActive.shift_id = finalShiftId;
                }
            }
            else if (!existingActive.shift_id && finalShiftId) {
                const { error: assignShiftError } = await supabase_1.supabaseAdmin
                    .from('trip_sessions')
                    .update({ shift_id: finalShiftId })
                    .eq('id', existingActive.id);
                if (assignShiftError) {
                    logger_1.logger.warn('Failed to assign shift_id to existing session', 'tracking-service', { error: assignShiftError, driverId, sessionId: existingActive.id, shiftId: finalShiftId });
                }
                else {
                    existingActive.shift_id = finalShiftId;
                }
            }
            else if (!finalShiftId && existingActive.shift_id) {
                finalShiftId = existingActive.shift_id;
            }
            return existingActive;
        }
        const { data, error } = await supabase_1.supabaseAdmin
            .from('trip_sessions')
            .insert({
            driver_id: driverId,
            route_id: routeId,
            shift_id: finalShiftId,
            bus_id: busId,
            last_stop_sequence: 0,
        })
            .select('id, driver_id, route_id, shift_id, bus_id, started_at')
            .single();
        if (error) {
            logger_1.logger.error('Error starting tracking', 'tracking-service', { error, driverId, routeId, finalShiftId });
            throw error;
        }
        return data;
    }
    static async stopTracking(driverId) {
        const { data: active, error: activeError } = await supabase_1.supabaseAdmin
            .from('trip_sessions')
            .select('id')
            .eq('driver_id', driverId)
            .is('ended_at', null)
            .maybeSingle();
        if (activeError)
            throw activeError;
        if (!active)
            return { success: true };
        const { error } = await supabase_1.supabaseAdmin
            .from('trip_sessions')
            .update({ ended_at: new Date().toISOString() })
            .eq('id', active.id);
        if (error)
            throw error;
        return { success: true };
    }
    static async stopReached(driverId, routeStopId) {
        const { data: session } = await supabase_1.supabaseAdmin
            .from('trip_sessions')
            .select('id, route_id, last_stop_sequence')
            .eq('driver_id', driverId)
            .is('ended_at', null)
            .maybeSingle();
        if (!session)
            throw new Error('No active session');
        const { data: stop, error: stopErr } = await supabase_1.supabaseAdmin
            .from('route_stops')
            .select('id, sequence, route_id')
            .eq('id', routeStopId)
            .single();
        if (stopErr)
            throw stopErr;
        if (stop.route_id !== session.route_id)
            throw new Error('Stop is not on session route');
        const { data: countData } = await supabase_1.supabaseAdmin
            .from('route_stops')
            .select('id', { count: 'exact', head: true })
            .eq('route_id', session.route_id)
            .eq('is_active', true);
        const total = countData?.length || 0;
        let nextSequence = stop.sequence;
        const currentSequence = session.last_stop_sequence || 0;
        logger_1.logger.info('Processing stop reached', 'tracking-service', {
            driverId,
            routeStopId,
            stopSequence: stop.sequence,
            currentLastSequence: currentSequence,
            routeId: session.route_id
        });
        const { data: maxStop } = await supabase_1.supabaseAdmin
            .from('route_stops')
            .select('sequence')
            .eq('route_id', session.route_id)
            .eq('is_active', true)
            .order('sequence', { ascending: false })
            .limit(1)
            .maybeSingle();
        const maxSequence = maxStop?.sequence || nextSequence;
        if (nextSequence >= maxSequence) {
            logger_1.logger.info('Last stop reached, resetting sequence to 0', 'tracking-service', {
                driverId,
                stopSequence: nextSequence,
                maxSequence
            });
            nextSequence = 0;
        }
        const { error } = await supabase_1.supabaseAdmin
            .from('trip_sessions')
            .update({ last_stop_sequence: nextSequence })
            .eq('id', session.id);
        if (error) {
            logger_1.logger.error('Error updating stop sequence', 'tracking-service', {
                error,
                driverId,
                sessionId: session.id,
                nextSequence
            });
            throw error;
        }
        logger_1.logger.info('Stop sequence updated successfully', 'tracking-service', {
            driverId,
            routeStopId,
            previousSequence: currentSequence,
            newSequence: nextSequence,
            routeId: session.route_id
        });
        return {
            success: true,
            last_stop_sequence: nextSequence,
            route_id: session.route_id,
            stop_id: routeStopId
        };
    }
    static async getDriverAssignmentWithStops(driverId) {
        const assignment = await AssignmentDashboardService_1.AssignmentDashboardService.getDriverAssignment(driverId);
        if (!assignment) {
            logger_1.logger.info('No assignment found for driver', 'tracking-service', { driverId });
            return null;
        }
        if (!assignment.route_id) {
            logger_1.logger.warn('Assignment found but missing route_id', 'tracking-service', {
                driverId,
                assignmentId: assignment.id,
                busId: assignment.bus_id
            });
            return null;
        }
        const { data: session } = await supabase_1.supabaseAdmin
            .from('trip_sessions')
            .select('id, last_stop_sequence, shift_id')
            .eq('driver_id', driverId)
            .is('ended_at', null)
            .maybeSingle();
        if (session && assignment.shift_id && session.shift_id !== assignment.shift_id) {
            const { error: alignShiftError } = await supabase_1.supabaseAdmin
                .from('trip_sessions')
                .update({ shift_id: assignment.shift_id })
                .eq('id', session.id);
            if (alignShiftError) {
                logger_1.logger.warn('Failed to align session shift_id with assignment', 'tracking-service', { error: alignShiftError, driverId, sessionId: session.id, assignmentShiftId: assignment.shift_id, sessionShiftId: session.shift_id });
            }
            else {
                session.shift_id = assignment.shift_id;
                logger_1.logger.info('Session shift_id aligned with assignment', 'tracking-service', { driverId, sessionId: session.id, shiftId: assignment.shift_id });
            }
        }
        else if (session && !session.shift_id && assignment.shift_id) {
            const { error: assignShiftError } = await supabase_1.supabaseAdmin
                .from('trip_sessions')
                .update({ shift_id: assignment.shift_id })
                .eq('id', session.id);
            if (!assignShiftError) {
                session.shift_id = assignment.shift_id;
            }
        }
        const lastSeq = session ? (session.last_stop_sequence || 0) : 0;
        logger_1.logger.info('Route stops calculation', 'tracking-service', {
            driverId,
            routeId: assignment.route_id,
            hasSession: !!session,
            lastSeq,
            sessionLastSeq: session?.last_stop_sequence
        });
        const fetchShiftDetails = async (id) => {
            if (!id)
                return null;
            const { data, error } = await supabase_1.supabaseAdmin
                .from('shifts')
                .select('name,start_time,end_time')
                .eq('id', id)
                .maybeSingle();
            if (error) {
                logger_1.logger.warn('Error fetching shift information', 'tracking-service', { error, shiftId: id });
                return null;
            }
            if (!data)
                return null;
            return {
                name: data.name || null,
                start_time: data.start_time ?? null,
                end_time: data.end_time ?? null,
            };
        };
        const effectiveShiftId = session?.shift_id || assignment.shift_id || null;
        let shiftName = assignment.shift_name || null;
        let shiftStartTime = assignment.shift_start_time || null;
        let shiftEndTime = assignment.shift_end_time || null;
        if (effectiveShiftId && (!shiftName || session?.shift_id)) {
            const resolvedShift = await fetchShiftDetails(effectiveShiftId);
            if (resolvedShift) {
                shiftName = resolvedShift.name;
                shiftStartTime = resolvedShift.start_time;
                shiftEndTime = resolvedShift.end_time;
            }
        }
        const { data: stops, error: stopsError } = await supabase_1.supabaseAdmin
            .from('route_stops')
            .select('id, sequence, is_active, stop_id')
            .eq('route_id', assignment.route_id)
            .eq('is_active', true)
            .order('sequence', { ascending: true });
        if (stopsError) {
            logger_1.logger.error('Error fetching route stops', 'tracking-service', {
                error: stopsError,
                routeId: assignment.route_id,
                driverId
            });
            throw stopsError;
        }
        if (!stops || stops.length === 0) {
            logger_1.logger.warn('No route stops found for route', 'tracking-service', {
                routeId: assignment.route_id,
                routeName: assignment.route_name,
                driverId,
                message: 'Route exists but has no stops configured. Admin should add stops to this route.'
            });
            return {
                route_id: assignment.route_id,
                bus_id: assignment.bus_id,
                route_name: assignment.route_name || null,
                shift_id: effectiveShiftId,
                shift_name: shiftName,
                shift_start_time: shiftStartTime,
                shift_end_time: shiftEndTime,
                tracking_active: !!session,
                stops: { completed: [], next: null, remaining: [] }
            };
        }
        const stopIds = stops.map((s) => s.stop_id).filter(Boolean);
        let stopNamesMap = new Map();
        if (stopIds.length > 0) {
            const { data: busStops, error: busStopsError } = await supabase_1.supabaseAdmin
                .from('bus_stops')
                .select('id, name')
                .in('id', stopIds);
            if (busStopsError) {
                logger_1.logger.error('Error fetching bus stop names', 'tracking-service', {
                    error: busStopsError,
                    routeId: assignment.route_id,
                    driverId
                });
            }
            else if (busStops) {
                busStops.forEach((bs) => {
                    if (bs.id && bs.name) {
                        stopNamesMap.set(bs.id, bs.name);
                    }
                });
            }
        }
        const all = (stops || []).map((s) => {
            const stopName = stopNamesMap.get(s.stop_id) || `Stop ${s.sequence}`;
            return {
                id: s.id,
                name: stopName.trim(),
                sequence: s.sequence
            };
        });
        const completed = all.filter(s => s.sequence <= lastSeq && lastSeq > 0);
        const remaining = all.filter(s => s.sequence > lastSeq);
        const nextStop = remaining.length > 0 ? remaining[0] : null;
        logger_1.logger.info('Route stops processed', 'tracking-service', {
            driverId,
            routeId: assignment.route_id,
            totalStops: all.length,
            lastSeq,
            completedCount: completed.length,
            remainingCount: remaining.length,
            hasNext: !!nextStop,
            allSequences: all.map(s => s.sequence),
            completedSequences: completed.map(s => s.sequence),
            remainingSequences: remaining.map(s => s.sequence)
        });
        return {
            route_id: assignment.route_id,
            bus_id: assignment.bus_id,
            route_name: assignment.route_name || null,
            shift_id: effectiveShiftId,
            shift_name: shiftName,
            shift_start_time: shiftStartTime,
            shift_end_time: shiftEndTime,
            tracking_active: !!session,
            stops: { completed, next: nextStop, remaining }
        };
    }
}
exports.TrackingService = TrackingService;
//# sourceMappingURL=TrackingService.js.map