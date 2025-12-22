/**
 * DriverCard Component - Displays individual driver information
 * Single responsibility: Render driver card with actions
 */
import { Button, Card, CardBody } from '@/components/ui';

export function DriverCard({ driver, onEdit, onDelete, onResetPassword }) {
    return (
        <Card className="driver-card" hoverable>
            <CardBody>
                <div className="driver-info">
                    <div className="driver-avatar">
                        {driver.name?.charAt(0) || '?'}
                    </div>
                    <div className="driver-details">
                        <h4>{driver.name}</h4>
                        <p className="text-muted">{driver.phone}</p>
                        <p className="text-muted license">
                            License: {driver.licenseNumber}
                        </p>
                    </div>
                </div>
                <div className="driver-status">
                    <span className={`status-badge ${driver.status || 'inactive'}`}>
                        {driver.status || 'Inactive'}
                    </span>
                </div>
                <div className="driver-actions">
                    <Button variant="ghost" size="sm" onClick={onEdit}>
                        Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onDelete}>
                        Delete
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
}

export default DriverCard;
