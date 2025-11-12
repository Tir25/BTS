"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = require("./middleware/cors");
const corsEnhanced_1 = require("./middleware/corsEnhanced");
const errorHandler_1 = require("./middleware/errorHandler");
const requestId_1 = require("./middleware/requestId");
const security_1 = require("./middleware/security");
const securityEnhanced_1 = require("./middleware/securityEnhanced");
const performance_1 = require("./middleware/performance");
const monitoring_1 = require("./middleware/monitoring");
const redisCache_1 = require("./middleware/redisCache");
const RedisCacheService_1 = require("./services/RedisCacheService");
const logger_1 = require("./utils/logger");
const health_1 = __importDefault(require("./routes/health"));
const auth_1 = __importDefault(require("./routes/auth"));
const buses_1 = __importDefault(require("./routes/buses"));
const routes_1 = __importDefault(require("./routes/routes"));
const admin_1 = __importDefault(require("./routes/admin"));
const productionAssignments_1 = __importDefault(require("./routes/productionAssignments"));
const optimizedAssignments_1 = __importDefault(require("./routes/optimizedAssignments"));
const storage_1 = __importDefault(require("./routes/storage"));
const tracking_1 = __importDefault(require("./routes/tracking"));
const student_1 = __importDefault(require("./routes/student"));
const locations_1 = __importDefault(require("./routes/locations"));
const sse_1 = __importDefault(require("./routes/sse"));
const database_1 = require("./models/database");
const database_2 = require("./config/database");
const environment_1 = __importDefault(require("./config/environment"));
const envValidation_1 = require("./config/envValidation");
const websocket_1 = require("./sockets/websocket");
const WebSocketHealthService_1 = require("./services/WebSocketHealthService");
const MonitoringService_1 = require("./services/MonitoringService");
const monitoring_2 = __importDefault(require("./routes/monitoring"));
const performanceGuard_1 = require("./utils/performanceGuard");
const systemValidator_1 = require("./utils/systemValidator");
const memoryOptimization_1 = require("./middleware/memoryOptimization");
const logRotation_1 = require("./utils/logRotation");
const deadCodeDetector_1 = require("./utils/deadCodeDetector");
const LocationArchiveService_1 = require("./services/LocationArchiveService");
const rateLimit_1 = require("./middleware/rateLimit");
const app = (0, express_1.default)();
app.set('trust proxy', 1);
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: environment_1.default.websocket.cors,
});
const PORT = environment_1.default.port;
const DEMO_MODE = process.env.DEMO_MODE === 'true';
process.on('unhandledRejection', errorHandler_1.unhandledRejectionHandler);
process.on('uncaughtException', errorHandler_1.uncaughtExceptionHandler);
const MEMORY_WARNING_THRESHOLD = 300 * 1024 * 1024;
const MEMORY_CRITICAL_THRESHOLD = 350 * 1024 * 1024;
const MEMORY_EMERGENCY_THRESHOLD = 400 * 1024 * 1024;
setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const memoryMB = Math.round(heapUsed / 1024 / 1024);
    if (heapUsed > MEMORY_WARNING_THRESHOLD) {
        logger_1.logger.warn('Memory usage warning', 'server', {
            memoryMB,
            heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external,
            rss: memoryUsage.rss,
            threshold: 'WARNING'
        });
    }
    if (heapUsed > MEMORY_CRITICAL_THRESHOLD && global.gc) {
        logger_1.logger.warn('Memory usage critical - triggering garbage collection', 'server', {
            memoryMB,
            threshold: 'CRITICAL'
        });
        global.gc();
        const postGcMemory = process.memoryUsage();
        const postGcMB = Math.round(postGcMemory.heapUsed / 1024 / 1024);
        logger_1.logger.info('Garbage collection completed', 'server', {
            beforeMB: memoryMB,
            afterMB: postGcMB,
            reduction: memoryMB - postGcMB
        });
    }
    if (heapUsed > MEMORY_EMERGENCY_THRESHOLD) {
        logger_1.logger.error('Memory usage emergency - considering restart', 'server', {
            memoryMB,
            threshold: 'EMERGENCY'
        });
        if (process.env.NODE_ENV === 'production') {
            logger_1.logger.error('Emergency memory threshold exceeded - graceful shutdown initiated', 'server');
            gracefulShutdown('MEMORY_EMERGENCY');
        }
    }
}, 2 * 60 * 1000);
app.use(requestId_1.requestIdMiddleware);
app.use(memoryOptimization_1.memoryOptimizationMiddleware);
app.use(memoryOptimization_1.memoryLeakDetection);
app.use(securityEnhanced_1.securityManager.getHelmetConfig());
app.use(securityEnhanced_1.securityHeaders);
app.use(security_1.securityMiddleware);
app.use(security_1.validateRequest);
app.use(security_1.corsSecurity);
app.use(securityEnhanced_1.requestValidator);
app.use(securityEnhanced_1.requestSizeValidator);
app.use(performance_1.performanceMonitor);
app.use(performance_1.memoryMonitor);
app.use(performance_1.compressionMonitor);
app.use((0, performance_1.requestSizeLimit)(50 * 1024 * 1024));
app.use(monitoring_1.requestMonitoring);
app.use(monitoring_1.memoryMonitoring);
app.use(monitoring_1.performanceMonitoring);
app.use(corsEnhanced_1.corsMiddleware);
app.use(cors_1.handlePreflight);
const rateLimitingEnabled = process.env.DISABLE_RATE_LIMIT?.toLowerCase() !== 'true' &&
    environment_1.default.security.enableRateLimit;
