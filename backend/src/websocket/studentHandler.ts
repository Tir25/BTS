/**
 * Student Handler
 * Handles student connection and student-specific events
 */

import { logger } from '../utils/logger';
import { AuthenticatedSocket } from './socketTypes';
import { SocketEvents, SocketRooms, SocketErrorCodes } from './socketEvents';
import { emitError } from './socketUtils';

/**
 * Setup student event handlers
 */
export function setupStudentHandler(socket: AuthenticatedSocket): void {
  socket.on(SocketEvents.STUDENT_CONNECT, () => {
    try {
      // SECURITY FIX: Enhanced access control with dev mode compatibility
      const isAnonymousStudent =
        !socket.isAuthenticated && socket.userId?.startsWith('anonymous-student');
      const isAuthenticatedStudent =
        socket.isAuthenticated &&
        socket.userId &&
        (socket.userRole === 'student' || socket.userRole === 'admin' || socket.userRole === 'driver');

      if (!isAnonymousStudent && !isAuthenticatedStudent) {
        // Only reject if it's neither anonymous student nor authenticated user with valid role
        if (
          socket.userRole &&
          socket.userRole !== 'student' &&
          socket.userRole !== 'admin' &&
          socket.userRole !== 'driver'
        ) {
          emitError(
            socket,
            'Valid role required for student map access',
            SocketErrorCodes.INSUFFICIENT_PERMISSIONS
          );
          return;
        }

        // Check if anonymous access is allowed (dev mode compatible)
        const allowAnonymous = process.env.ALLOW_ANONYMOUS_STUDENTS === 'true';

        if (!socket.userRole && !socket.userId) {
          if (!allowAnonymous && process.env.NODE_ENV === 'production') {
            emitError(
              socket,
              'Authentication required in production mode',
              SocketErrorCodes.AUTHENTICATION_REQUIRED
            );
            return;
          }

          // Set anonymous student ID with unique identifier
          socket.userId = `anonymous-student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          socket.userRole = 'student';
          socket.isAuthenticated = false;
        } else {
          emitError(socket, 'Authentication required', SocketErrorCodes.NOT_AUTHENTICATED);
          return;
        }
      }

      socket.lastActivity = Date.now();
      socket.join(SocketRooms.STUDENTS);

      const isAnonymous = socket.userId?.startsWith('anonymous-student') || false;
      const responseUserId = isAnonymous ? 'anonymous' : socket.userId;

      logger.websocket('Student connected successfully', {
        socketId: socket.id,
        userId: responseUserId,
        isAnonymous: isAnonymous,
        isAuthenticated: socket.isAuthenticated,
        userRole: socket.userRole,
      });

      socket.emit(SocketEvents.STUDENT_CONNECTED, {
        timestamp: new Date().toISOString(),
        userId: responseUserId,
        isAnonymous: isAnonymous,
      });
    } catch (error) {
      logger.error('Error handling student connection', 'websocket', { socketId: socket.id }, error as Error);
      emitError(socket, 'Failed to process student connection', SocketErrorCodes.CONNECTION_ERROR);
    }
  });
}

