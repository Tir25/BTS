/**
 * Bus Location Handler
 * Handles bus location updates from drivers with rate limiting and validation
 */

import { Server as SocketIOServer } from 'socket.io';
import { optimizedLocationService } from '../services/OptimizedLocationService';
import { RouteQueryService } from '../services/routes/RouteQueryService';
import { validateLocationData } from '../utils/validation';
import { logger } from '../utils/logger';
import { AuthenticatedSocket, LocationUpdate, BusLocationData } from './socketTypes';
import { SocketEvents, SocketErrorCodes } from './socketEvents';
import { broadcastLocationUpdate, broadcastBusArriving, emitError } from './socketUtils';

// CRITICAL FIX: Rate limiting for location updates to prevent overwhelming the system
// Track last update time per socket to prevent spam
const locationUpdateRateLimiter = new Map<string, number>(); // socketId -> lastUpdateTime
const MIN_UPDATE_INTERVAL_MS = 1000; // Minimum 1 second between updates per driver

// PRODUCTION FIX: Metrics tracking for monitoring
interface RateLimitMetrics {
  totalUpdates: number;
  rateLimited: number;
  accepted: number;
  lastReset: number;
}

const rateLimitMetrics: RateLimitMetrics = {
  totalUpdates: 0,
  rateLimited: 0,
  accepted: 0,
  lastReset: Date.now(),
};

// Reset metrics every hour for monitoring
setInterval(() => {
  const previous = { ...rateLimitMetrics };
  rateLimitMetrics.totalUpdates = 0;
  rateLimitMetrics.rateLimited = 0;
  rateLimitMetrics.accepted = 0;
  rateLimitMetrics.lastReset = Date.now();
  
  logger.info('Rate limit metrics reset', 'websocket', {
    previousMetrics: previous,
    resetTime: new Date().toISOString(),
  });
}, 3600000); // 1 hour

/**
 * Setup bus location update handler
 */
export function setupBusLocationHandler(
  io: SocketIOServer,
  socket: AuthenticatedSocket
): void {
  socket.on(SocketEvents.DRIVER_LOCATION_UPDATE, async (data: LocationUpdate) => {
    try {
      // PRODUCTION FIX: Track metrics
      rateLimitMetrics.totalUpdates++;
      
      // CRITICAL FIX: Rate limiting to prevent overwhelming system with concurrent updates
      const now = Date.now();
      const lastUpdate = locationUpdateRateLimiter.get(socket.id) || 0;
      const timeSinceLastUpdate = now - lastUpdate;

      if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL_MS) {
        // PRODUCTION FIX: Rate limit exceeded - provide feedback to frontend
        const nextAllowedTime = lastUpdate + MIN_UPDATE_INTERVAL_MS;
        const waitTime = nextAllowedTime - now;
        
        // PRODUCTION FIX: Track rate limit metrics
        rateLimitMetrics.rateLimited++;
        
        logger.debug('Location update rate limited', 'websocket', {
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

        // Emit rate limit feedback to frontend
        socket.emit(SocketEvents.DRIVER_LOCATION_RATE_LIMITED, {
          timestamp: data.timestamp,
          nextAllowedTime: new Date(nextAllowedTime).toISOString(),
          waitTimeMs: waitTime,
          reason: 'Update received too soon after previous update',
        });

        return;
      }

      // PRODUCTION FIX: Track accepted updates
      rateLimitMetrics.accepted++;
      
      // Update rate limiter
      locationUpdateRateLimiter.set(socket.id, now);
      socket.lastActivity = now;

      logger.location('Received location update', {
        driverId: data.driverId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp,
        socketDriverId: socket.driverId,
        socketBusId: socket.busId,
      });

      // Validate authentication
      if (!socket.driverId || !socket.busId || !socket.isAuthenticated) {
        emitError(socket, 'Driver not authenticated', SocketErrorCodes.NOT_AUTHENTICATED);
        return;
      }

      // Validate location data
      const validationError = validateLocationData(data);
      if (validationError) {
        emitError(socket, validationError, SocketErrorCodes.VALIDATION_ERROR);
        return;
      }

      // Validate driver authorization
      if (data.driverId !== socket.driverId) {
        emitError(socket, 'Unauthorized location update', SocketErrorCodes.UNAUTHORIZED);
        return;
      }

      // CRITICAL FIX: Validate busId is available before saving
      if (!socket.busId) {
        logger.error('Cannot save location: busId not available', 'websocket', {
          driverId: data.driverId,
          socketId: socket.id,
        });
        emitError(
          socket,
          'Bus assignment not available. Please reinitialize driver connection.',
          SocketErrorCodes.NO_BUS_ASSIGNED
        );
        return;
      }

      // Save location update using OptimizedLocationService
      const savedLocation = await optimizedLocationService.saveLocationUpdate({
        driverId: data.driverId,
        busId: socket.busId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp,
        speed: data.speed,
        heading: data.heading,
      });

      if (!savedLocation) {
        emitError(socket, 'Failed to save location update', SocketErrorCodes.SAVE_ERROR);
        return;
      }

      // Get bus info and calculate ETA/near stop info
      const busInfo = await optimizedLocationService.getDriverBusInfo(data.driverId);
      let etaInfo: any = null;
      let nearStopInfo: any = null;

      if (busInfo?.route_id) {
        try {
          etaInfo = await RouteQueryService.calculateETA(
            {
              bus_id: socket.busId!,
              latitude: data.latitude,
              longitude: data.longitude,
              timestamp: data.timestamp,
            },
            busInfo.route_id
          );
        } catch (etaError) {
          logger.error('Error calculating ETA', 'route', undefined, etaError as Error);
          // Continue without ETA if calculation fails
        }

        try {
          nearStopInfo = await RouteQueryService.checkBusNearStop(
            {
              bus_id: socket.busId!,
              latitude: data.latitude,
              longitude: data.longitude,
              timestamp: data.timestamp,
            },
            busInfo.route_id
          );
        } catch (stopError) {
          logger.error('Error checking near stop', 'route', undefined, stopError as Error);
          // Continue without near stop info if calculation fails
        }
      }

      // Prepare location data for broadcast
      const locationData: BusLocationData = {
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

      // Broadcast location update (non-blocking)
      logger.location('Broadcasting location update', { locationData });
      broadcastLocationUpdate(io, locationData);

      // Broadcast bus arriving event if near stop
      if (nearStopInfo?.is_near_stop) {
        broadcastBusArriving(io, {
          busId: socket.busId,
          routeId: busInfo?.route_id,
          location: [data.longitude, data.latitude],
          timestamp: data.timestamp,
        });
      }

      // Confirm location update to driver
      socket.emit(SocketEvents.DRIVER_LOCATION_CONFIRMED, {
        timestamp: data.timestamp,
        locationId: savedLocation.id,
      });

      logger.location('Location update processed', {
        driverId: data.driverId,
        busId: socket.busId,
        metrics: {
          totalUpdates: rateLimitMetrics.totalUpdates,
          rateLimited: rateLimitMetrics.rateLimited,
          accepted: rateLimitMetrics.accepted,
          successRate: ((rateLimitMetrics.accepted / rateLimitMetrics.totalUpdates) * 100).toFixed(2) + '%',
        },
      });
    } catch (error) {
      logger.error('Location update error', 'websocket', { socketId: socket.id }, error as Error);
      emitError(socket, 'Failed to process location update', SocketErrorCodes.PROCESSING_ERROR);
    }
  });
}

/**
 * Clean up rate limiter on disconnect
 */
export function cleanupLocationRateLimiter(socketId: string): void {
  locationUpdateRateLimiter.delete(socketId);
}

