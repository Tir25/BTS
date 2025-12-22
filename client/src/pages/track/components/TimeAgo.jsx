/**
 * TimeAgo Component
 * Auto-refreshing relative time display with stale indicator
 * Single responsibility: Display live-updating time ago text
 */
import { useTimeAgo } from '../hooks/useTimeAgo';
import './TimeAgo.css';

/**
 * @param {Object} props
 * @param {number} props.timestamp - Unix timestamp in milliseconds
 * @param {number} props.refreshInterval - Refresh interval in ms (default: 10000)
 * @param {boolean} props.showStaleWarning - Show warning when stale (default: true)
 * @param {number} props.staleThreshold - Stale threshold in ms (default: 30000)
 */
export function TimeAgo({
    timestamp,
    refreshInterval = 10000,
    showStaleWarning = true,
    staleThreshold = 30000
}) {
    const { timeAgo, isStale } = useTimeAgo(timestamp, refreshInterval);

    return (
        <span className={`time-ago ${isStale && showStaleWarning ? 'stale' : ''}`}>
            {isStale && showStaleWarning && <span className="stale-dot" />}
            {timeAgo}
        </span>
    );
}

export default TimeAgo;
