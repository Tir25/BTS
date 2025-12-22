/**
 * useBusLocations Hook
 * Real-time subscription to Firebase RTDB bus locations
 * Single responsibility: Manage live bus location data
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, onDisconnect } from 'firebase/database';
import { realtimeDb } from '@/services/firebase';

/**
 * Subscribe to live bus locations from Firebase RTDB
 * @returns {Object} { buses, loading, error, isConnected, refresh }
 */
export function useBusLocations() {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(true);

    const unsubscribeRef = useRef(null);

    // Subscribe to bus locations
    const subscribe = useCallback(() => {
        setLoading(true);
        setError(null);

        try {
            const locationsRef = ref(realtimeDb, 'busLocations');

            unsubscribeRef.current = onValue(
                locationsRef,
                (snapshot) => {
                    setLoading(false);
                    setIsConnected(true);

                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        const activeBuses = Object.entries(data)
                            .filter(([_, bus]) => bus.isActive)
                            .map(([id, bus]) => ({
                                id,
                                ...bus,
                                // Ensure numeric values are valid
                                speed: typeof bus.speed === 'number' ? bus.speed : 0,
                                heading: typeof bus.heading === 'number' ? bus.heading : 0
                            }));
                        setBuses(activeBuses);
                    } else {
                        setBuses([]);
                    }
                },
                (err) => {
                    console.error('Bus locations subscription error:', err);
                    setError('Failed to load bus locations. Please try again.');
                    setLoading(false);
                    setIsConnected(false);
                }
            );
        } catch (err) {
            console.error('Failed to setup bus locations subscription:', err);
            setError('Unable to connect to tracking service.');
            setLoading(false);
            setIsConnected(false);
        }
    }, []);

    // Monitor connection status
    useEffect(() => {
        const connectedRef = ref(realtimeDb, '.info/connected');
        const unsubConnect = onValue(connectedRef, (snapshot) => {
            setIsConnected(snapshot.val() === true);
        });

        return () => unsubConnect();
    }, []);

    // Setup subscription on mount
    useEffect(() => {
        subscribe();

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, [subscribe]);

    // Manual refresh function
    const refresh = useCallback(() => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }
        subscribe();
    }, [subscribe]);

    return {
        buses,
        loading,
        error,
        isConnected,
        refresh
    };
}

export default useBusLocations;
