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
const health_1 = __importDefault(require("./routes/health"));
const buses_1 = __importDefault(require("./routes/buses"));
const routes_1 = __importDefault(require("./routes/routes"));
const admin_1 = __importDefault(require("./routes/admin"));
const storage_1 = __importDefault(require("./routes/storage"));
const locations_1 = __importDefault(require("./routes/locations"));
const database_1 = require("./models/database");
const database_2 = require("./config/database");
const environment_1 = require("./config/environment");
const websocket_1 = require("./sockets/websocket");
const config = (0, environment_1.initializeEnvironment)();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: config.websocket.cors.origin,
        credentials: config.websocket.cors.credentials,
        methods: config.websocket.cors.methods,
        allowedHeaders: ['Content-Type', 'Authorization'],
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e6,
    connectTimeout: 45000,
});
const PORT = config.port;
app.use((0, helmet_1.default)());
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
app.use((err, req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development'
            ? err.message
            : 'Something went wrong',
        timestamp: new Date().toISOString(),
    });
});
const startServer = async () => {
    try {
        console.log('🚀 Starting University Bus Tracking System...');
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔧 Port: ${PORT}`);
        console.log('🔄 Initializing database...');
        await (0, database_1.initializeDatabase)();
        await (0, database_1.testDatabaseConnection)();
        console.log('🔄 Initializing WebSocket server...');
        (0, websocket_1.initializeWebSocket)(io);
        server.listen(PORT, '0.0.0.0', () => {
            console.log('🎉 Server started successfully!');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`📊 Detailed health: http://localhost:${PORT}/health/detailed`);
            console.log(`🌐 API base: http://localhost:${PORT}`);
            console.log(`🌐 Network access: http://192.168.1.2:${PORT}`);
            console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}`);
            console.log(`🔌 WebSocket network: ws://192.168.1.2:${PORT}`);
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
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('Uncaught Exception');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('Unhandled Rejection');
});
startServer();
//# sourceMappingURL=server.js.map