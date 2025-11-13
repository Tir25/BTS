/**
 * WebSocket Event Names Constants
 * Centralized event name definitions to prevent typos and ensure consistency
 */

export const SocketEvents = {
  // Driver Events
  DRIVER_INITIALIZE: 'driver:initialize',
  DRIVER_INITIALIZED: 'driver:initialized',
  DRIVER_INITIALIZATION_FAILED: 'driver:initialization_failed',
  DRIVER_LOCATION_UPDATE: 'driver:locationUpdate',
  DRIVER_LOCATION_CONFIRMED: 'driver:locationConfirmed',
  DRIVER_LOCATION_RATE_LIMITED: 'driver:locationRateLimited',
  DRIVER_REQUEST_ASSIGNMENT_UPDATE: 'driver:requestAssignmentUpdate',
  DRIVER_ASSIGNMENT_UPDATE: 'driver:assignmentUpdate',
  DRIVER_CONNECTED: 'driver:connected',
  DRIVER_DISCONNECTED: 'driver:disconnected',

  // Student Events
  STUDENT_CONNECT: 'student:connect',
  STUDENT_CONNECTED: 'student:connected',
  STUDENT_DISCONNECTED: 'student:disconnected',

  // Bus Events
  BUS_LOCATION_UPDATE: 'bus:locationUpdate',
  BUS_ARRIVING: 'bus:arriving',

  // Admin Events
  ADMIN_BROADCAST: 'admin:broadcast',

  // Error Events
  ERROR: 'error',

  // System Events
  PING: 'ping',
  PONG: 'pong',
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
} as const;

/**
 * Socket Room Names
 */
export const SocketRooms = {
  STUDENTS: 'students',
  DRIVER: (driverId: string) => `driver:${driverId}`,
  BUS: (busId: string) => `bus:${busId}`,
} as const;

/**
 * Error Codes
 */
export const SocketErrorCodes = {
  SERVER_FULL: 'SERVER_FULL',
  IP_LIMIT_EXCEEDED: 'IP_LIMIT_EXCEEDED',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  NO_BUS_ASSIGNED: 'NO_BUS_ASSIGNED',
  INIT_ERROR: 'INIT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SAVE_ERROR: 'SAVE_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  ASSIGNMENT_UPDATE_ERROR: 'ASSIGNMENT_UPDATE_ERROR',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
} as const;

