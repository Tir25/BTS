"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const OptimizedLocationService_1 = require("../services/OptimizedLocationService");
const postgisHelpers_1 = require("../utils/postgisHelpers");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
router.get('/current', async (req, res) => {
    try {
        const locations = await OptimizedLocationService_1.optimizedLocationService.getCurrentBusLocations();
        const formattedLocations = locations
            .map((location) => {
            const coords = (0, postgisHelpers_1.parsePostGISPoint)(location.location);
            if (!coords) {
                logger_1.logger.warn('Failed to parse location coordinates', 'locations-route', {
                    busId: location.bus_id,
                    locationString: location.location
                });
                return null;
            }
            return {
                busId: location.bus_id,
                driverId: location.driver_id || '',
                latitude: coords.latitude,
                longitude: coords.longitude,
                timestamp: location.timestamp || new Date().toISOString(),
                speed: location.speed,
                heading: location.heading,
            };
        })
            .filter((loc) => loc !== null);
        res.json({
            success: true,
            data: formattedLocations,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching current locations', 'locations-route', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch current locations',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/viewport', async (req, res) => {
    try {
        const { minLng, minLat, maxLng, maxLat } = req.query;
        if (!minLng || !minLat || !maxLng || !maxLat) {
            return res.status(400).json({
                success: false,
                error: 'Missing viewport parameters',
                message: 'minLng, minLat, maxLng, maxLat are required',
            });
        }
        const viewport = {
            minLng: parseFloat(minLng),
            minLat: parseFloat(minLat),
            maxLng: parseFloat(maxLng),
            maxLat: parseFloat(maxLat),
        };
        const locations = await OptimizedLocationService_1.optimizedLocationService.getCurrentBusLocations();
        const formattedLocations = locations
            .map((location) => {
            const coords = (0, postgisHelpers_1.parsePostGISPoint)(location.location);
            if (!coords) {
                logger_1.logger.warn('Failed to parse location coordinates in viewport', 'locations-route', {
                    busId: location.bus_id,
                    locationString: location.location
                });
                return null;
            }
            if (coords.latitude < viewport.minLat ||
                coords.latitude > viewport.maxLat ||
                coords.longitude < viewport.minLng ||
                coords.longitude > viewport.maxLng) {
                return null;
            }
            return {
                busId: location.bus_id,
                driverId: location.driver_id || '',
                latitude: coords.latitude,
                longitude: coords.longitude,
                timestamp: location.timestamp,
                speed: location.speed,
                heading: location.heading,
            };
        })
            .filter((loc) => loc !== null);
        return res.json({
            success: true,
            data: formattedLocations,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching locations in viewport', 'locations-route', { error });
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch locations in viewport',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/history/:busId', auth_1.authenticateUser, async (req, res) => {
    try {
        const { busId } = req.params;
        const { startTime, endTime } = req.query;
        if (!startTime || !endTime) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters',
                message: 'startTime and endTime are required',
            });
        }
        const locations = await OptimizedLocationService_1.optimizedLocationService.getBusLocationHistory(busId, startTime, endTime);
        res.json({
            success: true,
            data: locations,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching location history', 'locations-route', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch location history',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/update', auth_1.authenticateUser, async (req, res) => {
    try {
        const { busId, driverId, latitude, longitude, speed, heading } = req.body;
        if (!busId ||
            !driverId ||
            latitude === undefined ||
            longitude === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'busId, driverId, latitude, and longitude are required',
            });
        }
        if (latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180) {
            return res.status(400).json({
                success: false,
                error: 'Invalid coordinates',
                message: 'Latitude must be between -90 and 90, longitude between -180 and 180',
            });
        }
        const locationData = {
            driverId,
            busId,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            timestamp: new Date().toISOString(),
            speed: speed ? parseFloat(speed) : undefined,
            heading: heading ? parseFloat(heading) : undefined,
        };
        const savedLocation = await OptimizedLocationService_1.optimizedLocationService.saveLocationUpdate(locationData);
        if (!savedLocation) {
            return res.status(500).json({
                success: false,
                error: 'Failed to save location',
                message: 'Database error occurred',
            });
        }
        res.json({
            success: true,
            data: savedLocation,
            message: 'Location updated successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating location', 'locations-route', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to update location',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=locations.js.map