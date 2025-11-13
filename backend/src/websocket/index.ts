/**
 * WebSocket Module Exports
 * Central export point for all WebSocket functionality
 */

export { initializeWebSocket, globalIO } from './socketServer';
export * from './socketEvents';
export * from './socketTypes';
export * from './socketUtils';
export { setupConnectionManager } from './connectionManager';
export { setupBusLocationHandler, cleanupLocationRateLimiter } from './busLocationHandler';
export { setupDriverHandler } from './driverHandler';
export { setupStudentHandler } from './studentHandler';
export { broadcastAssignmentUpdate, broadcastAssignmentRemoval, attachAdminBroadcastFunctions } from './adminHandler';

