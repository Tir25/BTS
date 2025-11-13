/**
 * Server Entry Point
 * Main server initialization that orchestrates all components
 */

import { createApp } from './app';
import { registerRoutes } from './routes';
import { createServerWithSocket, initializeSocketServer } from './socket';
import { setupShutdownHandlers } from './shutdown';
import { initializeServices } from './initialization';
import { setupMemoryMonitoring } from './monitoring';
import { SERVER_CONFIG } from './config/serverConfig';
import { notFoundHandler, globalErrorHandler } from '../middleware/errorHandler';
import { errorMonitoring } from '../middleware/monitoring';
import { logger } from '../utils/logger';

/**
 * Starts the server with all services initialized
 */
async function startServer(): Promise<void> {
  try {
    logger.info('🚀 Starting University Bus Tracking System Backend...', 'server');

    // Create Express app with all middleware
    const app = createApp();

    // Register all routes (must be before error handlers)
    registerRoutes(app);

    // Enhanced error handling middleware (must be last, after routes)
    app.use(errorMonitoring);
    app.use(globalErrorHandler);
    app.use(notFoundHandler);

    // Create HTTP server and Socket.IO server
    const { server, io } = createServerWithSocket(app);

    // Setup shutdown handlers
    setupShutdownHandlers(io, server);

    // Setup memory monitoring
    setupMemoryMonitoring();

    // Initialize all services (database, Redis, monitoring, etc.)
    await initializeServices();

    // Initialize WebSocket server
    initializeSocketServer(io);

    // Start server
    logger.info(`🌐 Starting server on port ${SERVER_CONFIG.PORT}...`, 'server');
    server.listen(SERVER_CONFIG.PORT, '0.0.0.0', () => {
      logger.serverReady(SERVER_CONFIG.PORT);
      logger.info(`📊 Health check: http://localhost:${SERVER_CONFIG.PORT}/health`, 'server');
      logger.info(`📈 Detailed health: http://localhost:${SERVER_CONFIG.PORT}/health/detailed`, 'server');
      logger.info(`🔗 API base: http://localhost:${SERVER_CONFIG.PORT}`, 'server');
      logger.info(`🌍 Network access: http://0.0.0.0:${SERVER_CONFIG.PORT}`, 'server');
      logger.info(`🔌 WebSocket server: ws://localhost:${SERVER_CONFIG.PORT}`, 'server');
      logger.info(`🌐 WebSocket network: ws://0.0.0.0:${SERVER_CONFIG.PORT}`, 'server');
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', 'server', { error: (error as Error).message, stack: (error as Error).stack });
    process.exit(1);
  }
}

// Start the server
startServer();

