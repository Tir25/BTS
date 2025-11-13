/**
 * WebSocket Server Configuration
 * Initializes and configures the Socket.IO server
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Application } from 'express';
import { initializeWebSocket } from '../websocket/socketServer';
import { webSocketHealth } from '../services/WebSocketHealthService';
import config from '../config/environment';
import { logger } from '../utils/logger';

/**
 * Creates HTTP server and Socket.IO server
 */
export function createServerWithSocket(app: Application): { server: ReturnType<typeof createServer>; io: SocketIOServer } {
  const server = createServer(app);
  const io = new SocketIOServer(server, {
    cors: config.websocket.cors,
  });

  return { server, io };
}

/**
 * Initializes WebSocket server with all handlers
 */
export function initializeSocketServer(io: SocketIOServer): void {
  logger.info('🔌 Initializing WebSocket server...', 'server');
  initializeWebSocket(io);
  
  // Initialize WebSocket health monitoring
  webSocketHealth.initialize(io);
  logger.info('📊 WebSocket health monitoring started', 'server');
}

