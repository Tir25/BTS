/**
 * StatusCard Component
 * Displays driver on/off duty status and greeting
 * Single responsibility: Show driver status
 */
import { Card, CardBody } from '@/components/ui';

export function StatusCard({ isOnDuty, isPaused, userName }) {
    const getStatus = () => {
        if (!isOnDuty) return { text: 'Off Duty', className: 'inactive' };
        if (isPaused) return { text: 'On Break', className: 'paused' };
        return { text: 'On Duty', className: 'active' };
    };

    const status = getStatus();

    return (
        <Card className="status-card">
            <CardBody>
                <div className="status-indicator">
                    <span className={`status-dot ${status.className}`} />
                    <span>{status.text}</span>
                </div>
                <h2>Welcome, {userName || 'Driver'}</h2>
            </CardBody>
        </Card>
    );
}

export default StatusCard;
