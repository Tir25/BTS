/**
 * RouteCard Component - Displays individual route information
 * Shows destination, direction, and stop count
 */
import { Button, Card, CardBody } from '@/components/ui';
import { School, Home, RefreshCw, Map, MapPin, Clock, Circle } from 'lucide-react';

// Direction icons mapping
const DIRECTION_ICONS = {
    to_campus: School,
    from_campus: Home,
    round_trip: RefreshCw
};

// Direction labels
const DIRECTION_LABELS = {
    to_campus: 'To Campus',
    from_campus: 'From Campus',
    round_trip: 'Round Trip'
};

export function RouteCard({ route, onEdit, onDelete }) {
    const DirectionIcon = DIRECTION_ICONS[route.direction] || School;
    const directionLabel = DIRECTION_LABELS[route.direction] || 'To Campus';

    return (
        <Card className="route-card" hoverable>
            <CardBody>
                <div className="route-info">
                    <div className="route-icon"><Map size={24} /></div>
                    <div className="route-details">
                        <h4>{route.name}</h4>
                        <p className="text-muted">{route.description || 'No description'}</p>
                        <div className="route-meta">
                            <span><MapPin size={14} /> {route.stops?.length || 0} stops</span>
                            {route.estimatedTime && <span><Clock size={14} /> {route.estimatedTime} min</span>}
                        </div>
                    </div>
                </div>

                {/* Direction & Destination Info */}
                <div className="route-destination">
                    <span className="direction-badge">
                        <DirectionIcon size={14} /> {directionLabel}
                    </span>
                    {route.destinationName && (
                        <span className="destination-name">
                            <Circle size={14} style={{ color: '#ef4444' }} /> {route.destinationName}
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

