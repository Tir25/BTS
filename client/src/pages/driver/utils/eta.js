/**
 * ETA Calculation Utilities
 * Haversine formula for distance + speed-based time estimation
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
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
 * Calculate ETA based on current position, target, and speed
 * @param {object} currentPos - { lat, lng, speed } current position
 * @param {object} targetPos - { lat, lng } target position
 * @param {number} defaultSpeedKmh - Default speed if not moving (km/h)
 * @returns {string|null} Formatted ETA string or null
 */
export function calculateETA(currentPos, targetPos, defaultSpeedKmh = 25) {
    if (!currentPos?.lat || !currentPos?.lng) return null;
    if (!targetPos?.lat || !targetPos?.lng) return null;

    const distance = getDistance(
        currentPos.lat, currentPos.lng,
        targetPos.lat, targetPos.lng
    );

    // Use current speed or default (convert km/h to m/s)
    const speedMps = currentPos.speed && currentPos.speed > 1
        ? currentPos.speed
        : (defaultSpeedKmh * 1000 / 3600);

    const timeSeconds = distance / speedMps;

    // Format the result
    if (timeSeconds < 60) return '< 1 min';

    const minutes = Math.ceil(timeSeconds / 60);
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    return `${minutes} min`;
}

/**
 * Get ETA in minutes only (for numeric comparisons)
 * @returns {number|null} Minutes or null
 */
export function getETAMinutes(currentPos, targetPos, defaultSpeedKmh = 25) {
    if (!currentPos?.lat || !currentPos?.lng) return null;
    if (!targetPos?.lat || !targetPos?.lng) return null;

    const distance = getDistance(
        currentPos.lat, currentPos.lng,
        targetPos.lat, targetPos.lng
    );

    const speedMps = currentPos.speed && currentPos.speed > 1
        ? currentPos.speed
        : (defaultSpeedKmh * 1000 / 3600);

    return Math.ceil((distance / speedMps) / 60);
}

export default { getDistance, calculateETA, getETAMinutes };
