"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gracefulShutdown = gracefulShutdown;
exports.setupShutdownHandlers = setupShutdownHandlers;
const WebSocketHealthService_1 = require("../services/WebSocketHealthService");
const database_1 = require("../config/database");
const MonitoringService_1 = require("../services/MonitoringService");
const performanceGuard_1 = require("../utils/performanceGuard");
const systemValidator_1 = require("../utils/systemValidator");
const memoryOptimization_1 = require("../middleware/memoryOptimization");
const logRotation_1 = require("../utils/logRotation");
const LocationArchiveService_1 = require("../services/LocationArchiveService");
const RedisCacheService_1 = require("../services/RedisCacheService");
const logger_1 = require("../utils/logger");
async function gracefulShutdown(io, server, signal) {
    logger_1.logger.info(`${signal} received, shutting down gracefully...`, 'server');
    try {
        io.close();
        WebSocketHealthService_1.webSocketHealth.stop();
        logger_1.logger.info('WebSocket connections closed', 'server');
        (0, database_1.stopDatabaseMonitoring)();
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
        await (0, database_1.closeDatabasePool)();
        logger_1.logger.info('Database connections closed', 'server');
        server.close(() => {
            logger_1.logger.info('HTTP server closed', 'server');
            process.exit(0);
        });
        setTimeout(() => {
            logger_1.logger.error('Forced shutdown after timeout', 'server');
            process.exit(1);
        }, 10000);
    }
    catch (error) {
        logger_1.logger.error('Error during shutdown', 'server', { error: String(error) });
        process.exit(1);
    }
}
function setupShutdownHandlers(io, server) {
    process.on('SIGTERM', () => gracefulShutdown(io, server, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(io, server, 'SIGINT'));
    process.on('uncaughtException', (error) => {
        logger_1.logger.error('Uncaught Exception', 'server', { error: String(error) });
        gracefulShutdown(io, server, 'Uncaught Exception');
    });
    process.on('unhandledRejection', (reason, promise) => {
        logger_1.logger.error('Unhandled Rejection', 'server', { reason: String(reason), promise: String(promise) });
        gracefulShutdown(io, server, 'Unhandled Rejection');
    });
}
//# sourceMappingURL=shutdown.js.map