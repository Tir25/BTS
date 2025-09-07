import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { corsMiddleware, handlePreflight } from './middleware/cors';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { errorHandler, notFoundHandler, setupGlobalErrorHandlers } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import busRoutes from './routes/buses';
import routeRoutes from './routes/routes';
import adminRoutes from './routes/admin';
import storageRoutes from './routes/storage';
import locationRoutes from './routes/locations';
import sseRoutes from './routes/sse';
import { initializeDatabase, testDatabaseConnection } from './models/database';
import { closeDatabasePool, pool } from './config/database';
import { initializeEnvironment } from './config/environment';
import { initializeWebSocket } from './sockets/websocket';
import { performanceMiddleware } from './middleware/performanceMiddleware';
import { performanceMonitor } from './services/PerformanceMonitor';
import metricsRoutes from './routes/metrics';

// Initialize environment configuration
const config = initializeEnvironment();

// System metrics collection
const startSystemMetricsCollection = () => {
  setInterval(() => {
    try {
      performanceMonitor.recordSystemMetrics({
        activeConnections: io.engine.clientsCount,
        databaseConnections: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        },
        websocketConnections: io.engine.clientsCount,
      });
    } catch (error) {
      console.error('❌ Error collecting system metrics:', error);
    }
  }, 30000); // Collect every 30 seconds
};

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    // Use environment-based origin validation
    origin: config.cors.allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'User-Agent',
      'Accept',
      'Origin'
    ],
    credentials: true,
    // Firefox-specific CORS settings
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  // Use polling first, then upgrade to WebSocket for better compatibility
  transports: ['polling', 'websocket'],
  allowEIO3: true, // Allow Engine.IO v3 clients for better compatibility
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 10000, // 10 seconds
  maxHttpBufferSize: 1e6, // 1MB
  // Disable per-message deflate to fix Firefox WebSocket issues
  perMessageDeflate: false,
  // Enhanced request validation for WebSocket connections
  allowRequest: (req, callback) => {
    const origin = req.headers.origin;
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Validate origin against allowed origins
    const isAllowed = config.cors.allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`🚫 WebSocket: Blocked connection from origin: ${origin}`);
      callback('Origin not allowed', false);
    }
  }
});

const PORT = config.port;

// Security middleware
app.use(helmet());

// Performance monitoring middleware (add early to track all requests)
app.use(performanceMiddleware);

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
app.use('/sse', sseRoutes);
app.use('/metrics', metricsRoutes);

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
        sse: '/sse',
        metrics: '/metrics',
      },
  });
});

// 404 handler
app.use('*', notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Setup global error handlers
setupGlobalErrorHandlers();

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
    console.log('🔄 Testing database connection...');
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
      console.log(`📈 Performance metrics: http://localhost:${PORT}/metrics`);
      console.log(`🌐 API base: http://localhost:${PORT}`);
      console.log(`🌐 Network access: http://192.168.1.2:${PORT}`);
      console.log(`🌐 Frontend network: http://192.168.1.2:5173`);
      console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}`);
      console.log(`🔌 WebSocket network: ws://192.168.1.2:${PORT}`);
      console.log(`📱 Mobile/Cross-laptop access: http://192.168.1.2:${PORT}`);
      
      // Start system metrics collection
      startSystemMetricsCollection();
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

// Start the server
startServer();
