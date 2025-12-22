/**
 * useAnalyticsData Hook
 * Fetches and manages analytics data with proper error handling
 * Single responsibility: Analytics data fetching
 */
import { useState, useEffect, useCallback } from 'react';
import { tripHistoryService } from '@/services/tripHistory';
import { driversService, busesService, routesService } from '@/services/database';

export function useAnalyticsData() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dailyStats, setDailyStats] = useState(null);
    const [weeklyData, setWeeklyData] = useState([]);
    const [recentTrips, setRecentTrips] = useState([]);
    const [totals, setTotals] = useState({ drivers: 0, buses: 0, routes: 0 });

    const loadAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Load totals
            const [drivers, buses, routes] = await Promise.all([
                driversService.getAll(),
                busesService.getAll(),
                routesService.getAll()
            ]);
            setTotals({
                drivers: drivers.length,
                buses: buses.length,
                routes: routes.length
            });

            // Load trip data - with graceful error handling for missing indexes
            try {
                const [stats, weekly, trips] = await Promise.all([
                    tripHistoryService.getDailyStats(),
                    tripHistoryService.getWeeklySummary(),
                    tripHistoryService.getTripHistory({ limit: 10 })
                ]);
                setDailyStats(stats);
                setWeeklyData(weekly);
                setRecentTrips(trips);
            } catch (tripErr) {
                // Log but don't fail entirely - Firebase index might be missing
                console.warn('Trip history load failed (missing index?):', tripErr);
                setDailyStats({ checkIns: 0, checkOuts: 0, uniqueDrivers: 0, uniqueRoutes: 0 });
                setWeeklyData([]);
                setRecentTrips([]);
            }
        } catch (err) {
            console.error('Failed to load analytics:', err);
            setError('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    return {
        loading,
        error,
        dailyStats,
        weeklyData,
        recentTrips,
        totals,
        refresh: loadAnalytics
    };
}

export default useAnalyticsData;
