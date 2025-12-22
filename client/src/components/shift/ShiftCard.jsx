/**
 * ShiftCard Component - Displays individual shift information
 * Single responsibility: Render shift card with actions
 */
import { Button, Card, CardBody } from '@/components/ui';

const SHIFT_ICONS = {
    morning: '🌅',
    noon: '☀️',
    evening: '🌆',
    night: '🌙'
};

export function ShiftCard({ shift, onEdit, onDelete }) {
    const icon = SHIFT_ICONS[shift.name?.toLowerCase()] || '⏰';

    return (
        <Card className="driver-card" hoverable>
            <CardBody>
                <div className="driver-info">
                    <div className="driver-avatar" style={{ background: 'var(--color-accent-warning)' }}>
                        {icon}
                    </div>
                    <div className="driver-details">
                        <h4 style={{ textTransform: 'capitalize' }}>{shift.name}</h4>
                        <p className="text-muted">
                            {shift.startTime} - {shift.endTime}
                        </p>
                        {shift.description && (
                            <p className="text-muted license">{shift.description}</p>
                        )}
                    </div>
                </div>
                <div className="driver-actions">
                    <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={onDelete}>Delete</Button>
                </div>
            </CardBody>
        </Card>
    );
}

export default ShiftCard;
