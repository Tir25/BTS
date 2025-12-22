/**
 * DashboardHome Component
 * Main admin dashboard landing page with real-time statistics
 * Single responsibility: Display dashboard overview with stats
 */
import { useDashboardStats } from '@/hooks';
import { StatCard } from '@/components/admin';
import './DashboardHome.css';

export function DashboardHome() {
    const { stats, loading, error, refresh } = useDashboardStats();

    if (loading) {
        return <div className="loading-state">Loading dashboard...</div>;
    }

    if (error) {
        return (
            <div className="error-state">
                <p>{error}</p>
                <button onClick={refresh}>Try Again</button>
            </div>
        );
    }

    return (
        <div className="dashboard-home">
            <header className="dashboard-header">
                <h1>Admin Dashboard</h1>
                <p className="text-muted">Welcome to UniTrack admin panel</p>
            </header>

            <div className="stats-grid">
                <StatCard
                    value={stats.buses}
                    label="Active Buses"
                    color="blue"
                    icon="🚌"
                />
                <StatCard
                    value={stats.drivers}
                    label="Drivers"
                    color="green"
                    icon="👤"
                />
                <StatCard
                    value={stats.routes}
                    label="Routes"
                    color="purple"
                    icon="🗺️"
                />
                <StatCard
                    value={stats.users}
                    label="Users"
                    color="orange"
                    icon="👥"
                />
            </div>
        </div>
    );
}

export default DashboardHome;
