"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRouteData = exports.validateRouteName = exports.validateBusNumber = exports.validatePassword = exports.validateEmail = exports.validateLocationData = void 0;
const lastValidLocations = new Map();
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
const validateLocationData = (data) => {
    if (!data.driverId || typeof data.driverId !== 'string') {
        return 'Driver ID is required and must be a string';
    }
    if (data.driverId.trim().length === 0) {
        return 'Driver ID cannot be empty';
    }
    if (typeof data.latitude !== 'number' || isNaN(data.latitude) || !isFinite(data.latitude)) {
        return 'Latitude must be a valid finite number';
    }
    if (data.latitude < -90 || data.latitude > 90) {
        return 'Latitude must be between -90 and 90 degrees';
    }
    if (typeof data.longitude !== 'number' || isNaN(data.longitude) || !isFinite(data.longitude)) {
        return 'Longitude must be a valid finite number';
    }
    if (data.longitude < -180 || data.longitude > 180) {
        return 'Longitude must be between -180 and 180 degrees';
    }
    if (data.latitude === 0 && data.longitude === 0) {
        return 'Invalid coordinates (0, 0) - Null Island';
    }
    const invalidPatterns = [
        [999, 999],
        [-999, -999],
        [999.999, 999.999],
    ];
    for (const [invalidLat, invalidLng] of invalidPatterns) {
        if (Math.abs(data.latitude - invalidLat) < 0.001 &&
            Math.abs(data.longitude - invalidLng) < 0.001) {
            return `Invalid coordinates detected (${data.latitude}, ${data.longitude})`;
        }
    }
    if (!data.timestamp || typeof data.timestamp !== 'string') {
        return 'Timestamp is required and must be a string';
    }
    const timestamp = new Date(data.timestamp);
    if (isNaN(timestamp.getTime())) {
        return 'Timestamp must be a valid ISO date string';
    }
    const now = new Date();
    const timeDiff = timestamp.getTime() - now.getTime();
    if (timeDiff > 60000) {
        return 'Timestamp cannot be more than 1 minute in the future';
    }
    if (timeDiff < -300000) {
        return 'Timestamp cannot be more than 5 minutes in the past';
    }
    if (data.speed !== undefined) {
        if (typeof data.speed !== 'number' || isNaN(data.speed)) {
            return 'Speed must be a valid number';
        }
        if (data.speed < 0 || data.speed > 200) {
            return 'Speed must be between 0 and 200 km/h';
        }
    }
    if (data.heading !== undefined) {
        if (typeof data.heading !== 'number' || isNaN(data.heading)) {
            return 'Heading must be a valid number';
        }
        if (data.heading < 0 || data.heading > 360) {
            return 'Heading must be between 0 and 360 degrees';
        }
    }
    const lastLocation = lastValidLocations.get(data.driverId);
    if (lastLocation) {
        const timeDiffMs = timestamp.getTime() - lastLocation.timestamp;
        const timeDiffHours = Math.max(timeDiffMs, 1000) / (1000 * 60 * 60);
        const distanceKm = calculateDistanceKm(lastLocation.latitude, lastLocation.longitude, data.latitude, data.longitude);
        const distanceMeters = distanceKm * 1000;
        const calculatedSpeedKmh = distanceKm / timeDiffHours;
        if (distanceMeters > 5000) {
            return `Impossible location jump detected: ${distanceMeters.toFixed(0)}m in ${(timeDiffMs / 1000).toFixed(1)}s`;
        }
        if (calculatedSpeedKmh > 120 && distanceMeters > 1000) {
            return `Unrealistic speed detected: ${calculatedSpeedKmh.toFixed(1)} km/h for ${distanceMeters.toFixed(0)}m jump`;
        }
        if (data.speed !== undefined && data.speed > 0) {
            const speedDiff = Math.abs(calculatedSpeedKmh - data.speed);
            if (speedDiff > 50 && distanceMeters > 100) {
                return `Speed mismatch: calculated ${calculatedSpeedKmh.toFixed(1)} km/h vs reported ${data.speed.toFixed(1)} km/h`;
            }
        }
    }
    lastValidLocations.set(data.driverId, {
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: timestamp.getTime(),
    });
    if (lastValidLocations.size > 100) {
        const entries = Array.from(lastValidLocations.entries());
        lastValidLocations.clear();
        entries.slice(-50).forEach(([key, value]) => {
            lastValidLocations.set(key, value);
        });
    }
    return null;
};
exports.validateLocationData = validateLocationData;
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    if (password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(password)) {
        return 'Password must contain at least one number';
    }
    return null;
};
exports.validatePassword = validatePassword;
const validateBusNumber = (busNumber) => {
    if (!busNumber || typeof busNumber !== 'string') {
        return 'Bus number is required and must be a string';
    }
    if (busNumber.trim().length === 0) {
        return 'Bus number cannot be empty';
    }
    if (busNumber.length > 20) {
        return 'Bus number cannot be longer than 20 characters';
    }
    return null;
};
exports.validateBusNumber = validateBusNumber;
const validateRouteName = (routeName) => {
    if (!routeName || typeof routeName !== 'string') {
        return 'Route name is required and must be a string';
    }
    if (routeName.trim().length === 0) {
        return 'Route name cannot be empty';
    }
    if (routeName.length > 100) {
        return 'Route name cannot be longer than 100 characters';
    }
    return null;
};
exports.validateRouteName = validateRouteName;
const validateRouteData = (routeData) => {
    const name = routeData.name;
    if (typeof name !== 'string') {
        return 'Route name is required and must be a string';
    }
    const nameError = (0, exports.validateRouteName)(name);
    if (nameError)
        return nameError;
    if (!routeData.description || typeof routeData.description !== 'string') {
        return 'Description is required and must be a string';
    }
    if (routeData.description.trim().length === 0) {
        return 'Description cannot be empty';
    }
    if (routeData.coordinates !== undefined) {
        if (!Array.isArray(routeData.coordinates)) {
            return 'Coordinates must be an array if provided';
        }
        if (routeData.coordinates.length > 0 && routeData.coordinates.length < 2) {
            return 'Route must have at least 2 coordinate points if coordinates are provided';
        }
        for (let i = 0; i < routeData.coordinates.length; i++) {
            const coord = routeData.coordinates[i];
            if (!Array.isArray(coord) || coord.length !== 2) {
                return `Coordinate ${i + 1} must be an array with 2 elements [longitude, latitude]`;
            }
            const [lng, lat] = coord;
            if (typeof lng !== 'number' || isNaN(lng)) {
                return `Longitude at coordinate ${i + 1} must be a valid number`;
            }
            if (lng < -180 || lng > 180) {
                return `Longitude at coordinate ${i + 1} must be between -180 and 180 degrees`;
            }
            if (typeof lat !== 'number' || isNaN(lat)) {
                return `Latitude at coordinate ${i + 1} must be a valid number`;
            }
            if (lat < -90 || lat > 90) {
                return `Latitude at coordinate ${i + 1} must be between -90 and 90 degrees`;
            }
        }
    }
    if (typeof routeData.distance_km !== 'number' ||
        isNaN(routeData.distance_km)) {
        return 'Distance must be a valid number';
    }
    if (routeData.distance_km <= 0) {
        return 'Distance must be greater than 0';
    }
    if (typeof routeData.estimated_duration_minutes !== 'number' ||
        isNaN(routeData.estimated_duration_minutes)) {
        return 'Estimated duration must be a valid number';
    }
    if (routeData.estimated_duration_minutes <= 0) {
        return 'Estimated duration must be greater than 0';
    }
    if (routeData.city !== undefined && routeData.city !== null) {
        if (typeof routeData.city !== 'string') {
            return 'City must be a string';
        }
        if (routeData.city.trim().length === 0) {
            return 'City cannot be empty if provided';
        }
        if (routeData.city.length > 100) {
            return 'City name cannot be longer than 100 characters';
        }
    }
    return null;
};
exports.validateRouteData = validateRouteData;
//# sourceMappingURL=validation.js.map