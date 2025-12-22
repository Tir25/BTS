/**
 * useRoutes Hook
 * Fetches route data from Firestore
 * Single responsibility: Load and cache route information
 */
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';

/**
 * Load routes from Firestore
 * @returns {Object} { routes, loading, error, refresh }
 */
export function useRoutes() {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadRoutes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const routesRef = collection(db, 'routes');
            const snapshot = await getDocs(routesRef);
            const routesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setRoutes(routesData);
        } catch (err) {
            console.error('Failed to load routes:', err);
            setError('Failed to load routes. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRoutes();
    }, [loadRoutes]);

    // Get active routes only
    const activeRoutes = routes.filter(r => r.isActive);

    // Helper to find route by ID
    const getRouteById = useCallback((routeId) => {
        return routes.find(r => r.id === routeId) || null;
    }, [routes]);

    return {
        routes,
        activeRoutes,
        loading,
        error,
        refresh: loadRoutes,
        getRouteById
    };
}

export default useRoutes;
