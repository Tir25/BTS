/**
 * useDriverTracking Hook - Production Grade
 * Handles GPS tracking, offline queue, and location updates
 * 
 * Fixes applied:
 * - Uses refs for callback values (no stale closures)
 * - Properly handles pause mode
 * - Persists offline queue to localStorage
 * - Exposes GPS accuracy
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { ref, set } from 'firebase/database';
import { realtimeDb } from '@/services/firebase';

const OFFLINE_QUEUE_KEY = 'unitrack_offline_queue';

// Load persisted queue from localStorage
function loadPersistedQueue() {
    try {
        const saved = localStorage.getItem(OFFLINE_QUEUE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

// Persist queue to localStorage
function persistQueue(queue) {
    try {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.warn('Failed to persist offline queue:', e);
    }
}

export function useDriverTracking(userId, isOnDuty, assignedSchedule) {
    const [isTracking, setIsTracking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [queueCount, setQueueCount] = useState(0);

    const watchIdRef = useRef(null);
    const offlineQueue = useRef(loadPersistedQueue());

    // Refs for values used in callbacks (avoids stale closures)
    const isOfflineRef = useRef(isOffline);
    const isPausedRef = useRef(isPaused);
    const isOnDutyRef = useRef(isOnDuty);
    const userIdRef = useRef(userId);
    const scheduleRef = useRef(assignedSchedule);

    // Keep refs in sync
    useEffect(() => { isOfflineRef.current = isOffline; }, [isOffline]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { isOnDutyRef.current = isOnDuty; }, [isOnDuty]);
    useEffect(() => { userIdRef.current = userId; }, [userId]);
    useEffect(() => { scheduleRef.current = assignedSchedule; }, [assignedSchedule]);

    // Initialize queue count
    useEffect(() => {
        setQueueCount(offlineQueue.current.length);
    }, []);

    // Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            flushOfflineQueue();
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Flush offline queue when back online
    const flushOfflineQueue = async () => {
        if (offlineQueue.current.length === 0) return;

        const queue = [...offlineQueue.current];
        offlineQueue.current = [];
        persistQueue([]);
        setQueueCount(0);

        for (const update of queue) {
            try {
                const locationRef = ref(realtimeDb, `busLocations/${update.driverId}`);
                await set(locationRef, update);
            } catch (err) {
                console.error('Failed to flush queued update:', err);
                // Re-queue failed updates
                offlineQueue.current.push(update);
            }
        }

        if (offlineQueue.current.length > 0) {
            persistQueue(offlineQueue.current);
            setQueueCount(offlineQueue.current.length);
        }
    };

    // Send location update to Firebase
    const sendLocationUpdate = useCallback((coords) => {
        const currentUserId = userIdRef.current;
        const currentSchedule = scheduleRef.current;
        const currentIsOffline = isOfflineRef.current;
        const currentIsPaused = isPausedRef.current;
        const currentIsOnDuty = isOnDutyRef.current;

        if (!currentUserId || !currentIsOnDuty) return;

        const { latitude, longitude, heading, speed, accuracy } = coords;

        const locationUpdate = {
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
            speed: speed || 0,
            accuracy: accuracy || 0,
            driverId: currentUserId,
            routeId: currentSchedule?.routeId || null,
            routeName: currentSchedule?.route?.name || null,
            isActive: !currentIsPaused,
            isPaused: currentIsPaused,
            lastUpdated: Date.now()
        };

        if (currentIsOffline) {
            // Queue for later
            offlineQueue.current.push(locationUpdate);
            persistQueue(offlineQueue.current);
            setQueueCount(offlineQueue.current.length);
        } else if (!currentIsPaused) {
            // Send to Firebase only if not paused
            const locationRef = ref(realtimeDb, `busLocations/${currentUserId}`);
            set(locationRef, locationUpdate).catch(err => {
                console.error('Firebase write failed:', err);
            });
        }
    }, []);

    // Start GPS tracking
    const startTracking = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            return false;
        }

        // Clear any existing watch
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        const id = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, heading, speed, accuracy } = position.coords;

                // Always update local state for UI
                setLocation({
                    lat: latitude,
                    lng: longitude,
                    heading: heading || 0,
                    speed: speed || 0,
                    accuracy: accuracy || 0
                });
                setError(null);

                // Send to Firebase (respects pause state via refs)
                sendLocationUpdate(position.coords);
            },
            (err) => {
                // Enhanced error logging for debugging
                console.error('GPS Error:', {
                    code: err.code,
                    message: err.message,
                    PERMISSION_DENIED: err.PERMISSION_DENIED,
                    POSITION_UNAVAILABLE: err.POSITION_UNAVAILABLE,
                    TIMEOUT: err.TIMEOUT
                });

                switch (err.code) {
                    case 1: // PERMISSION_DENIED
                        setError('Location access denied. Please enable GPS in browser settings.');
                        break;
                    case 2: // POSITION_UNAVAILABLE
                        setError('Location unavailable. Check GPS signal or try on a mobile device.');
                        break;
                    case 3: // TIMEOUT
                        setError('Location request timed out. GPS will retry automatically.');
                        break;
                    default:
                        setError(`Unable to get location (error ${err.code}).`);
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 3000,      // Accept 3s old positions
                timeout: 15000         // Wait up to 15s
            }
        );

        watchIdRef.current = id;
        setIsTracking(true);
        setError(null);
        return true;
    }, [sendLocationUpdate]);

    // Stop GPS tracking
    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsTracking(false);
        setIsPaused(false);

        // Mark as inactive in Firebase
        const currentUserId = userIdRef.current;
        if (currentUserId) {
            const locationRef = ref(realtimeDb, `busLocations/${currentUserId}`);
            set(locationRef, {
                isActive: false,
                isPaused: false,
                lastUpdated: Date.now()
            }).catch(() => { });
        }
    }, []);

    // Pause tracking (keep GPS but mark as paused in Firebase)
    const pauseTracking = useCallback(() => {
        setIsPaused(true);

        const currentUserId = userIdRef.current;
        if (currentUserId && location) {
            const locationRef = ref(realtimeDb, `busLocations/${currentUserId}`);
            set(locationRef, {
                ...location,
                driverId: currentUserId,
                isActive: false,
                isPaused: true,
                lastUpdated: Date.now()
            }).catch(() => { });
        }
        return true;
    }, [location]);

    // Resume tracking
    const resumeTracking = useCallback(() => {
        setIsPaused(false);

        const currentUserId = userIdRef.current;
        const currentSchedule = scheduleRef.current;
        if (currentUserId && location) {
            const locationRef = ref(realtimeDb, `busLocations/${currentUserId}`);
            set(locationRef, {
                ...location,
                driverId: currentUserId,
                routeId: currentSchedule?.routeId || null,
                routeName: currentSchedule?.route?.name || null,
                isActive: true,
                isPaused: false,
                lastUpdated: Date.now()
            }).catch(() => { });
        }
        return true;
    }, [location]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return {
        isTracking,
        isPaused,
        location,
        error,
        isOffline,
        queueCount,
        startTracking,
        stopTracking,
        pauseTracking,
        resumeTracking
    };
}

export default useDriverTracking;
