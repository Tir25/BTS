/**
 * InfoCard Component
 * Displays info when no schedule is assigned
 * Single responsibility: Show fallback info
 */
import { Card, CardBody } from '@/components/ui';

export function InfoCard({ isOnDuty }) {
    return (
        <Card className="info-card">
            <CardBody>
                <h3>Today's Info</h3>
                <p className="text-muted">
                    {isOnDuty
                        ? 'Your location is being shared with students in real-time.'
                        : 'No schedule assigned for today. Check in to start tracking.'}
                </p>
            </CardBody>
        </Card>
    );
}

export default InfoCard;
