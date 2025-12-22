/**
 * useUserLocation Hook
 * Get user's current location with permission handling
 * Single responsibility: User geolocation management
 */
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook that provides user's current location
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to track location (default: true)
 * @param {boolean} options.watch - Watch for continuous updates (default: false)
 * @returns {Object} { location, error, loading, refresh }
 */
export function useUserLocation({ enabled = true, watch = false } = {}) {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const watchIdRef = useRef(null);

    // Get current position
    const getPosition = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                setLoading(false);
            },
            (err) => {
                handleError(err);
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000 // Accept 1 minute old position
            }
        );
    }, []);

    // Handle geolocation errors
    const handleError = (err) => {
        switch (err.code) {
            case 1: // PERMISSION_DENIED
                setError('Location permission denied');
                break;
            case 2: // POSITION_UNAVAILABLE
                setError('Location unavailable');
                break;
            case 3: // TIMEOUT
                setError('Location request timed out');
                break;
            default:
                setError('Failed to get location');
        }
    };

    // Watch position for continuous updates
    const startWatching = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported');
            return;
        }

        if (watchIdRef.current !== null) return; // Already watching

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                setError(null);
            },
            handleError,
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 5000
            }
        );
    }, []);

    // Stop watching
    const stopWatching = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, []);

    // Auto-start based on options
    useEffect(() => {
        if (!enabled) return;

        if (watch) {
            startWatching();
        } else {
            getPosition();
        }

        return () => stopWatching();
    }, [enabled, watch, getPosition, startWatching, stopWatching]);

    return {
        location,
        error,
        loading,
        refresh: getPosition
    };
}

export default useUserLocation;
