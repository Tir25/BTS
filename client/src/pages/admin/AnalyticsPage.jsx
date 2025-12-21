import { useState, useEffect } from 'react';
import { tripHistoryService } from '@/services/tripHistory';
import { driversService, busesService, routesService } from '@/services/database';
import { Card, CardBody, Button } from '@/components/ui';
import './AnalyticsPage.css';

/**
 * Admin Analytics Page
 * Displays trip history and usage statistics
 */
export function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [dailyStats, setDailyStats] = useState(null);
    const [weeklyData, setWeeklyData] = useState([]);
    const [recentTrips, setRecentTrips] = useState([]);
    const [totals, setTotals] = useState({ drivers: 0, buses: 0, routes: 0 });

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);

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

            // Load trip data
            const [stats, weekly, trips] = await Promise.all([
                tripHistoryService.getDailyStats(),
                tripHistoryService.getWeeklySummary(),
                tripHistoryService.getTripHistory({ limit: 10 })
            ]);

            setDailyStats(stats);
            setWeeklyData(weekly);
            setRecentTrips(trips);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading-state">Loading analytics...</div>;
    }

    return (
        <div className="analytics-page">
            <header className="page-header">
                <h2>📊 Analytics & Reports</h2>
                <Button onClick={loadAnalytics}>↻ Refresh</Button>
            </header>

            {/* Quick Stats */}
            <div className="stats-grid">
                <StatCard
                    icon="👥"
                    label="Total Drivers"
                    value={totals.drivers}
                    color="blue"
                />
                <StatCard
                    icon="🚌"
                    label="Total Buses"
                    value={totals.buses}
                    color="green"
                />
                <StatCard
                    icon="🗺️"
                    label="Total Routes"
                    value={totals.routes}
                    color="purple"
                />
                <StatCard
                    icon="📍"
                    label="Trips Today"
                    value={dailyStats?.checkIns || 0}
                    color="orange"
                />
            </div>

            {/* Today's Summary */}
            <Card className="today-card">
                <CardBody>
                    <h3>📅 Today's Activity</h3>
                    <div className="activity-stats">
                        <div className="stat-item">
                            <span className="stat-value">{dailyStats?.checkIns || 0}</span>
                            <span className="stat-label">Check-ins</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{dailyStats?.checkOuts || 0}</span>
                            <span className="stat-label">Check-outs</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{dailyStats?.uniqueDrivers || 0}</span>
                            <span className="stat-label">Active Drivers</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{dailyStats?.uniqueRoutes || 0}</span>
                            <span className="stat-label">Routes Used</span>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Weekly Chart */}
            <Card className="chart-card">
                <CardBody>
                    <h3>📈 Weekly Overview</h3>
                    <div className="weekly-chart">
                        {weeklyData.map((day, idx) => (
                            <div key={idx} className="chart-bar-container">
                                <div
                                    className="chart-bar"
                                    style={{ height: `${Math.max(10, (day.checkIns / Math.max(1, ...weeklyData.map(d => d.checkIns))) * 100)}%` }}
                                >
                                    <span className="bar-value">{day.checkIns}</span>
                                </div>
                                <span className="bar-label">
                                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>

            {/* Recent Activity */}
            <Card className="history-card">
                <CardBody>
                    <h3>🕐 Recent Trip Activity</h3>
                    {recentTrips.length === 0 ? (
                        <p className="no-data">No trip history yet. Trip events will appear here when drivers check in/out.</p>
                    ) : (
                        <div className="history-list">
                            {recentTrips.map(trip => (
                                <div key={trip.id} className="history-item">
                                    <span className={`event-icon ${trip.eventType}`}>
                                        {trip.eventType === 'check_in' ? '🟢' : '🔴'}
                                    </span>
                                    <div className="event-info">
                                        <div className="event-driver">{trip.driverName}</div>
                                        <div className="event-details">
                                            {trip.eventType === 'check_in' ? 'Checked in' : 'Checked out'}
                                            {trip.routeName && ` • ${trip.routeName}`}
                                        </div>
                                    </div>
                                    <div className="event-time">
                                        {formatTime(trip.timestamp)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <Card className={`stat-card stat-${color}`}>
            <CardBody>
                <div className="stat-icon">{icon}</div>
                <div className="stat-content">
                    <div className="stat-value">{value}</div>
                    <div className="stat-label">{label}</div>
                </div>
            </CardBody>
        </Card>
    );
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
}

export default AnalyticsPage;
