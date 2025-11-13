"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBusLocationHandler = setupBusLocationHandler;
exports.cleanupLocationRateLimiter = cleanupLocationRateLimiter;
const OptimizedLocationService_1 = require("../services/OptimizedLocationService");
const RouteQueryService_1 = require("../services/routes/RouteQueryService");
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
const socketEvents_1 = require("./socketEvents");
const socketUtils_1 = require("./socketUtils");
const locationUpdateRateLimiter = new Map();
const MIN_UPDATE_INTERVAL_MS = 1000;
const rateLimitMetrics = {
    totalUpdates: 0,
    rateLimited: 0,
    accepted: 0,
    lastReset: Date.now(),
};
setInterval(() => {
    const previous = { ...rateLimitMetrics };
    rateLimitMetrics.totalUpdates = 0;
    rateLimitMetrics.rateLimited = 0;
    rateLimitMetrics.accepted = 0;
    rateLimitMetrics.lastReset = Date.now();
    logger_1.logger.info('Rate limit metrics reset', 'websocket', {
        previousMetrics: previous,
        resetTime: new Date().toISOString(),
    });
}, 3600000);
function setupBusLocationHandler(io, socket) {
    socket.on(socketEvents_1.SocketEvents.DRIVER_LOCATION_UPDATE, async (data) => {
        try {
            rateLimitMetrics.totalUpdates++;
            const now = Date.now();
            const lastUpdate = locationUpdateRateLimiter.get(socket.id) || 0;
            const timeSinceLastUpdate = now - lastUpdate;
            if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL_MS) {
                const nextAllowedTime = lastUpdate + MIN_UPDATE_INTERVAL_MS;
                const waitTime = nextAllowedTime - now;
                rateLimitMetrics.rateLimited++;
                logger_1.logger.debug('Location update rate limited', 'websocket', {
                    socketId: socket.id,
                    driverId: data.driverId,
                    timeSinceLastUpdate,
                    minInterval: MIN_UPDATE_INTERVAL_MS,
                    waitTime,
                    nextAllowedTime: new Date(nextAllowedTime).toISOString(),
                    metrics: {
                        totalUpdates: rateLimitMetrics.totalUpdates,
                        rateLimited: rateLimitMetrics.rateLimited,
                        accepted: rateLimitMetrics.accepted,
                        rateLimitPercentage: ((rateLimitMetrics.rateLimited / rateLimitMetrics.totalUpdates) * 100).toFixed(2) + '%',
                    },
                });
                socket.emit(socketEvents_1.SocketEvents.DRIVER_LOCATION_RATE_LIMITED, {
                    timestamp: data.timestamp,
                    nextAllowedTime: new Date(nextAllowedTime).toISOString(),
                    waitTimeMs: waitTime,
                    reason: 'Update received too soon after previous update',
                });
                return;
            }
            rateLimitMetrics.accepted++;
            locationUpdateRateLimiter.set(socket.id, now);
            socket.lastActivity = now;
            logger_1.logger.location('Received location update', {
                driverId: data.driverId,
                latitude: data.latitude,
                longitude: data.longitude,
                timestamp: data.timestamp,
                socketDriverId: socket.driverId,
                socketBusId: socket.busId,
            });
            if (!socket.driverId || !socket.busId || !socket.isAuthenticated) {
                (0, socketUtils_1.emitError)(socket, 'Driver not authenticated', socketEvents_1.SocketErrorCodes.NOT_AUTHENTICATED);
                return;
            }
            const validationError = (0, validation_1.validateLocationData)(data);
            if (validationError) {
                (0, socketUtils_1.emitError)(socket, validationError, socketEvents_1.SocketErrorCodes.VALIDATION_ERROR);
                return;
            }
            if (data.driverId !== socket.driverId) {
                (0, socketUtils_1.emitError)(socket, 'Unauthorized location update', socketEvents_1.SocketErrorCodes.UNAUTHORIZED);
                return;
            }
            if (!socket.busId) {
                logger_1.logger.error('Cannot save location: busId not available', 'websocket', {
                    driverId: data.driverId,
                    socketId: socket.id,
                });
                (0, socketUtils_1.emitError)(socket, 'Bus assignment not available. Please reinitialize driver connection.', socketEvents_1.SocketErrorCodes.NO_BUS_ASSIGNED);
                return;
            }
            const savedLocation = await OptimizedLocationService_1.optimizedLocationService.saveLocationUpdate({
                driverId: data.driverId,
                busId: socket.busId,
                latitude: data.latitude,
                longitude: data.longitude,
                timestamp: data.timestamp,
                speed: data.speed,
                heading: data.heading,
            });
            if (!savedLocation) {
                (0, socketUtils_1.emitError)(socket, 'Failed to save location update', socketEvents_1.SocketErrorCodes.SAVE_ERROR);
                return;
            }
            const busInfo = await OptimizedLocationService_1.optimizedLocationService.getDriverBusInfo(data.driverId);
            let etaInfo = null;
            let nearStopInfo = null;
            if (busInfo?.route_id) {
                try {
                    etaInfo = await RouteQueryService_1.RouteQueryService.calculateETA({
                        bus_id: socket.busId,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        timestamp: data.timestamp,
                    }, busInfo.route_id);
                }
                catch (etaError) {
                    logger_1.logger.error('Error calculating ETA', 'route', undefined, etaError);
                }
                try {
                    nearStopInfo = await RouteQueryService_1.RouteQueryService.checkBusNearStop({
                        bus_id: socket.busId,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        timestamp: data.timestamp,
                    }, busInfo.route_id);
                }
                catch (stopError) {
                    logger_1.logger.error('Error checking near stop', 'route', undefined, stopError);
                }
            }
            const locationData = {
                busId: socket.busId,
                driverId: data.driverId,
                latitude: data.latitude,
                longitude: data.longitude,
                timestamp: data.timestamp,
                speed: data.speed,
                heading: data.heading,
                eta: etaInfo,
                nearStop: nearStopInfo,
            };
            logger_1.logger.location('Broadcasting location update', { locationData });
            (0, socketUtils_1.broadcastLocationUpdate)(io, locationData);
            if (nearStopInfo?.is_near_stop) {
                (0, socketUtils_1.broadcastBusArriving)(io, {
                    busId: socket.busId,
                    routeId: busInfo?.route_id,
                    location: [data.longitude, data.latitude],
                    timestamp: data.timestamp,
                });
            }
            socket.emit(socketEvents_1.SocketEvents.DRIVER_LOCATION_CONFIRMED, {
                timestamp: data.timestamp,
                locationId: savedLocation.id,
            });
            logger_1.logger.location('Location update processed', {
                driverId: data.driverId,
                busId: socket.busId,
                metrics: {
                    totalUpdates: rateLimitMetrics.totalUpdates,
                    rateLimited: rateLimitMetrics.rateLimited,
                    accepted: rateLimitMetrics.accepted,
                    successRate: ((rateLimitMetrics.accepted / rateLimitMetrics.totalUpdates) * 100).toFixed(2) + '%',
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Location update error', 'websocket', { socketId: socket.id }, error);
            (0, socketUtils_1.emitError)(socket, 'Failed to process location update', socketEvents_1.SocketErrorCodes.PROCESSING_ERROR);
        }
    });
}
function cleanupLocationRateLimiter(socketId) {
    locationUpdateRateLimiter.delete(socketId);
}
//# sourceMappingURL=busLocationHandler.js.map