/**
 * useScheduleData Hook
 * Manages loading and CRUD operations for schedule-related data
 * Follows single responsibility - only handles schedule data state
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    driversService,
    busesService,
    routesService,
    shiftsService,
    schedulesService
} from '@/services/database';

/**
 * Custom hook for schedule page data management
 * @returns {Object} Schedule data and operations
 */
export function useScheduleData() {
    const [drivers, setDrivers] = useState([]);
    const [buses, setBuses] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load all data on mount
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [driversData, busesData, routesData, shiftsData, schedulesData] = await Promise.all([
                driversService.getAll(),
                busesService.getAll(),
                routesService.getAll(),
                shiftsService.getAll(),
                schedulesService.getAll()
            ]);
            setDrivers(driversData);
            setBuses(busesData);
            setRoutes(routesData);
            setShifts(shiftsData);
            setSchedules(schedulesData);
        } catch (err) {
            setError('Failed to load schedule data');
            console.error('Schedule data load error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Check if required data exists
    const hasRequiredData = useMemo(() =>
        drivers.length > 0 && buses.length > 0 && shifts.length > 0,
        [drivers.length, buses.length, shifts.length]
    );

    // CRUD operations
    const createSchedule = async (data) => {
        const newSchedule = await schedulesService.create(data);
        setSchedules(prev => [newSchedule, ...prev]);
        return newSchedule;
    };

    const updateSchedule = async (id, data) => {
        const updated = await schedulesService.update(id, data);
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
        return updated;
    };

    const deleteSchedule = async (id) => {
        await schedulesService.delete(id);
        setSchedules(prev => prev.filter(s => s.id !== id));
    };

    // Conflict detection
    const checkConflicts = useCallback((newSchedule, excludeId = null) => {
        const dateSchedules = schedules.filter(s =>
            s.date === newSchedule.date && s.id !== excludeId
        );
        const conflicts = [];

        for (const existing of dateSchedules) {
            if (existing.driverId === newSchedule.driverId && existing.shiftId === newSchedule.shiftId) {
                conflicts.push({ type: 'driver', message: 'Driver already assigned to this shift' });
            }
            if (existing.busId === newSchedule.busId && existing.shiftId === newSchedule.shiftId) {
                conflicts.push({ type: 'bus', message: 'Bus already assigned to this shift' });
            }
        }
        return conflicts;
    }, [schedules]);

    return {
        // Data
        drivers,
        buses,
        routes,
        shifts,
        schedules,
        // State
        loading,
        error,
        hasRequiredData,
        // Operations
        createSchedule,
        updateSchedule,
        deleteSchedule,
        checkConflicts,
        refresh: loadData
    };
}

export default useScheduleData;
