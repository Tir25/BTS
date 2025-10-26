"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPoolMetrics = exports.stopDatabaseMonitoring = exports.startDatabaseMonitoring = exports.initializeDatabase = exports.queryWithRetry = exports.closeDatabasePool = exports.checkDatabaseHealth = exports.pool = void 0;
const pg_1 = require("pg");
const environment_1 = __importDefault(require("./environment"));
const logger_1 = require("../utils/logger");
const ConnectionPoolMonitor_1 = require("../services/ConnectionPoolMonitor");
const poolConfig = {
    connectionString: environment_1.default.database.url,
    max: environment_1.default.database.poolMax,
    idleTimeoutMillis: environment_1.default.database.poolIdleTimeout,
    connectionTimeoutMillis: environment_1.default.database.poolConnectionTimeout,
    maxUses: 7500,
    ssl: environment_1.default.nodeEnv === 'production'
        ? { rejectUnauthorized: false }
        : false,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
};
exports.pool = new pg_1.Pool(poolConfig);
exports.pool.on('error', (err) => {
    logger_1.logger.error('Unexpected error on idle client', 'database', {
        error: err.message,
        stack: err.stack,
        poolStats: {
            totalCount: exports.pool.totalCount,
            idleCount: exports.pool.idleCount,
            waitingCount: exports.pool.waitingCount
        }
    });
    console.error('Database pool error:', err.message);
});
exports.pool.on('connect', (client) => {
    logger_1.logger.info('New database client connected', 'database', {
        poolStats: {
            totalCount: exports.pool.totalCount,
            idleCount: exports.pool.idleCount,
            waitingCount: exports.pool.waitingCount
        }
    });
});
exports.pool.on('acquire', (client) => {
    logger_1.logger.debug('Database client acquired from pool', 'database', {
        poolStats: {
            totalCount: exports.pool.totalCount,
            idleCount: exports.pool.idleCount,
            waitingCount: exports.pool.waitingCount
        }
    });
});
exports.pool.on('remove', (client) => {
    logger_1.logger.debug('Database client removed from pool', 'database', {
        poolStats: {
            totalCount: exports.pool.totalCount,
            idleCount: exports.pool.idleCount,
            waitingCount: exports.pool.waitingCount
        }
    });
});
const checkDatabaseHealth = async () => {
    let client = null;
    const startTime = Date.now();
    try {
        client = await exports.pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as db_version, pg_postmaster_start_time() as start_time');
        const responseTime = Date.now() - startTime;
        const currentTime = result.rows[0].current_time;
        const startTime_db = result.rows[0].start_time;
        const uptime = new Date(currentTime).getTime() - new Date(startTime_db).getTime();
        const uptimeHours = Math.round(uptime / (1000 * 60 * 60));
        const metrics = {
            poolStats: {
                totalCount: exports.pool.totalCount,
                idleCount: exports.pool.idleCount,
                waitingCount: exports.pool.waitingCount,
            },
            responseTime,
            version: result.rows[0].db_version.split(' ')[0],
            uptime: `${uptimeHours}h`
        };
        logger_1.logger.info('Database health check passed', 'database', {
            currentTime,
            version: metrics.version,
            responseTime: `${responseTime}ms`,
            uptime: metrics.uptime,
            poolStats: metrics.poolStats
        });
        return { healthy: true, metrics };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        logger_1.logger.error('Database health check failed', 'database', {
            error: errorMessage,
            poolStats: {
                totalCount: exports.pool.totalCount,
                idleCount: exports.pool.idleCount,
                waitingCount: exports.pool.waitingCount,
            }
        });
        return { healthy: false, error: errorMessage };
    }
    finally {
        if (client) {
            client.release();
        }
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
const closeDatabasePool = async () => {
    try {
        logger_1.logger.info('Closing database pool...', 'database');
        await exports.pool.end();
        logger_1.logger.info('Database pool closed successfully', 'database');
    }
    catch (error) {
        logger_1.logger.error('Error closing database pool', 'database', { error: String(error) });
    }
};
exports.closeDatabasePool = closeDatabasePool;
const queryWithRetry = async (text, params, maxRetries = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await exports.pool.query(text, params);
            if (attempt > 1) {
                logger_1.logger.info(`Query succeeded on attempt ${attempt}`, 'database');
            }
            return result;
        }
        catch (error) {
            lastError =
                error instanceof Error ? error : new Error('Unknown database error');
            logger_1.logger.error(`Database query failed (attempt ${attempt}/${maxRetries})`, 'database', { error: lastError.message });
            if (attempt === maxRetries) {
                throw lastError;
            }
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            logger_1.logger.debug(`Retrying in ${delay}ms...`, 'database');
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
};
exports.queryWithRetry = queryWithRetry;
const initializeDatabase = async () => {
    try {
        logger_1.logger.info('Initializing database connection...', 'database');
        const health = await (0, exports.checkDatabaseHealth)();
        if (!health.healthy) {
            throw new Error(`Database health check failed: ${health.error}`);
        }
        logger_1.logger.databaseConnected();
    }
    catch (error) {
        logger_1.logger.databaseError(error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
let monitoringInterval = null;
const startDatabaseMonitoring = () => {
    if (monitoringInterval) {
        logger_1.logger.warn('Database monitoring already started', 'database');
        return;
    }
    logger_1.logger.info('Starting database connection monitoring', 'database');
    ConnectionPoolMonitor_1.connectionPoolMonitor.startMonitoring(30000);
    monitoringInterval = setInterval(async () => {
        try {
            const health = await (0, exports.checkDatabaseHealth)();
            if (!health.healthy) {
                logger_1.logger.error('Database health check failed during monitoring', 'database', {
                    error: health.error,
                    poolStats: {
                        totalCount: exports.pool.totalCount,
                        idleCount: exports.pool.idleCount,
                        waitingCount: exports.pool.waitingCount
                    }
                });
            }
            else {
                const poolUtilization = health.metrics ?
                    Math.round((health.metrics.poolStats.totalCount - health.metrics.poolStats.idleCount) / health.metrics.poolStats.totalCount * 100) : 0;
                if (poolUtilization > 80) {
                    logger_1.logger.warn('High database pool utilization', 'database', {
                        utilization: `${poolUtilization}%`,
                        ...health.metrics?.poolStats
                    });
                }
                if (health.metrics && health.metrics.responseTime > 1000) {
                    logger_1.logger.warn('Slow database response time', 'database', {
                        responseTime: `${health.metrics.responseTime}ms`,
                        poolStats: health.metrics.poolStats,
                        version: health.metrics.version,
                        uptime: health.metrics.uptime
                    });
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Database monitoring error', 'database', { error: String(error) });
        }
    }, 5 * 60 * 1000);
};
exports.startDatabaseMonitoring = startDatabaseMonitoring;
const stopDatabaseMonitoring = () => {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        logger_1.logger.info('Database monitoring stopped', 'database');
    }
    ConnectionPoolMonitor_1.connectionPoolMonitor.stopMonitoring();
    logger_1.logger.info('Connection pool monitoring stopped', 'database');
};
exports.stopDatabaseMonitoring = stopDatabaseMonitoring;
const getPoolMetrics = () => ({
    totalCount: exports.pool.totalCount,
    idleCount: exports.pool.idleCount,
    waitingCount: exports.pool.waitingCount,
    utilization: exports.pool.totalCount > 0 ?
        Math.round((exports.pool.totalCount - exports.pool.idleCount) / exports.pool.totalCount * 100) : 0
});
exports.getPoolMetrics = getPoolMetrics;
exports.default = exports.pool;
//# sourceMappingURL=database.js.map