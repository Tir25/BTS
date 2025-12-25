/**
 * Admin Analytics Page
 * Displays trip history and usage statistics
 * Single responsibility: Compose analytics view from modular components
 */
import { Button } from '@/components/ui';
import { useAnalyticsData } from '@/hooks';
import { StatCard, TodaySummary, WeeklyChart, RecentActivity } from '@/components/admin';
import { Users, Bus, Map, MapPin, BarChart3, RefreshCw } from 'lucide-react';
import './AnalyticsPage.css';

export function AnalyticsPage() {
    const {
        loading,
        error,
        dailyStats,
        weeklyData,
        recentTrips,
        totals,
        refresh
    } = useAnalyticsData();

    if (loading) {
        return <div className="loading-state">Loading analytics...</div>;
    }

    if (error) {
        return (
            <div className="error-state">
                <p>{error}</p>
                <Button onClick={refresh}>Try Again</Button>
            </div>
        );
    }

    return (
        <div className="analytics-page">
            <header className="page-header">
                <h2><BarChart3 size={24} /> Analytics & Reports</h2>
                <Button onClick={refresh}><RefreshCw size={16} /> Refresh</Button>
            </header>

            {/* Quick Stats */}
            <div className="stats-grid">
                <StatCard
                    Icon={Users}
                    label="Total Drivers"
                    value={totals.drivers}
                    color="blue"
                />
                <StatCard
                    Icon={Bus}
                    label="Total Buses"
                    value={totals.buses}
                    color="green"
                />
                <StatCard
                    Icon={Map}
                    label="Total Routes"
                    value={totals.routes}
                    color="purple"
                />
                <StatCard
                    Icon={MapPin}
                    label="Trips Today"
                    value={dailyStats?.checkIns || 0}
                    color="orange"
                />
            </div>

            {/* Today's Summary */}
            <TodaySummary dailyStats={dailyStats} />

            {/* Weekly Chart */}
            <WeeklyChart weeklyData={weeklyData} />

            {/* Recent Activity */}
            <RecentActivity trips={recentTrips} />
        </div>
    );
}

export default AnalyticsPage;

