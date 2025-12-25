/**
 * WeeklyChart Component
 * Bar chart visualization for weekly trip data
 * Single responsibility: Render weekly statistics chart
 */
import { Card, CardBody } from '@/components/ui';
import { TrendingUp } from 'lucide-react';

export function WeeklyChart({ weeklyData }) {
    if (!weeklyData || weeklyData.length === 0) {
        return (
            <Card className="chart-card">
                <CardBody>
                    <h3><TrendingUp size={20} /> Weekly Overview</h3>
                    <p className="no-data">No weekly data available</p>
                </CardBody>
            </Card>
        );
    }

    const maxCheckIns = Math.max(1, ...weeklyData.map(d => d.checkIns));

    return (
        <Card className="chart-card">
            <CardBody>
                <h3><TrendingUp size={20} /> Weekly Overview</h3>
                <div className="weekly-chart">
                    {weeklyData.map((day, idx) => (
                        <div key={idx} className="chart-bar-container">
                            <div
                                className="chart-bar"
                                style={{
                                    height: `${Math.max(10, (day.checkIns / maxCheckIns) * 100)}%`
                                }}
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
    );
}

export default WeeklyChart;

