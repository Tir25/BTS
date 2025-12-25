/**
 * CheckInOutButton Component
 * Large check-in/out button for duty toggle
 * Single responsibility: Handle duty check-in/out UI
 */
import { Button } from '@/components/ui';
import { CircleCheck, CircleX } from 'lucide-react';

export function CheckInOutButton({ isOnDuty, checkInLoading, checkOutLoading, onCheckIn, onCheckOut }) {
    if (!isOnDuty) {
        return (
            <div className="action-section">
                <Button
                    fullWidth
                    className="check-in-btn"
                    onClick={onCheckIn}
                    loading={checkInLoading}
                >
                    <CircleCheck size={18} /> Check In & Start Shift
                </Button>
            </div>
        );
    }

    return (
        <div className="action-section">
            <Button
                fullWidth
                variant="danger"
                className="check-out-btn"
                onClick={onCheckOut}
                loading={checkOutLoading}
            >
                <CircleX size={18} /> Check Out & End Shift
            </Button>
        </div>
    );
}

export default CheckInOutButton;

