"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = require("./middleware/cors");
const rateLimit_1 = require("./middleware/rateLimit");
const errorHandler_1 = require("./middleware/errorHandler");
const health_1 = __importDefault(require("./routes/health"));
const buses_1 = __importDefault(require("./routes/buses"));
const routes_1 = __importDefault(require("./routes/routes"));
const admin_1 = __importDefault(require("./routes/admin"));
const storage_1 = __importDefault(require("./routes/storage"));
const locations_1 = __importDefault(require("./routes/locations"));
const sse_1 = __importDefault(require("./routes/sse"));
const database_1 = require("./models/database");
const database_2 = require("./config/database");
const environment_1 = require("./config/environment");
const websocket_1 = require("./sockets/websocket");
const performanceMiddleware_1 = require("./middleware/performanceMiddleware");
const PerformanceMonitor_1 = require("./services/PerformanceMonitor");
const metrics_1 = __importDefault(require("./routes/metrics"));
const config = (0, environment_1.initializeEnvironment)();
const startSystemMetricsCollection = () => {
    setInterval(() => {
        try {
            PerformanceMonitor_1.performanceMonitor.recordSystemMetrics({
                activeConnections: io.engine.clientsCount,
                databaseConnections: {
                    total: database_2.pool.totalCount,
                    idle: database_2.pool.idleCount,
                    waiting: database_2.pool.waitingCount,
                },
                websocketConnections: io.engine.clientsCount,
            });
        }
        catch (error) {
            console.error('❌ Error collecting system metrics:', error);
        }
    }, 30000);
};
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
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
        preflightContinue: false,
        optionsSuccessStatus: 204
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e6,
    perMessageDeflate: false,
    allowRequest: (req, callback) => {
        const origin = req.headers.origin;
        if (!origin) {
            return callback(null, true);
        }
        const isAllowed = config.cors.allowedOrigins.some(allowedOrigin => {
            if (typeof allowedOrigin === 'string') {
                return allowedOrigin === origin;
            }
            else if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });
        if (isAllowed) {
            callback(null, true);
        }
        else {
            console.warn(`🚫 WebSocket: Blocked connection from origin: ${origin}`);
            callback('Origin not allowed', false);
        }
    }
});
const PORT = config.port;
app.use((0, helmet_1.default)());
app.use(performanceMiddleware_1.performanceMiddleware);
app.use(cors_1.corsMiddleware);
app.use(cors_1.handlePreflight);
app.use(rateLimit_1.rateLimitMiddleware);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/health', health_1.default);
app.use('/admin', admin_1.default);
app.use('/buses', buses_1.default);
app.use('/routes', routes_1.default);
app.use('/storage', storage_1.default);
app.use('/locations', locations_1.default);
app.use('/sse', sse_1.default);
app.use('/metrics', metrics_1.default);
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
app.use('*', errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
(0, errorHandler_1.setupGlobalErrorHandlers)();
const startServer = async () => {
    try {
        console.log('🚀 Starting University Bus Tracking System...');
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔧 Port: ${PORT}`);
        console.log('🔄 Initializing database...');
        await (0, database_1.initializeDatabase)();
        console.log('🔄 Testing database connection...');
        await (0, database_1.testDatabaseConnection)();
        console.log('🔄 Initializing WebSocket server...');
        (0, websocket_1.initializeWebSocket)(io);
        server.listen(PORT, '0.0.0.0', () => {
            console.log('🎉 Server started successfully!');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`📊 Detailed health: http://localhost:${PORT}/health/detailed`);
            console.log(`📈 Performance metrics: http://localhost:${PORT}/metrics`);
            console.log(`🌐 API base: http://localhost:${PORT}`);
            console.log(`🌐 Network access: http://192.168.1.2:${PORT}`);
            console.log(`🌐 Frontend network: http://192.168.1.2:5173`);
            console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}`);
            console.log(`🔌 WebSocket network: ws://192.168.1.2:${PORT}`);
            console.log(`📱 Mobile/Cross-laptop access: http://192.168.1.2:${PORT}`);
            startSystemMetricsCollection();
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        console.error('💡 Please check your database connection and environment variables');
        process.exit(1);
    }
};
const gracefulShutdown = async (signal) => {
    console.log(`🛑 ${signal} received, shutting down gracefully...`);
    try {
        io.close();
        console.log('✅ WebSocket connections closed');
        await (0, database_2.closeDatabasePool)();
        console.log('✅ Database connections closed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
startServer();
//# sourceMappingURL=server.js.map