/**
 * BusCard Component - Displays individual bus information
 * Single responsibility: Render bus card with actions
 */
import { Button, Card, CardBody } from '@/components/ui';

export function BusCard({ bus, onEdit, onDelete }) {
    return (
        <Card className="driver-card" hoverable>
            <CardBody>
                <div className="driver-info">
                    <div className="driver-avatar" style={{ background: 'var(--gradient-success)' }}>
                        🚌
                    </div>
                    <div className="driver-details">
                        <h4>{bus.number}</h4>
                        <p className="text-muted">{bus.licensePlate}</p>
                        <p className="text-muted license">
                            Capacity: {bus.capacity} seats
                        </p>
                    </div>
                </div>
                <div className="driver-status">
                    <span className={`status-badge ${bus.status || 'inactive'}`}>
                        {bus.status || 'Inactive'}
                    </span>
                </div>
                <div className="driver-actions">
                    <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={onDelete}>Delete</Button>
                </div>
            </CardBody>
        </Card>
    );
}

export default BusCard;
