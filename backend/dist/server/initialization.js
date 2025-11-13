"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeServices = initializeServices;
const RedisCacheService_1 = require("../services/RedisCacheService");
const database_1 = require("../models/database");
const database_2 = require("../config/database");
const envValidation_1 = require("../config/envValidation");
const MonitoringService_1 = require("../services/MonitoringService");
const performanceGuard_1 = require("../utils/performanceGuard");
const systemValidator_1 = require("../utils/systemValidator");
const LocationArchiveService_1 = require("../services/LocationArchiveService");
const logger_1 = require("../utils/logger");
async function initializeServices() {
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
    MonitoringService_1.monitoringService.start();
    logger_1.logger.info('📈 Comprehensive monitoring service started', 'server');
    performanceGuard_1.performanceGuard.startMonitoring();
    logger_1.logger.info('🛡️ Performance guard started', 'server');
    systemValidator_1.systemValidator.startValidation();
    logger_1.logger.info('🔍 System validator started', 'server');
    LocationArchiveService_1.locationArchiveService.startAutoArchive(60);
    LocationArchiveService_1.locationArchiveService.startAutoCleanup(24);
    logger_1.logger.info('📦 Location archive service started', 'server');
}
//# sourceMappingURL=initialization.js.map