/**
 * User Stats Cards Component
 * Displays user count statistics by role
 */
import { Card, CardBody } from '@/components/ui';
import { Users, GraduationCap, Briefcase, Bus, Shield } from 'lucide-react';
import './UserStats.css';

/**
 * Role icon components mapping
 */
const ROLE_ICONS = {
    total: Users,
    student: GraduationCap,
    faculty: Briefcase,
    driver: Bus,
    admin: Shield
};

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
        { key: 'total', label: 'Total Users', color: 'blue' },
        { key: 'student', label: 'Students', color: 'purple' },
        { key: 'faculty', label: 'Faculty', color: 'green' },
        { key: 'driver', label: 'Drivers', color: 'orange' },
        { key: 'admin', label: 'Admins', color: 'red' }
    ];

    return (
        <div className="users-stats">
            {statItems.map(({ key, label, color }) => {
                const IconComponent = ROLE_ICONS[key];
                return (
                    <Card key={key} className={`stat-card stat-${color}`}>
                        <CardBody>
                            <span className="stat-icon">
                                <IconComponent size={20} />
                            </span>
                            <span className="stat-count">{stats[key] || 0}</span>
                            <span className="stat-label">{label}</span>
                        </CardBody>
                    </Card>
                );
            })}
        </div>
    );
}

export default UserStatsCards;

