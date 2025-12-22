/**
 * useDriverSchedule Hook
 * Fetches and manages today's assigned schedule and driver status
 * Refactored: Uses scheduleHelper for fetch logic (DRY)
 */
import { useState, useEffect, useCallback } from 'react';
import { ref, set, onValue } from 'firebase/database';
import { realtimeDb } from '@/services/firebase';
import { fetchScheduleData } from '../utils/scheduleHelper';

export function useDriverSchedule(userId) {
    const [assignedSchedule, setAssignedSchedule] = useState(null);
    const [isOnDuty, setIsOnDuty] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch today's assigned schedule
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchSchedule = async () => {
            try {
                setLoading(true);
                const scheduleData = await fetchScheduleData(userId);
                setAssignedSchedule(scheduleData);
            } catch (err) {
                console.error('Failed to fetch schedule:', err);
                setError('Failed to load schedule');
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, [userId]);

    // Listen to driver status changes
    useEffect(() => {
        if (!userId) return;

        const statusRef = ref(realtimeDb, `driverStatus/${userId}`);
        const unsubscribe = onValue(statusRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setIsOnDuty(data.isOnDuty || false);
            }
        });

        return () => unsubscribe();
    }, [userId]);

    // Check in - start duty
    const checkIn = async (scheduleId = null) => {
        if (!userId) return false;

        try {
            const statusRef = ref(realtimeDb, `driverStatus/${userId}`);
            await set(statusRef, {
                isOnDuty: true,
                checkedInAt: Date.now(),
                driverId: userId,
                scheduleId: scheduleId || assignedSchedule?.id || null
            });
            setIsOnDuty(true);
            return true;
        } catch (err) {
            console.error('Check-in failed:', err);
            return false;
        }
    };

    // Check out - end duty
    const checkOut = async () => {
        if (!userId) return false;

        try {
            const statusRef = ref(realtimeDb, `driverStatus/${userId}`);
            await set(statusRef, {
                isOnDuty: false,
                checkedOutAt: Date.now(),
                driverId: userId
            });
            setIsOnDuty(false);
            return true;
        } catch (err) {
            console.error('Check-out failed:', err);
            return false;
        }
    };

    // Refetch schedule (for pull-to-refresh) - uses shared helper
    const refetch = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        try {
            const scheduleData = await fetchScheduleData(userId);
            setAssignedSchedule(scheduleData);
        } catch (err) {
            console.error('Failed to refetch schedule:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    return {
        assignedSchedule,
        isOnDuty,
        loading,
        error,
        checkIn,
        checkOut,
        refetch
    };
}

export default useDriverSchedule;
