/**
 * ShiftCard Component - Displays individual shift information
 * Single responsibility: Render shift card with actions
 */
import { Button, Card, CardBody } from '@/components/ui';
import { Sunrise, Sun, Sunset, Moon, Clock } from 'lucide-react';

/**
 * Shift time icon components mapping
 */
const SHIFT_ICONS = {
    morning: Sunrise,
    noon: Sun,
    evening: Sunset,
    night: Moon
};

export function ShiftCard({ shift, onEdit, onDelete }) {
    const IconComponent = SHIFT_ICONS[shift.name?.toLowerCase()] || Clock;

    return (
        <Card className="driver-card" hoverable>
            <CardBody>
                <div className="driver-info">
                    <div className="driver-avatar" style={{ background: 'var(--color-accent-warning)' }}>
                        <IconComponent size={24} />
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

