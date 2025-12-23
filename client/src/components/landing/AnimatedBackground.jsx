/**
 * AnimatedBackground Component
 * Subtle floating gradient blobs for premium visual effect
 * Uses CSS animations for performance
 */
import './AnimatedBackground.css';

export function AnimatedBackground() {
    return (
        <div className="animated-bg" aria-hidden="true">
            <div className="blob blob-1" />
            <div className="blob blob-2" />
            <div className="blob blob-3" />
        </div>
    );
}

export default AnimatedBackground;
