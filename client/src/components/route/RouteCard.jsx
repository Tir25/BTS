/**
 * RouteCard Component - Displays individual route information
 * Single responsibility: Render route card with actions
 */
import { Button, Card, CardBody } from '@/components/ui';

export function RouteCard({ route, onEdit, onDelete }) {
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
