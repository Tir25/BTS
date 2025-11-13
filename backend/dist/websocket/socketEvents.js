"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketErrorCodes = exports.SocketRooms = exports.SocketEvents = void 0;
exports.SocketEvents = {
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
    STUDENT_CONNECT: 'student:connect',
    STUDENT_CONNECTED: 'student:connected',
    STUDENT_DISCONNECTED: 'student:disconnected',
    BUS_LOCATION_UPDATE: 'bus:locationUpdate',
    BUS_ARRIVING: 'bus:arriving',
    ADMIN_BROADCAST: 'admin:broadcast',
    ERROR: 'error',
    PING: 'ping',
    PONG: 'pong',
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
};
exports.SocketRooms = {
    STUDENTS: 'students',
    DRIVER: (driverId) => `driver:${driverId}`,
    BUS: (busId) => `bus:${busId}`,
};
exports.SocketErrorCodes = {
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
};
//# sourceMappingURL=socketEvents.js.map