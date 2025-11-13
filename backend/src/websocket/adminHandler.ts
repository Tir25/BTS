/**
 * Admin Handler
 * Handles admin-specific broadcasts and assignment updates
 */

import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { SocketEvents, SocketRooms } from './socketEvents';
import { DriverAssignment } from './socketTypes';

/**
 * Broadcast assignment update to affected drivers
 */
export function broadcastAssignmentUpdate(
  io: SocketIOServer,
  driverId: string,
  assignment: DriverAssignment
): void {
  logger.websocket('Broadcasting assignment update', {
    driverId,
    busId: assignment.busId,
    type: 'admin_update',
  });

  io.to(SocketRooms.DRIVER(driverId)).emit(SocketEvents.DRIVER_ASSIGNMENT_UPDATE, {
    type: 'admin_update',
    assignment: {
      driverId: assignment.driverId,
      busId: assignment.busId,
      busNumber: assignment.busNumber,
      routeId: assignment.routeId,
      routeName: assignment.routeName,
      driverName: assignment.driverName,
      status: assignment.status || 'active',
      lastUpdated: assignment.lastUpdated || new Date().toISOString(),
    },
  });
}

/**
 * Broadcast assignment removal to affected drivers
 */
export function broadcastAssignmentRemoval(io: SocketIOServer, driverId: string, busId: string): void {
  logger.websocket('Broadcasting assignment removal', { driverId, busId });

  io.to(SocketRooms.DRIVER(driverId)).emit(SocketEvents.DRIVER_ASSIGNMENT_UPDATE, {
    type: 'removed',
    assignment: null,
    message: 'Your bus assignment has been removed by an administrator',
  });
}

/**
 * Attach admin broadcast functions to Socket.IO server instance
 */
export function attachAdminBroadcastFunctions(io: SocketIOServer): void {
  (io as any).broadcastAssignmentUpdate = (driverId: string, assignment: DriverAssignment) => {
    broadcastAssignmentUpdate(io, driverId, assignment);
  };

  (io as any).broadcastAssignmentRemoval = (driverId: string, busId: string) => {
    broadcastAssignmentRemoval(io, driverId, busId);
  };
}

