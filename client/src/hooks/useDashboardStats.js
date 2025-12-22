/**
 * useDashboardStats Hook
 * Fetches and manages dashboard statistics for the admin home page
 * Single responsibility: Dashboard metrics data fetching
 */
import { useState, useEffect, useCallback } from 'react';
import { busesService, routesService, driversService } from '@/services/database';
import { usersService } from '@/services/users';

/**
 * Custom hook for fetching dashboard statistics
 * @returns {Object} Stats data and loading/error states
 */
export function useDashboardStats() {
    const [stats, setStats] = useState({
        buses: 0,
        drivers: 0,
        routes: 0,
        users: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [buses, drivers, routes, userStats] = await Promise.all([
                busesService.getAll(),
                driversService.getAll(),
                routesService.getAll(),
                usersService.getStats()
            ]);

            setStats({
                buses: buses.length,
                drivers: drivers.length,
                routes: routes.length,
                users: userStats.total
            });
        } catch (err) {
            console.error('Failed to load dashboard stats:', err);
            setError('Failed to load statistics');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    return {
        stats,
        loading,
        error,
        refresh: loadStats
    };
}

export default useDashboardStats;
