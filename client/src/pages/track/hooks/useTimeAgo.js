/**
 * useTimeAgo Hook
 * Auto-refreshing relative time display
 * Single responsibility: Provide live-updating "X ago" strings
 */
import { useState, useEffect, useCallback } from 'react';

/**
 * Format timestamp to relative time ago string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Relative time string
 */
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';

    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 0) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

/**
 * Check if timestamp is stale (older than threshold)
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {number} thresholdMs - Stale threshold in milliseconds
 * @returns {boolean} True if stale
 */
export function isStale(timestamp, thresholdMs = 30000) {
    if (!timestamp) return true;
    return Date.now() - timestamp > thresholdMs;
}

/**
 * Hook that provides auto-refreshing time ago string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {number} refreshInterval - Refresh interval in ms (default: 10000)
 * @returns {Object} { timeAgo, isStale }
 */
export function useTimeAgo(timestamp, refreshInterval = 10000) {
    const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(timestamp));
    const [stale, setStale] = useState(() => isStale(timestamp));

    const update = useCallback(() => {
        setTimeAgo(formatTimeAgo(timestamp));
        setStale(isStale(timestamp));
    }, [timestamp]);

    // Update immediately when timestamp changes
    useEffect(() => {
        update();
    }, [update]);

    // Auto-refresh on interval
    useEffect(() => {
        const interval = setInterval(update, refreshInterval);
        return () => clearInterval(interval);
    }, [update, refreshInterval]);

    return { timeAgo, isStale: stale };
}

export default useTimeAgo;
