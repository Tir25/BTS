/**
 * WebSocket Server
 * Main initialization file that sets up and coordinates all WebSocket handlers
 */

import { Server as SocketIOServer } from 'socket.io';
import { websocketAuthMiddleware } from '../middleware/websocketAuth';
import { logger } from '../utils/logger';
import { ConnectionStats, AuthenticatedSocket } from './socketTypes';
import { setupConnectionManager } from './connectionManager';
import { setupBusLocationHandler, cleanupLocationRateLimiter } from './busLocationHandler';
import { setupDriverHandler } from './driverHandler';
import { setupStudentHandler } from './studentHandler';
import { attachAdminBroadcastFunctions } from './adminHandler';

// Global WebSocket server instance
export let globalIO: SocketIOServer | null = null;

/**
 * Initialize WebSocket server with all handlers
 * PRODUCTION FIX: Enhanced initialization with comprehensive logging
 */
export function initializeWebSocket(io: SocketIOServer): SocketIOServer {
  // Store global reference to io for use in other services
  globalIO = io;
  logger.websocket('WebSocket server initialized', {
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: '1MB',
    allowEIO3: true,
  });

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
  
  logger.websocket('WebSocket authentication middleware applied');

  // Initialize connection statistics
  const connectionStats: ConnectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    connectionCounts: new Map<string, number>(),
    activeSockets: new Map<string, AuthenticatedSocket>(),
    connectionTimestamps: new Map<string, number>(),
    heartbeatIntervals: new Map<string, NodeJS.Timeout>(),
  };

  // Setup connection manager (handles connect/disconnect and monitoring)
  setupConnectionManager(io, connectionStats);

  // Setup handlers for each socket connection
  io.on('connection', (socket: AuthenticatedSocket) => {
    // Setup driver handler
    setupDriverHandler(socket);

    // Setup bus location handler
    setupBusLocationHandler(io, socket);

    // Setup student handler
    setupStudentHandler(socket);

    // Cleanup location rate limiter on disconnect
    socket.on('disconnect', () => {
      cleanupLocationRateLimiter(socket.id);
    });
  });

  // Attach admin broadcast functions to io instance
  attachAdminBroadcastFunctions(io);

  // Store global reference to io for use in other services
  globalIO = io;

  return io;
}

