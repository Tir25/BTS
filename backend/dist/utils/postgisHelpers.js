"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePostGISPoint = parsePostGISPoint;
exports.formatPostGISPoint = formatPostGISPoint;
exports.postGISPointToGeoJSON = postGISPointToGeoJSON;
const logger_1 = require("./logger");
function parsePostGISPoint(pointString) {
    if (!pointString || typeof pointString !== 'string') {
        return null;
    }
    try {
        const pointMatch = pointString.match(/POINT\(([^)]+)\)/);
        if (!pointMatch) {
            logger_1.logger.warn('Invalid PostGIS POINT format', 'postgis-helpers', { pointString });
            return null;
        }
        const coords = pointMatch[1].split(' ').map(Number);
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
            logger_1.logger.warn('Invalid coordinates in PostGIS POINT', 'postgis-helpers', { pointString, coords });
            return null;
        }
        const [longitude, latitude] = coords;
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            logger_1.logger.warn('Coordinates out of valid range', 'postgis-helpers', { latitude, longitude });
            return null;
        }
        return { latitude, longitude };
    }
    catch (error) {
        logger_1.logger.error('Error parsing PostGIS POINT', 'postgis-helpers', { error, pointString });
        return null;
    }
}
function formatPostGISPoint(latitude, longitude) {
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error(`Invalid coordinates: latitude=${latitude}, longitude=${longitude}`);
    }
    return `POINT(${longitude} ${latitude})`;
}
function postGISPointToGeoJSON(pointString) {
    const parsed = parsePostGISPoint(pointString);
    if (!parsed) {
        return null;
    }
    return {
        type: 'Point',
        coordinates: [parsed.longitude, parsed.latitude],
    };
}
//# sourceMappingURL=postgisHelpers.js.map