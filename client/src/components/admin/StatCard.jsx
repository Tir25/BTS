/**
 * StatCard Component - Reusable statistics display card
 * Supports both Lucide icon components and emoji strings
 * Used in AdminDashboard and AnalyticsPage
 */
import { Card, CardBody } from '@/components/ui';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './StatCard.css';

/**
 * @param {Object} props
 * @param {React.ComponentType} [props.Icon] - Lucide icon component (preferred)
 * @param {string} [props.icon] - Emoji string (legacy, deprecated)
 * @param {string} props.label - Stat label
 * @param {number|string} props.value - Stat value
 * @param {string} props.color - Color name (blue, green, purple, orange)
 * @param {number} [props.trend] - Percentage trend value
 */
export function StatCard({ Icon, icon, label, value, color, trend }) {
    return (
        <Card className={`stat-card stat-${color}`}>
            <CardBody>
                <div className="stat-icon">
                    {Icon ? <Icon size={28} /> : icon}
                </div>
                <div className="stat-content">
                    <div className="stat-value">{value}</div>
                    <div className="stat-label">{label}</div>
                    {trend !== undefined && trend !== null && (
                        <div className={`stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
                            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <span>{Math.abs(trend)}%</span>
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}

export default StatCard;
