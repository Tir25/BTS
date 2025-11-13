/**
 * Driver Handler
 * Handles driver initialization and assignment updates
 */

import { optimizedLocationService } from '../services/OptimizedLocationService';
import { logger } from '../utils/logger';
import { AuthenticatedSocket, DriverAssignment } from './socketTypes';
import { SocketEvents, SocketErrorCodes } from './socketEvents';
import { emitError, joinRelevantRooms } from './socketUtils';

/**
 * Setup driver event handlers
 */
export function setupDriverHandler(socket: AuthenticatedSocket): void {
  // Driver initialization
  socket.on(SocketEvents.DRIVER_INITIALIZE, async () => {
    try {
      // Check if user is already authenticated via middleware
      if (!socket.isAuthenticated || !socket.userId) {
        logger.websocket('Driver initialization failed: Not authenticated', {
          socketId: socket.id,
        });
        socket.emit(SocketEvents.DRIVER_INITIALIZATION_FAILED, {
          message: 'Authentication required',
          code: SocketErrorCodes.NOT_AUTHENTICATED,
        });
        return;
      }

      // Check if user has driver role
      if (socket.userRole !== 'driver' && socket.userRole !== 'admin') {
        logger.websocket('Driver initialization failed: Insufficient permissions', {
          socketId: socket.id,
          userRole: socket.userRole,
          userId: socket.userId,
        });
        socket.emit(SocketEvents.DRIVER_INITIALIZATION_FAILED, {
          message: 'Driver role required',
          code: SocketErrorCodes.INSUFFICIENT_PERMISSIONS,
        });
        return;
      }

      logger.websocket('Driver initialization', {
        userId: socket.userId,
        role: socket.userRole,
      });

      // PRODUCTION FIX: Add timeout for getDriverBusInfo to prevent hanging
      // If the database query takes too long, fail gracefully
      let busInfo: any = null;
      let isTimeout = false;
      
      try {
        const busInfoPromise = optimizedLocationService.getDriverBusInfo(socket.userId);
        const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
          setTimeout(() => resolve({ timeout: true }), 10000); // 10 second timeout
        });

        const result = await Promise.race([busInfoPromise, timeoutPromise]);
        
        if (result && (result as any).timeout) {
          isTimeout = true;
        } else {
          busInfo = result;
        }
      } catch (error) {
        logger.error('Error fetching bus info during driver initialization', 'websocket', {
          userId: socket.userId,
          socketId: socket.id,
          error: error instanceof Error ? error.message : String(error),
        });
        socket.emit(SocketEvents.DRIVER_INITIALIZATION_FAILED, {
          message: 'Failed to retrieve bus information. Please try again.',
          code: SocketErrorCodes.INIT_ERROR,
        });
        return;
      }
      
      if (isTimeout) {
        logger.error('Driver initialization timeout: getDriverBusInfo took too long', 'websocket', {
          userId: socket.userId,
          socketId: socket.id,
        });
        socket.emit(SocketEvents.DRIVER_INITIALIZATION_FAILED, {
          message: 'Initialization timeout. Please try again.',
          code: SocketErrorCodes.INIT_ERROR,
        });
        return;
      }

      logger.websocket('Bus info retrieved', {
        userId: socket.userId,
        busInfo: busInfo
          ? {
              id: (busInfo as any).id,
              bus_id: (busInfo as any).bus_id,
              bus_number: busInfo.bus_number,
              route_id: busInfo.route_id,
            }
          : null,
      });

      // PRODUCTION FIX: Check if busInfo is null (either timeout or no bus assigned)
      // This check is after timeout check, so if we get here and busInfo is null, it means no bus assigned
      if (!busInfo) {
        logger.websocket('No bus assigned to driver', {
          userId: socket.userId,
          userRole: socket.userRole,
        });
        socket.emit(SocketEvents.DRIVER_INITIALIZATION_FAILED, {
          message: 'No bus assigned to driver. Please contact your administrator.',
          code: SocketErrorCodes.NO_BUS_ASSIGNED,
        });
        return;
      }

      // Set socket properties
      socket.driverId = socket.userId;
      socket.busId = (busInfo as any).id; // CRITICAL FIX: Use the correct 'id' field
      socket.lastActivity = Date.now();

      // Join relevant rooms
      joinRelevantRooms(socket, socket.userId, socket.busId);

      logger.websocket('Driver initialized and assigned', {
        driverId: socket.userId,
        busId: socket.busId,
        busInfoFields: {
          id: (busInfo as any).id,
          bus_id: (busInfo as any).bus_id,
          bus_number: busInfo.bus_number,
        },
      });

      const initResponse = {
        driverId: socket.userId,
        busId: socket.busId,
        busInfo: busInfo,
      };

      logger.websocket('Sending initialization response', {
        driverId: initResponse.driverId,
        busId: initResponse.busId,
        busNumber: initResponse.busInfo?.bus_number,
      });
      socket.emit(SocketEvents.DRIVER_INITIALIZED, initResponse);

      // Send current assignment data
      // CRITICAL FIX: Ensure busId is defined (it's set above on line 121)
      if (!socket.busId) {
        logger.error('Bus ID not set after initialization', 'driver-handler', {
          driverId: socket.userId,
          busInfo: busInfo
        });
        socket.emit(SocketEvents.DRIVER_INITIALIZATION_FAILED, {
          message: 'Bus ID not available',
          code: SocketErrorCodes.INIT_ERROR,
        });
        return;
      }

      const assignment: DriverAssignment = {
        driverId: socket.userId,
        busId: socket.busId,
        busNumber: busInfo.bus_number,
        routeId: busInfo.route_id,
        routeName: busInfo.route_name,
        driverName: busInfo.driver_name,
        status: 'active',
        lastUpdated: new Date().toISOString(),
      };

      socket.emit(SocketEvents.DRIVER_ASSIGNMENT_UPDATE, {
        type: 'initial',
        assignment,
      });
    } catch (error) {
      logger.error(
        'Driver initialization error',
        'websocket',
        {
          socketId: socket.id,
          userId: socket.userId,
          userRole: socket.userRole,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        error as Error
      );
      socket.emit(SocketEvents.DRIVER_INITIALIZATION_FAILED, {
        message: 'Initialization failed. Please try again.',
        code: SocketErrorCodes.INIT_ERROR,
      });
    }
  });

  // Handle driver assignment update requests
  socket.on(SocketEvents.DRIVER_REQUEST_ASSIGNMENT_UPDATE, async () => {
    try {
      if (!socket.isAuthenticated || !socket.userId || socket.userRole !== 'driver') {
        emitError(socket, 'Authentication required', SocketErrorCodes.NOT_AUTHENTICATED);
        return;
      }

      const busInfo = await optimizedLocationService.getDriverBusInfo(socket.userId);
      if (busInfo) {
        const assignment: DriverAssignment = {
          driverId: socket.userId,
          busId: (busInfo as any).id, // CRITICAL FIX: Use the correct 'id' field
          busNumber: busInfo.bus_number,
          routeId: busInfo.route_id,
          routeName: busInfo.route_name,
          driverName: busInfo.driver_name,
          status: 'active',
          lastUpdated: new Date().toISOString(),
        };

        socket.emit(SocketEvents.DRIVER_ASSIGNMENT_UPDATE, {
          type: 'refresh',
          assignment,
        });
      } else {
        socket.emit(SocketEvents.DRIVER_ASSIGNMENT_UPDATE, {
          type: 'no_assignment',
          assignment: null,
        });
      }
    } catch (error) {
      logger.error(
        'Error handling assignment update request',
        'websocket',
        {
          socketId: socket.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      emitError(socket, 'Failed to get assignment update', SocketErrorCodes.ASSIGNMENT_UPDATE_ERROR);
    }
  });
}

