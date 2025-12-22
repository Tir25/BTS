/**
 * StatCard Component - Reusable statistics display card
 * Used in AdminDashboard and AnalyticsPage
 */
import { Card, CardBody } from '@/components/ui';
import './StatCard.css';

export function StatCard({ icon, label, value, color, trend }) {
    return (
        <Card className="stat-card" style={{ '--stat-color': color }}>
            <CardBody>
                <div className="stat-icon">{icon}</div>
                <div className="stat-content">
                    <div className="stat-value">{value}</div>
                    <div className="stat-label">{label}</div>
                    {trend && (
                        <div className={`stat-trend ${trend > 0 ? 'up' : 'down'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}

export default StatCard;
