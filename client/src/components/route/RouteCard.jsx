/**
 * RouteCard Component - Displays individual route information
 * Shows destination, direction, and stop count
 */
import { Button, Card, CardBody } from '@/components/ui';

// Direction labels
const DIRECTION_LABELS = {
    to_campus: { icon: '🏫', label: 'To Campus' },
    from_campus: { icon: '🏠', label: 'From Campus' },
    round_trip: { icon: '🔄', label: 'Round Trip' }
};

export function RouteCard({ route, onEdit, onDelete }) {
    const directionInfo = DIRECTION_LABELS[route.direction] || DIRECTION_LABELS.to_campus;

    return (
        <Card className="route-card" hoverable>
            <CardBody>
                <div className="route-info">
                    <div className="route-icon">🗺️</div>
                    <div className="route-details">
                        <h4>{route.name}</h4>
                        <p className="text-muted">{route.description || 'No description'}</p>
                        <div className="route-meta">
                            <span>📍 {route.stops?.length || 0} stops</span>
                            {route.estimatedTime && <span>⏱️ {route.estimatedTime} min</span>}
                        </div>
                    </div>
                </div>

                {/* Direction & Destination Info */}
                <div className="route-destination">
                    <span className="direction-badge">
                        {directionInfo.icon} {directionInfo.label}
                    </span>
                    {route.destinationName && (
                        <span className="destination-name">
                            🔴 {route.destinationName}
                        </span>
                    )}
                </div>

                <div className="route-status">
                    <span className={`status-badge ${route.isActive ? 'active' : 'inactive'}`}>
                        {route.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div className="route-actions">
                    <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={onDelete}>Delete</Button>
                </div>
            </CardBody>
        </Card>
    );
}

export default RouteCard;
