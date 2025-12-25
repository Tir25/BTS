/**
 * RecentActivity Component
 * Displays recent trip activity history
 * Single responsibility: Render trip activity list
 */
import { Card, CardBody } from '@/components/ui';
import { Clock, CircleCheck, CircleX } from 'lucide-react';

/**
 * Format timestamp to relative time
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted relative time
 */
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

export function RecentActivity({ trips }) {
    return (
        <Card className="history-card">
            <CardBody>
                <h3><Clock size={20} /> Recent Trip Activity</h3>
                {trips.length === 0 ? (
                    <p className="no-data">
                        No trip history yet. Trip events will appear here when drivers check in/out.
                    </p>
                ) : (
                    <div className="history-list">
                        {trips.map(trip => (
                            <div key={trip.id} className="history-item">
                                <span className={`event-icon ${trip.eventType}`}>
                                    {trip.eventType === 'check_in'
                                        ? <CircleCheck size={20} className="check-in-icon" />
                                        : <CircleX size={20} className="check-out-icon" />
                                    }
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
    );
}

export default RecentActivity;

