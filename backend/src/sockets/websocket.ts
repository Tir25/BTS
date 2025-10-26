import { Server as SocketIOServer, Socket } from 'socket.io';
import { supabaseAdmin } from '../config/supabase';
import {
  saveLocationUpdate,
  getDriverBusInfo,
} from '../services/locationService';
import { RouteService } from '../services/routeService';
import { validateLocationData } from '../utils/validation';
import { 
  websocketAuthMiddleware, 
  websocketDriverAuthMiddleware,
  websocketStudentAuthMiddleware 
} from '../middleware/websocketAuth';
import { logger } from '../utils/logger';

interface LocationUpdate {
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

interface AuthenticatedSocket extends Socket {
  driverId?: string;
  busId?: string;
  userId?: string;
  userRole?: string;
  isAuthenticated?: boolean;
  lastActivity?: number;
}

export const initializeWebSocket = (io: SocketIOServer) => {
  logger.websocket('WebSocket server initialized');

  // Enhanced Socket.IO configuration for production deployment
  io.engine.opts.pingTimeout = 60000; // 60 seconds
  io.engine.opts.pingInterval = 25000; // 25 seconds
  io.engine.opts.upgradeTimeout = 10000; // 10 seconds
  io.engine.opts.maxHttpBufferSize = 1e6; // 1MB
  io.engine.opts.allowEIO3 = true; // Allow Engine.IO v3 clients
  io.engine.opts.cors = {
    origin: true, // Allow all origins (handled by CORS middleware)
    credentials: true,
  };

  // SECURITY FIX: Apply authentication middleware at connection level
  io.use(websocketAuthMiddleware);

  // Enhanced connection monitoring with limits
  let totalConnections = 0;
  let activeConnections = 0;
  const MAX_CONNECTIONS = parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS || '1000');
  const MAX_CONNECTIONS_PER_IP = parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS_PER_IP || '10');
  const connectionCounts = new Map<string, number>(); // IP -> connection count

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const clientIP = socket.handshake.address;
    
    // Check total connection limit
    if (activeConnections >= MAX_CONNECTIONS) {
      logger.warn('WebSocket connection limit exceeded', 'websocket', {
        activeConnections,
        maxConnections: MAX_CONNECTIONS,
        clientIP
      });
      socket.emit('error', {
        message: 'Server at capacity',
        code: 'SERVER_FULL'
      });
      socket.disconnect(true);
      return;
    }

    // Check per-IP connection limit
    const ipConnections = connectionCounts.get(clientIP) || 0;
    if (ipConnections >= MAX_CONNECTIONS_PER_IP) {
      logger.warn('WebSocket connection limit per IP exceeded', 'websocket', {
        clientIP,
        ipConnections,
        maxPerIP: MAX_CONNECTIONS_PER_IP
      });
      socket.emit('error', {
        message: 'Too many connections from this IP',
        code: 'IP_LIMIT_EXCEEDED'
      });
      socket.disconnect(true);
      return;
    }

    totalConnections++;
    activeConnections++;
    connectionCounts.set(clientIP, ipConnections + 1);
    socket.lastActivity = Date.now();

    logger.wsConnection(socket.id, socket.userId, { 
      totalConnections, 
      activeConnections,
      clientIP,
      ipConnections: ipConnections + 1
    });

    // Set socket options for better mobile support
    socket.conn.on('packet', ({ type }) => {
      if (type === 'pong') {
        logger.debug('Pong received', 'websocket', { socketId: socket.id });
        socket.lastActivity = Date.now();
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
      socket.lastActivity = Date.now();
      logger.debug('Ping received', 'websocket', { socketId: socket.id });
    });

    // SECURITY FIX: Simplified driver authentication using middleware
    socket.on('driver:authenticate', async (data: { token?: string }) => {
      try {
        // Check if user is already authenticated via middleware
        if (!socket.isAuthenticated || !socket.userId) {
          socket.emit('driver:authentication_failed', {
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED',
          });
          return;
        }

        // Check if user has driver role
        if (socket.userRole !== 'driver' && socket.userRole !== 'admin') {
          socket.emit('driver:authentication_failed', {
            message: 'Driver role required',
            code: 'INSUFFICIENT_PERMISSIONS',
          });
          return;
        }

        logger.websocket('Driver authentication', { 
          userId: socket.userId, 
          role: socket.userRole 
        });

        const busInfo = await getDriverBusInfo(socket.userId);
        logger.websocket('Bus info retrieved', { userId: socket.userId, busInfo });

        if (!busInfo) {
          logger.websocket('No bus assigned to driver', { userId: socket.userId });
          socket.emit('driver:authentication_failed', {
            message: 'No bus assigned to driver',
            code: 'NO_BUS_ASSIGNED',
          });
          return;
        }

        // Set socket properties
        socket.driverId = socket.userId;
        socket.busId = busInfo.bus_id;
        socket.lastActivity = Date.now();

        // Join relevant rooms
        socket.join(`driver:${socket.userId}`);
        socket.join(`bus:${busInfo.bus_id}`);

        logger.websocket('Driver authenticated and assigned', { 
          driverId: socket.userId, 
          busId: busInfo.bus_id 
        });

        const authResponse = {
          driverId: socket.userId,
          busId: busInfo.bus_id,
          busInfo: busInfo,
        };

        logger.websocket('Sending authentication response', { authResponse });
        socket.emit('driver:authenticated', authResponse);
      } catch (error) {
        logger.error('Driver authentication error', 'websocket', { socketId: socket.id }, error as Error);
        socket.emit('driver:authentication_failed', {
          message: 'Authentication failed',
          code: 'AUTH_ERROR',
        });
      }
    });

    // Enhanced location update with validation
    socket.on('driver:locationUpdate', async (data: LocationUpdate) => {
      try {
        socket.lastActivity = Date.now();

        logger.location('Received location update', {
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
          socketDriverId: socket.driverId,
          socketBusId: socket.busId,
        });

        if (!socket.driverId || !socket.busId || !socket.isAuthenticated) {
          socket.emit('error', {
            message: 'Driver not authenticated',
            code: 'NOT_AUTHENTICATED',
          });
          return;
        }

        const validationError = validateLocationData(data);
        if (validationError) {
          socket.emit('error', {
            message: validationError,
            code: 'VALIDATION_ERROR',
          });
          return;
        }

        if (data.driverId !== socket.driverId) {
          socket.emit('error', {
            message: 'Unauthorized location update',
            code: 'UNAUTHORIZED',
          });
          return;
        }

        const savedLocation = await saveLocationUpdate({
          driverId: data.driverId,
          busId: socket.busId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
          speed: data.speed,
          heading: data.heading,
        });

        if (!savedLocation) {
          socket.emit('error', {
            message: 'Failed to save location update',
            code: 'SAVE_ERROR',
          });
          return;
        }

        const busInfo = await getDriverBusInfo(data.driverId);
        let etaInfo = null;
        let nearStopInfo = null;

        if (busInfo?.route_id) {
          try {
            etaInfo = await RouteService.calculateETA(
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
            nearStopInfo = await RouteService.checkBusNearStop(
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

        // Broadcast location update to all connected clients
        logger.location('Broadcasting location update', { locationData });
        io.emit('bus:locationUpdate', locationData);

        logger.location('Location broadcast complete', {
          busId: socket.busId,
          clientsCount: io.engine.clientsCount
        });

        if (nearStopInfo?.is_near_stop) {
          io.emit('bus:arriving', {
            busId: socket.busId,
            routeId: busInfo?.route_id,
            location: [data.longitude, data.latitude],
            timestamp: data.timestamp,
          });
        }

        socket.emit('driver:locationConfirmed', {
          timestamp: data.timestamp,
          locationId: savedLocation.id,
        });

        logger.location('Location update processed', {
          driverId: data.driverId,
          busId: socket.busId
        });
      } catch (error) {
        logger.error('Location update error', 'websocket', { socketId: socket.id }, error as Error);
        socket.emit('error', {
          message: 'Failed to process location update',
          code: 'PROCESSING_ERROR',
        });
      }
    });

    // SECURITY FIX: Enhanced student connection with authentication check
    socket.on('student:connect', () => {
      try {
        // Check if user is authenticated
        if (!socket.isAuthenticated || !socket.userId) {
          socket.emit('error', {
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED',
          });
          return;
        }

        // Check if user has student role
        if (socket.userRole !== 'student' && socket.userRole !== 'admin') {
          socket.emit('error', {
            message: 'Student role required',
            code: 'INSUFFICIENT_PERMISSIONS',
          });
          return;
        }

        socket.lastActivity = Date.now();
        socket.join('students');
        logger.websocket('Student connected', { socketId: socket.id, userId: socket.userId });
        socket.emit('student:connected', { 
          timestamp: new Date().toISOString(),
          userId: socket.userId 
        });
      } catch (error) {
        logger.error('Error handling student connection', 'websocket', { socketId: socket.id }, error as Error);
        socket.emit('error', {
          message: 'Failed to process student connection',
          code: 'CONNECTION_ERROR',
        });
      }
    });

    // Enhanced disconnect handling with connection cleanup
    socket.on('disconnect', (reason) => {
      try {
        activeConnections--;
        
        // Update connection count for this IP
        const clientIP = socket.handshake.address;
        const ipConnections = connectionCounts.get(clientIP) || 0;
        if (ipConnections > 0) {
          connectionCounts.set(clientIP, ipConnections - 1);
        }
        
        logger.wsDisconnection(socket.id, reason, socket.userId);

        // Log additional info for debugging mobile disconnections
        if (reason === 'transport close') {
          logger.debug('Mobile client disconnection', 'websocket', { socketId: socket.id, reason });
        } else if (reason === 'ping timeout') {
          logger.debug('Ping timeout', 'websocket', { socketId: socket.id });
        } else if (reason === 'transport error') {
          logger.debug('Transport error', 'websocket', { socketId: socket.id });
        }

        // Clean up authenticated driver
        if (socket.isAuthenticated && socket.driverId) {
          logger.websocket('Driver disconnected', {
            driverId: socket.driverId,
            busId: socket.busId
          });
        }

        // Clean up event listeners to prevent memory leaks
        socket.removeAllListeners();
      } catch (error) {
        logger.error('Error handling disconnect', 'websocket', { socketId: socket.id }, error as Error);
      }
    });

    // Enhanced error handling
    socket.on('error', (error) => {
      logger.error('Socket error', 'websocket', { socketId: socket.id }, error as Error);
      socket.lastActivity = Date.now();
    });

    // Activity monitoring
    socket.onAny(() => {
      socket.lastActivity = Date.now();
    });
  });

  // Server-wide monitoring
  setInterval(() => {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    io.sockets.sockets.forEach((socket: AuthenticatedSocket) => {
      if (
        socket.lastActivity &&
        now - socket.lastActivity > inactiveThreshold
      ) {
        logger.debug('Inactive socket detected', 'websocket', {
          socketId: socket.id,
          lastActivity: new Date(socket.lastActivity).toISOString()
        });
      }
    });
  }, 60000); // Check every minute

  return io;
};
