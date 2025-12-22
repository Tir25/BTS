/**
 * Tracking Utility Functions
 * Shared helpers for ETA calculation, formatting, etc.
 * Single responsibility: Tracking-related calculations
 */

/**
 * Format speed from m/s to km/h string
 * @param {number} speedMs - Speed in meters per second
 * @returns {string} Formatted speed string
 */
export function formatSpeed(speedMs) {
    const speed = typeof speedMs === 'number' ? speedMs : 0;
    return `${(speed * 3.6).toFixed(1)} km/h`;
}

/**
 * Format timestamp to relative time ago
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Relative time string
 */
export function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';

    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Start latitude
 * @param {number} lng1 - Start longitude
 * @param {number} lat2 - End latitude
 * @param {number} lng2 - End longitude
 * @returns {number} Distance in meters
 */
export function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Calculate ETA based on distance and current speed
 * @param {Object} bus - Bus object with lat, lng, speed
 * @param {number} targetLat - Target latitude
 * @param {number} targetLng - Target longitude
 * @returns {string|null} ETA string or null if cannot calculate
 */
export function calculateETA(bus, targetLat, targetLng) {
    if (!bus?.lat || !bus?.lng || !targetLat || !targetLng) {
        return null;
    }

    const distance = getDistance(bus.lat, bus.lng, targetLat, targetLng);

    // Use current speed or default to 30 km/h (8.33 m/s)
    const speed = bus.speed && bus.speed > 1 ? bus.speed : 8.33;
    const timeSeconds = distance / speed;

    if (timeSeconds < 60) return '<1 min';

    const minutes = Math.ceil(timeSeconds / 60);

    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        return `${hours}h ${remainingMins}m`;
    }

    return `${minutes} min`;
}

/**
 * Default map center (Ahmedabad, India)
 */
export const DEFAULT_CENTER = [23.0225, 72.5714];

/**
 * Default zoom level
 */
export const DEFAULT_ZOOM = 13;
