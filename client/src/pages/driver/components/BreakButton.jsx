/**
 * BreakButton Component
 * Allows driver to pause/resume tracking without full checkout
 * Single responsibility: Handle break/resume UI
 */
import { Button } from '@/components/ui';
import { Play, Pause } from 'lucide-react';

export function BreakButton({ isPaused, loading, onPause, onResume }) {
    if (isPaused) {
        return (
            <Button
                fullWidth
                variant="secondary"
                className="resume-btn"
                onClick={onResume}
                loading={loading}
            >
                <Play size={16} /> Resume Tracking
            </Button>
        );
    }

    return (
        <Button
            fullWidth
            variant="secondary"
            className="break-btn"
            onClick={onPause}
            loading={loading}
        >
            <Pause size={16} /> Take a Break
        </Button>
    );
}

export default BreakButton;

