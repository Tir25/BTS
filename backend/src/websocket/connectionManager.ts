/**
 * Connection Manager
 * Handles socket connection, disconnection, and connection monitoring
 */

import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { AuthenticatedSocket, ConnectionStats } from './socketTypes';
import { SocketEvents, SocketErrorCodes } from './socketEvents';
import { cleanupSocket, emitError } from './socketUtils';

/**
 * Setup connection manager for WebSocket server
 */
export function setupConnectionManager(
  io: SocketIOServer,
  connectionStats: ConnectionStats
): void {
  io.on(SocketEvents.CONNECTION, async (socket: AuthenticatedSocket) => {
    const clientIP = socket.handshake.address;

    // Check total connection limit
    if (connectionStats.activeConnections >= parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS || '2000')) {
      logger.warn('WebSocket connection limit exceeded', 'websocket', {
        activeConnections: connectionStats.activeConnections,
        maxConnections: parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS || '2000'),
        clientIP,
      });
      emitError(socket, 'Server at capacity', SocketErrorCodes.SERVER_FULL);
      socket.disconnect(true);
      return;
    }

    // Check per-IP connection limit
    const ipConnections = connectionStats.connectionCounts.get(clientIP) || 0;
    const MAX_CONNECTIONS_PER_IP = parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS_PER_IP || '25');
    
    if (ipConnections >= MAX_CONNECTIONS_PER_IP) {
      logger.warn('WebSocket connection limit per IP exceeded', 'websocket', {
        clientIP,
        ipConnections,
        maxPerIP: MAX_CONNECTIONS_PER_IP,
      });
      emitError(socket, 'Too many connections from this IP', SocketErrorCodes.IP_LIMIT_EXCEEDED);
      socket.disconnect(true);
      return;
    }

    // Update connection statistics
    connectionStats.totalConnections++;
    connectionStats.activeConnections++;
    connectionStats.connectionCounts.set(clientIP, ipConnections + 1);
    socket.lastActivity = Date.now();

    // Track socket for proper cleanup
    connectionStats.activeSockets.set(socket.id, socket);
    connectionStats.connectionTimestamps.set(socket.id, Date.now());

    logger.wsConnection(socket.id, socket.userId, {
      totalConnections: connectionStats.totalConnections,
      activeConnections: connectionStats.activeConnections,
      clientIP,
      ipConnections: ipConnections + 1,
      userRole: socket.userRole,
      clientType: (socket.handshake.query?.clientType as string) || 'unknown',
      isAuthenticated: socket.isAuthenticated,
    });

    // Setup socket event handlers
    setupSocketEventHandlers(socket, connectionStats, clientIP);

    // Setup disconnect handler
    setupDisconnectHandler(socket, connectionStats, clientIP);
  });

  // Setup server-wide monitoring
  setupServerMonitoring(io, connectionStats);
}

/**
 * Setup socket-level event handlers
 */
function setupSocketEventHandlers(
  socket: AuthenticatedSocket,
  connectionStats: ConnectionStats,
  clientIP: string
): void {
  // Handle pong packets
  socket.conn.on('packet', ({ type }) => {
    if (type === 'pong') {
      logger.debug('Pong received', 'websocket', { socketId: socket.id });
      socket.lastActivity = Date.now();
    }
  });

  // Handle ping events
  socket.on(SocketEvents.PING, () => {
    socket.emit(SocketEvents.PONG);
    socket.lastActivity = Date.now();
    logger.debug('Ping received', 'websocket', { socketId: socket.id });
  });

  // Setup heartbeat monitoring
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    const lastActivity = socket.lastActivity || 0;
    const inactiveTime = now - lastActivity;

    // If socket has been inactive for more than 5 minutes, disconnect it
    if (inactiveTime > 5 * 60 * 1000) {
      logger.warn('Disconnecting inactive socket', 'websocket', {
        socketId: socket.id,
        inactiveTime: Math.round(inactiveTime / 1000),
        userId: socket.userId,
      });
      socket.disconnect(true);
    }
  }, 60000); // Check every minute

  connectionStats.heartbeatIntervals.set(socket.id, heartbeatInterval);

  // Enhanced error handling
  socket.on(SocketEvents.ERROR, (error) => {
    logger.error('Socket error', 'websocket', { socketId: socket.id }, error as Error);
    socket.lastActivity = Date.now();
  });

  // Activity monitoring
  socket.onAny(() => {
    socket.lastActivity = Date.now();
  });
}

/**
 * Setup disconnect handler
 */
function setupDisconnectHandler(
  socket: AuthenticatedSocket,
  connectionStats: ConnectionStats,
  clientIP: string
): void {
  socket.on(SocketEvents.DISCONNECT, (reason) => {
    try {
      connectionStats.activeConnections--;

      // Update connection count for this IP
      const ipConnections = connectionStats.connectionCounts.get(clientIP) || 0;
      if (ipConnections > 0) {
        connectionStats.connectionCounts.set(clientIP, ipConnections - 1);
      }

      // Clean up socket references
      cleanupSocket(socket, {
        activeSockets: connectionStats.activeSockets,
        connectionTimestamps: connectionStats.connectionTimestamps,
        heartbeatIntervals: connectionStats.heartbeatIntervals,
      });

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
          busId: socket.busId,
        });
      }
    } catch (error) {
      logger.error('Error handling disconnect', 'websocket', { socketId: socket.id }, error as Error);
    }
  });
}

/**
 * Setup server-wide monitoring for stale connections
 */
function setupServerMonitoring(io: SocketIOServer, connectionStats: ConnectionStats): void {
  setInterval(() => {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    const staleThreshold = 10 * 60 * 1000; // 10 minutes

    // Clean up stale connections
    const staleConnections: string[] = [];

    connectionStats.activeSockets.forEach((socket, socketId) => {
      const connectionTime = connectionStats.connectionTimestamps.get(socketId) || 0;
      const lastActivity = socket.lastActivity || 0;
      const inactiveTime = now - lastActivity;
      const connectionAge = now - connectionTime;

      // Mark for cleanup if inactive for too long
      if (inactiveTime > inactiveThreshold) {
        logger.debug('Inactive socket detected', 'websocket', {
          socketId,
          inactiveTime: Math.round(inactiveTime / 1000),
          userId: socket.userId,
        });
      }

      // Mark for cleanup if connection is too old and stale
      if (connectionAge > staleThreshold && inactiveTime > inactiveThreshold) {
        staleConnections.push(socketId);
      }
    });

    // Disconnect stale connections
    staleConnections.forEach((socketId) => {
      const socket = connectionStats.activeSockets.get(socketId);
      if (socket) {
        logger.warn('Disconnecting stale connection', 'websocket', {
          socketId,
          userId: socket.userId,
        });
        socket.disconnect(true);
      }
    });

    // Log connection statistics
    if (connectionStats.activeConnections > 0 && connectionStats.totalConnections % 100 === 0) {
      logger.info('WebSocket connection statistics', 'websocket', {
        activeConnections: connectionStats.activeConnections,
        totalConnections: connectionStats.totalConnections,
        staleConnections: staleConnections.length,
        heartbeatIntervals: connectionStats.heartbeatIntervals.size,
      });
    }
  }, 60000); // Check every minute
}

