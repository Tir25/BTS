/**
 * StatsBar Component
 * Trust signals with key statistics
 * Single responsibility: Display app statistics
 */
import { Icon } from '@/components/ui';
import './StatsBar.css';

// Stats data - update with real numbers
const STATS = [
    { icon: 'bus', value: '50+', label: 'Active Buses' },
    { icon: 'signal', value: '5s', label: 'Update Interval' },
    { icon: 'mapPin', value: '200+', label: 'Stops Covered' },
    { icon: 'users', value: '1000+', label: 'Students Served' }
];

export function StatsBar() {
    return (
        <section className="stats-bar">
            <div className="stats-container">
                {STATS.map((stat, index) => (
                    <div key={stat.label} className="stat-item">
                        <Icon name={stat.icon} size="sm" className="stat-icon" />
                        <span className="stat-value">{stat.value}</span>
                        <span className="stat-label">{stat.label}</span>
                        {index < STATS.length - 1 && <span className="stat-divider" />}
                    </div>
                ))}
            </div>
        </section>
    );
}

export default StatsBar;
