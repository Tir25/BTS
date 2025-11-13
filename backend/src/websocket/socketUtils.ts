/**
 * WebSocket Utility Functions
 * Helper functions for broadcasting, room management, and common operations
 */

import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { SocketEvents, SocketRooms } from './socketEvents';
import { BusLocationData, AuthenticatedSocket } from './socketTypes';

/**
 * Broadcast location update to all clients (non-blocking)
 * CRITICAL FIX: Optimized for concurrent updates from multiple drivers
 */
export function broadcastLocationUpdate(
  io: SocketIOServer,
  locationData: BusLocationData
): void {
  setImmediate(() => {
    try {
      // Broadcast to all clients
      io.emit(SocketEvents.BUS_LOCATION_UPDATE, locationData);
      
      // Also broadcast specifically to students room for redundancy
      io.to(SocketRooms.STUDENTS).emit(SocketEvents.BUS_LOCATION_UPDATE, locationData);
      
      logger.location('Location broadcast complete', {
        busId: locationData.busId,
        totalClientsCount: io.engine.clientsCount,
      });
    } catch (broadcastError) {
      logger.error('Error broadcasting location update', 'websocket', {
        error: broadcastError instanceof Error ? broadcastError.message : String(broadcastError),
        busId: locationData.busId,
        driverId: locationData.driverId,
      });
    }
  });
}

/**
 * Broadcast bus arriving event
 */
export function broadcastBusArriving(
  io: SocketIOServer,
  data: {
    busId: string;
    routeId?: string;
    location: [number, number];
    timestamp: string;
  }
): void {
  try {
    io.emit(SocketEvents.BUS_ARRIVING, data);
    logger.debug('Bus arriving event broadcast', 'websocket', {
      busId: data.busId,
      routeId: data.routeId,
    });
  } catch (error) {
    logger.error('Error broadcasting bus arriving', 'websocket', {
      error: error instanceof Error ? error.message : String(error),
      busId: data.busId,
    });
  }
}

/**
 * Emit error to socket
 */
export function emitError(
  socket: AuthenticatedSocket,
  message: string,
  code: string
): void {
  socket.emit(SocketEvents.ERROR, {
    message,
    code,
  });
}

/**
 * Get connected clients statistics
 */
export function getConnectedClientsStats(io: SocketIOServer): {
  total: number;
  students: number;
  drivers: number;
} {
  const connectedClients = Array.from(io.sockets.sockets.values());
  const studentClients = connectedClients.filter(
    (s) =>
      (s as AuthenticatedSocket).userRole === 'student' ||
      (s as AuthenticatedSocket).userId?.startsWith('anonymous-student')
  );
  const driverClients = connectedClients.filter(
    (s) => (s as AuthenticatedSocket).userRole === 'driver'
  );

  return {
    total: connectedClients.length,
    students: studentClients.length,
    drivers: driverClients.length,
  };
}

/**
 * Join socket to relevant rooms
 */
export function joinRelevantRooms(
  socket: AuthenticatedSocket,
  driverId?: string,
  busId?: string
): void {
  if (driverId) {
    socket.join(SocketRooms.DRIVER(driverId));
  }
  if (busId) {
    socket.join(SocketRooms.BUS(busId));
  }
}

/**
 * Clean up socket references
 */
export function cleanupSocket(
  socket: AuthenticatedSocket,
  connectionStats: {
    activeSockets: Map<string, AuthenticatedSocket>;
    connectionTimestamps: Map<string, number>;
    heartbeatIntervals: Map<string, NodeJS.Timeout>;
  }
): void {
  // Remove from tracking maps
  connectionStats.activeSockets.delete(socket.id);
  connectionStats.connectionTimestamps.delete(socket.id);

  // Clear heartbeat interval
  const heartbeatInterval = connectionStats.heartbeatIntervals.get(socket.id);
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    connectionStats.heartbeatIntervals.delete(socket.id);
  }

  // Remove all listeners
  socket.removeAllListeners();

  // Clear socket properties
  socket.userId = undefined;
  socket.userRole = undefined;
  socket.driverId = undefined;
  socket.busId = undefined;
  socket.isAuthenticated = false;
  socket.lastActivity = undefined;
}

