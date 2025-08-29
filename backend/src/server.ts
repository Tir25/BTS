import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { corsMiddleware, handlePreflight } from './middleware/cors';
import { rateLimitMiddleware } from './middleware/rateLimit';
import healthRoutes from './routes/health';
import busRoutes from './routes/buses';
import routeRoutes from './routes/routes';
import adminRoutes from './routes/admin';
import storageRoutes from './routes/storage';
import locationRoutes from './routes/locations';
import { initializeDatabase, testDatabaseConnection } from './models/database';
import { closeDatabasePool } from './config/database';
import { initializeEnvironment } from './config/environment';
import { initializeWebSocket } from './sockets/websocket';

// Initialize environment configuration
const config = initializeEnvironment();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: config.websocket.cors,
});

const PORT = config.port;

// Security middleware
app.use(helmet());

// CORS middleware
app.use(corsMiddleware);
app.use(handlePreflight);

// Rate limiting
app.use(rateLimitMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRoutes);
app.use('/admin', adminRoutes);
app.use('/buses', busRoutes);
app.use('/routes', routeRoutes);
app.use('/storage', storageRoutes);
app.use('/locations', locationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'University Bus Tracking System API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      healthDetailed: '/health/detailed',
      admin: '/admin',
      buses: '/buses',
      routes: '/routes',
      storage: '/storage',
      locations: '/locations',
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    availableEndpoints: [
      '/',
      '/health',
      '/health/detailed',
      '/buses',
      '/routes',
      '/admin',
      '/storage',
      '/locations',
    ],
  });
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    _next: express.NextFunction
  ) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'Something went wrong',
      timestamp: new Date().toISOString(),
    });
  }
);

// Initialize server with enhanced error handling
const startServer = async () => {
  try {
    console.log('🚀 Starting University Bus Tracking System...');
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Port: ${PORT}`);

    // Initialize database with retry logic
    console.log('🔄 Initializing database...');
    await initializeDatabase();

    // Test database connection
    // Testing database connection...
    await testDatabaseConnection();

    // Initialize WebSocket server
    console.log('🔄 Initializing WebSocket server...');
    initializeWebSocket(io);

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log('🎉 Server started successfully!');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(
        `📊 Detailed health: http://localhost:${PORT}/health/detailed`
      );
      console.log(`🌐 API base: http://localhost:${PORT}`);
      console.log(`🌐 Network access: http://192.168.1.2:${PORT}`);
      console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}`);
      console.log(`🔌 WebSocket network: ws://192.168.1.2:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error(
      '💡 Please check your database connection and environment variables'
    );
    process.exit(1);
  }
};

// Enhanced graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`🛑 ${signal} received, shutting down gracefully...`);

  try {
    // Close WebSocket connections
    io.close();
    console.log('✅ WebSocket connections closed');

    // Close database connections
    await closeDatabasePool();
    console.log('✅ Database connections closed');

    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('Uncaught Exception');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('Unhandled Rejection');
});

// Start the server
startServer();
