"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = require("../middleware/cors");
const corsEnhanced_1 = require("../middleware/corsEnhanced");
const errorHandler_1 = require("../middleware/errorHandler");
const requestId_1 = require("../middleware/requestId");
const security_1 = require("../middleware/security");
const securityEnhanced_1 = require("../middleware/securityEnhanced");
const performance_1 = require("../middleware/performance");
const monitoring_1 = require("../middleware/monitoring");
const redisCache_1 = require("../middleware/redisCache");
const memoryOptimization_1 = require("../middleware/memoryOptimization");
const logRotation_1 = require("../utils/logRotation");
const deadCodeDetector_1 = require("../utils/deadCodeDetector");
const rateLimit_1 = require("../middleware/rateLimit");
const environment_1 = __importDefault(require("../config/environment"));
const logger_1 = require("../utils/logger");
const serverConfig_1 = require("./config/serverConfig");
function createApp() {
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    process.on('unhandledRejection', errorHandler_1.unhandledRejectionHandler);
    process.on('uncaughtException', errorHandler_1.uncaughtExceptionHandler);
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
    app.use((0, performance_1.requestSizeLimit)(serverConfig_1.SERVER_CONFIG.MAX_BODY_SIZE));
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
        limit: serverConfig_1.SERVER_CONFIG.MAX_REQUEST_SIZE,
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
    app.use(express_1.default.urlencoded({ extended: true, limit: serverConfig_1.SERVER_CONFIG.MAX_REQUEST_SIZE }));
    app.use(requestId_1.addRequestIdToError);
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
    app.get('/cache/stats', redisCache_1.redisCacheStats);
    app.get('/cache/health', redisCache_1.redisCacheHealth);
    app.post('/cache/clear', redisCache_1.redisCacheClear);
    app.get('/memory/stats', memoryOptimization_1.getMemoryStats);
    app.post('/memory/gc', memoryOptimization_1.forceGarbageCollection);
    app.get('/logs/rotation/stats', logRotation_1.getLogRotationStats);
    app.post('/logs/rotation/force', logRotation_1.forceLogRotation);
    app.get('/dead-code/detect', deadCodeDetector_1.detectDeadCode);
    app.get('/dead-code/report', deadCodeDetector_1.getDeadCodeReport);
    return app;
}
//# sourceMappingURL=app.js.map