if (process.env.NODE_ENV === 'production' && rateLimitingEnabled) {
    app.use(rateLimit_1.rateLimitMiddleware);
}
else if (!rateLimitingEnabled) {
    logger_1.logger.info('🚫 Rate limiting disabled via configuration', 'server');
}
app.use(express_1.default.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        if (req.headers['content-type']?.includes('application/json')) {
            try {
                JSON.parse(buf.toString());
            }
            catch (e) {
                logger_1.logger.warn('Invalid JSON received', 'server', {
                    error: e.message,
                    contentLength: buf.length,
                    contentType: req.headers['content-type']
                });
            }
        }
    }
}));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestId_1.addRequestIdToError);
app.use('/health', health_1.default);
app.use('/auth', process.env.NODE_ENV === 'production' && rateLimitingEnabled
    ? rateLimit_1.authRateLimit
    : (req, _res, next) => next(), auth_1.default);
app.use('/admin', securityEnhanced_1.fileUploadValidator, admin_1.default);
app.use('/assignments', productionAssignments_1.default);
app.use('/production-assignments', productionAssignments_1.default);
app.use('/assignments-optimized', optimizedAssignments_1.default);
app.use('/buses', (0, redisCache_1.smartCacheMiddleware)({
    dataTypeTTL: { 'buses': 600 }
}), buses_1.default);
app.use('/routes', (0, redisCache_1.smartCacheMiddleware)({
    dataTypeTTL: { 'routes': 1800 }
}), routes_1.default);
app.use('/storage', securityEnhanced_1.fileUploadValidator, storage_1.default);
app.use('/locations', (0, redisCache_1.smartCacheMiddleware)({
    dataTypeTTL: { 'locations': 60 }
}), locations_1.default);
app.use('/tracking', tracking_1.default);
app.use('/student', student_1.default);
app.use('/sse', sse_1.default);
app.use('/monitoring', monitoring_2.default);
app.get('/cache/stats', redisCache_1.redisCacheStats);
app.get('/cache/health', redisCache_1.redisCacheHealth);
app.post('/cache/clear', redisCache_1.redisCacheClear);
app.get('/memory/stats', memoryOptimization_1.getMemoryStats);
app.post('/memory/gc', memoryOptimization_1.forceGarbageCollection);
app.get('/logs/rotation/stats', logRotation_1.getLogRotationStats);
app.post('/logs/rotation/force', logRotation_1.forceLogRotation);
app.get('/dead-code/detect', deadCodeDetector_1.detectDeadCode);
app.get('/dead-code/report', deadCodeDetector_1.getDeadCodeReport);
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
            assignments: '/assignments',
            productionAssignments: '/production-assignments',
            buses: '/buses',
            routes: '/routes',
            storage: '/storage',
            locations: '/locations',
            sse: '/sse',
        },
    });
});
app.use(monitoring_1.errorMonitoring);
app.use(errorHandler_1.globalErrorHandler);
app.use(errorHandler_1.notFoundHandler);
const startServer = async () => {
    try {
        logger_1.logger.info('🚀 Starting University Bus Tracking System Backend...', 'server');
        const isProduction = process.env.NODE_ENV === 'production';
        logger_1.logger.info('🔧 Validating environment variables...', 'server');
        try {
            (0, envValidation_1.validateEnvironment)();
            logger_1.logger.info('✅ Environment variables validated', 'server');
        }
        catch (envError) {
            logger_1.logger.error('❌ Environment validation failed:', 'server', { error: envError.message });
            logger_1.logger.error('💡 Please check your .env file and ensure all required variables are set', 'server');
            throw envError;
        }
        logger_1.logger.info('🔴 Initializing Redis cache...', 'server');
        let redisReady = false;
        try {
            await RedisCacheService_1.redisCache.connect();
            logger_1.logger.info('✅ Redis cache initialized successfully', 'server');
            redisReady = true;
        }
        catch (redisError) {
            logger_1.logger.error('❌ Redis cache initialization failed:', 'server', { error: redisError.message });
            if (!isProduction) {
                logger_1.logger.warn('💡 Continuing without Redis cache for development...', 'server');
            }
            else {
                throw redisError;
            }
        }
        logger_1.logger.info('🗄️ Initializing database connection...', 'server');
        let dbReady = false;
        try {
            await (0, database_1.initializeDatabase)();
            logger_1.logger.info('✅ Database initialized successfully', 'server');
            dbReady = true;
        }
        catch (dbError) {
            logger_1.logger.error('❌ Database initialization failed:', 'server', { error: dbError.message });
            if (!isProduction) {
                logger_1.logger.warn('💡 Continuing without database connection for development...', 'server');
            }
            else {
                throw dbError;
            }
        }
        logger_1.logger.info('🔍 Testing database connection...', 'server');
        try {
            await (0, database_1.testDatabaseConnection)();
            logger_1.logger.databaseConnected();
            logger_1.logger.info('✅ Database connection test passed', 'server');
            (0, database_2.startDatabaseMonitoring)();
            logger_1.logger.info('📊 Database monitoring started', 'server');
        }
        catch (dbTestError) {
            if (!isProduction) {
                logger_1.logger.warn('⚠️ Database connection test failed:', 'server', { error: dbTestError.message });
                logger_1.logger.warn('💡 Continuing without database for development...', 'server');
            }
            else {
                throw dbTestError;
            }
        }
        logger_1.logger.info('🔌 Initializing WebSocket server...', 'server');
        (0, websocket_1.initializeWebSocket)(io);
        WebSocketHealthService_1.webSocketHealth.initialize(io);
        logger_1.logger.info('📊 WebSocket health monitoring started', 'server');
        MonitoringService_1.monitoringService.start();
        logger_1.logger.info('📈 Comprehensive monitoring service started', 'server');
        performanceGuard_1.performanceGuard.startMonitoring();
        logger_1.logger.info('🛡️ Performance guard started', 'server');
        systemValidator_1.systemValidator.startValidation();
        logger_1.logger.info('🔍 System validator started', 'server');
        LocationArchiveService_1.locationArchiveService.startAutoArchive(60);
        LocationArchiveService_1.locationArchiveService.startAutoCleanup(24);
        logger_1.logger.info('📦 Location archive service started', 'server');
        logger_1.logger.info(`🌐 Starting server on port ${PORT}...`, 'server');
        server.listen(PORT, '0.0.0.0', () => {
            logger_1.logger.serverReady(PORT);
            logger_1.logger.info(`📊 Health check: http://localhost:${PORT}/health`, 'server');
            logger_1.logger.info(`📈 Detailed health: http://localhost:${PORT}/health/detailed`, 'server');
            logger_1.logger.info(`🔗 API base: http://localhost:${PORT}`, 'server');
            logger_1.logger.info(`🌍 Network access: http://0.0.0.0:${PORT}`, 'server');
            logger_1.logger.info(`🔌 WebSocket server: ws://localhost:${PORT}`, 'server');
            logger_1.logger.info(`🌐 WebSocket network: ws://0.0.0.0:${PORT}`, 'server');
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to start server:', 'server', { error: error.message, stack: error.stack });
        process.exit(1);
    }
};
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`${signal} received, shutting down gracefully...`, 'server');
    try {
        io.close();
        WebSocketHealthService_1.webSocketHealth.stop();
        logger_1.logger.info('WebSocket connections closed', 'server');
        (0, database_2.stopDatabaseMonitoring)();
        logger_1.logger.info('Database monitoring stopped', 'server');
        MonitoringService_1.monitoringService.stop();
        logger_1.logger.info('Monitoring service stopped', 'server');
        performanceGuard_1.performanceGuard.stopMonitoring();
        logger_1.logger.info('Performance guard stopped', 'server');
        systemValidator_1.systemValidator.stopValidation();
        logger_1.logger.info('System validator stopped', 'server');
        memoryOptimization_1.memoryOptimizer.stop();
        logger_1.logger.info('Memory optimizer stopped', 'server');
        logRotation_1.logRotator.stop();
        logger_1.logger.info('Log rotator stopped', 'server');
        LocationArchiveService_1.locationArchiveService.stop();
        logger_1.logger.info('Location archive service stopped', 'server');
        await RedisCacheService_1.redisCache.disconnect();
        logger_1.logger.info('Redis cache connection closed', 'server');
        await (0, database_2.closeDatabasePool)();
        logger_1.logger.info('Database connections closed', 'server');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Error during shutdown', 'server', { error: String(error) });
        process.exit(1);
    }
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception', 'server', { error: String(error) });
    gracefulShutdown('Uncaught Exception');
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection', 'server', { reason: String(reason), promise: String(promise) });
    gracefulShutdown('Unhandled Rejection');
});
startServer();
//# sourceMappingURL=server.js.map