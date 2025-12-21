/**
 * User Stats Cards Component
 * Displays user count statistics by role
 */
import { Card, CardBody } from '@/components/ui';
import './UserStats.css';

/**
 * Stats row showing counts by role
 */
export function UserStatsCards({ stats, loading }) {
    if (loading) {
        return (
            <div className="users-stats">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="stat-card skeleton">
                        <CardBody>
                            <div className="stat-count">-</div>
                            <div className="stat-label">Loading...</div>
                        </CardBody>
                    </Card>
                ))}
            </div>
        );
    }

    const statItems = [
        { key: 'total', label: 'Total Users', color: 'blue', icon: '👥' },
        { key: 'student', label: 'Students', color: 'purple', icon: '🎓' },
        { key: 'faculty', label: 'Faculty', color: 'green', icon: '👨‍🏫' },
        { key: 'driver', label: 'Drivers', color: 'orange', icon: '🚌' }
    ];

    return (
        <div className="users-stats">
            {statItems.map(({ key, label, color, icon }) => (
                <Card key={key} className={`stat-card stat-${color}`}>
                    <CardBody>
                        <span className="stat-icon">{icon}</span>
                        <span className="stat-count">{stats[key] || 0}</span>
                        <span className="stat-label">{label}</span>
                    </CardBody>
                </Card>
            ))}
        </div>
    );
}

export default UserStatsCards;
