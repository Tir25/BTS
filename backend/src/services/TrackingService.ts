import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { ProductionAssignmentService } from './ProductionAssignmentService';

export class TrackingService {
  static async startTracking(driverId: string, shiftId?: string) {
    const assignment = await ProductionAssignmentService.getDriverAssignment(driverId);
    if (!assignment) throw new Error('No active assignment for driver');

    const routeId = assignment.route_id;
    const busId = assignment.bus_id;

    let finalShiftId = shiftId;
    if (!finalShiftId) {
      const { data: dayShift } = await supabaseAdmin
        .from('shifts')
        .select('id')
        .ilike('name', 'day')
        .maybeSingle();
      finalShiftId = dayShift?.id;
      if (!finalShiftId) {
        // fallback to any shift or create minimal null-unsafe default by inserting a Day shift
        const { data: created, error: createError } = await supabaseAdmin
          .from('shifts')
          .insert({ name: 'Day' })
          .select('id')
          .single();
        if (createError) throw createError;
        finalShiftId = created.id;
      }
    }

    // Upsert: ensure only one active session per driver
    const { data: existingActive } = await supabaseAdmin
      .from('trip_sessions')
      .select('id')
      .eq('driver_id', driverId)
      .is('ended_at', null)
      .maybeSingle();

    if (existingActive) {
      logger.info('Reusing active trip session', 'tracking-service', { driverId, routeId, busId, shiftId: finalShiftId });
      return existingActive;
    }

    const { data, error } = await supabaseAdmin
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
      logger.error('Error starting tracking', 'tracking-service', { error, driverId, routeId, finalShiftId });
      throw error;
    }

    return data;
  }

  static async stopTracking(driverId: string) {
    const { data: active, error: activeError } = await supabaseAdmin
      .from('trip_sessions')
      .select('id')
      .eq('driver_id', driverId)
      .is('ended_at', null)
      .maybeSingle();

    if (activeError) throw activeError;
    if (!active) return { success: true };

    const { error } = await supabaseAdmin
      .from('trip_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', active.id);

    if (error) throw error;
    return { success: true };
  }

  static async stopReached(driverId: string, routeStopId: string) {
    // Load active session
    const { data: session } = await supabaseAdmin
      .from('trip_sessions')
      .select('id, route_id, last_stop_sequence')
      .eq('driver_id', driverId)
      .is('ended_at', null)
      .maybeSingle();
    if (!session) throw new Error('No active session');

    // Get stop sequence and total count on this route
    const { data: stop, error: stopErr } = await supabaseAdmin
      .from('route_stops')
      .select('id, sequence, route_id')
      .eq('id', routeStopId)
      .single();
    if (stopErr) throw stopErr;
    if (stop.route_id !== session.route_id) throw new Error('Stop is not on session route');

    const { data: countData } = await supabaseAdmin
      .from('route_stops')
      .select('id', { count: 'exact', head: true })
      .eq('route_id', session.route_id)
      .eq('is_active', true);
    const total = (countData as any)?.length || 0; // head:true returns no rows; count accessible via .count in supabase-js; workaround not available here, so skip strict total

    // Advance last_stop_sequence
    let nextSequence = stop.sequence;
    // Reset if last
    // If we cannot get total, we still allow reset when no remaining stops based on max sequence
    const { data: maxStop } = await supabaseAdmin
      .from('route_stops')
      .select('sequence')
      .eq('route_id', session.route_id)
      .order('sequence', { ascending: false })
      .limit(1)
      .maybeSingle();

    const maxSequence = maxStop?.sequence || nextSequence;
    if (nextSequence >= maxSequence) {
      nextSequence = 0;
    }

    const { error } = await supabaseAdmin
      .from('trip_sessions')
      .update({ last_stop_sequence: nextSequence })
      .eq('id', session.id);
    if (error) throw error;

    return { success: true, last_stop_sequence: nextSequence };
  }

  static async getDriverAssignmentWithStops(driverId: string) {
    const assignment = await ProductionAssignmentService.getDriverAssignment(driverId);
    if (!assignment) return null;

    // Active session (may be null until startTracking)
    const { data: session } = await supabaseAdmin
      .from('trip_sessions')
      .select('id, last_stop_sequence, shift_id')
      .eq('driver_id', driverId)
      .is('ended_at', null)
      .maybeSingle();

    const lastSeq = session?.last_stop_sequence || 0;
    let shiftName: string | null = null;
    if (session?.shift_id) {
      const { data: shift } = await supabaseAdmin
        .from('shifts')
        .select('name')
        .eq('id', session.shift_id)
        .maybeSingle();
      shiftName = shift?.name || null;
    }

    const { data: stops, error } = await supabaseAdmin
      .from('route_stops')
      .select('id, sequence, is_active, bus_stops:stop_id(name)')
      .eq('route_id', assignment.route_id)
      .eq('is_active', true)
      .order('sequence');
    if (error) throw error;

    const all = (stops || []).map((s: any) => ({ id: s.id, name: s.bus_stops?.name, sequence: s.sequence }));
    const completed = all.filter(s => s.sequence <= lastSeq);
    const remaining = all.filter(s => s.sequence > lastSeq);
    const nextStop = remaining[0] || null;

    return {
      route_id: assignment.route_id,
      bus_id: assignment.bus_id,
      shift_id: session?.shift_id || null,
      shift_name: shiftName,
      tracking_active: !!session,
      stops: { completed, next: nextStop, remaining }
    };
  }
}


