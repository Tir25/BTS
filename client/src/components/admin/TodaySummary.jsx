/**
 * TodaySummary Component
 * Displays today's activity statistics summary
 * Single responsibility: Render today's stats
 */
import { Card, CardBody } from '@/components/ui';
import { CalendarDays } from 'lucide-react';

export function TodaySummary({ dailyStats }) {
    return (
        <Card className="today-card">
            <CardBody>
                <h3><CalendarDays size={20} /> Today's Activity</h3>
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
    );
}

export default TodaySummary;

