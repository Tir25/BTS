import { Pool, PoolClient } from 'pg';
import config from './environment';
import { logger } from '../utils/logger';
import { connectionPoolMonitor } from '../services/ConnectionPoolMonitor';

// Lazy initialization of environment to avoid early validation errors - REMOVED

const poolConfig = {
  connectionString: config.database.url,
  max: config.database.poolMax,
  idleTimeoutMillis: config.database.poolIdleTimeout,
  connectionTimeoutMillis: config.database.poolConnectionTimeout,
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
  ssl:
    config.nodeEnv === 'production'
      ? { rejectUnauthorized: false }
      : false,
  // Additional options for better performance
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Create the connection pool
export const pool = new Pool(poolConfig);

// Enhanced error handling for the pool with connection monitoring
pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client', 'database', { 
    error: err.message,
    stack: err.stack,
    poolStats: {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    }
  });
  // Don't exit the process, just log the error
  // This prevents the entire application from crashing due to database issues
  console.error('Database pool error:', err.message);
});

pool.on('connect', (client) => {
  logger.info('New database client connected', 'database', {
    poolStats: {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    }
  });
});

pool.on('acquire', (client) => {
  logger.debug('Database client acquired from pool', 'database', {
    poolStats: {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    }
  });
});

pool.on('remove', (client) => {
  logger.debug('Database client removed from pool', 'database', {
    poolStats: {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    }
  });
});

// Enhanced health check function with comprehensive monitoring
export const checkDatabaseHealth = async (): Promise<{
  healthy: boolean;
  error?: string;
  metrics?: {
    poolStats: {
      totalCount: number;
      idleCount: number;
      waitingCount: number;
    };
    responseTime: number;
    version: string;
    uptime: string;
  };
}> => {
  let client: PoolClient | null = null;
  const startTime = Date.now();

  try {
    client = await pool.connect();
    const result = await client.query(
      'SELECT NOW() as current_time, version() as db_version, pg_postmaster_start_time() as start_time'
    );

    const responseTime = Date.now() - startTime;
    const currentTime = result.rows[0].current_time;
    const startTime_db = result.rows[0].start_time;
    const uptime = new Date(currentTime).getTime() - new Date(startTime_db).getTime();
    const uptimeHours = Math.round(uptime / (1000 * 60 * 60));

    const metrics = {
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      },
      responseTime,
      version: result.rows[0].db_version.split(' ')[0],
      uptime: `${uptimeHours}h`
    };

    logger.info('Database health check passed', 'database', {
      currentTime,
      version: metrics.version,
      responseTime: `${responseTime}ms`,
      uptime: metrics.uptime,
      poolStats: metrics.poolStats
    });

    return { healthy: true, metrics };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown database error';
    logger.error('Database health check failed', 'database', { 
      error: errorMessage,
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      }
    });
    return { healthy: false, error: errorMessage };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Graceful shutdown function
export const closeDatabasePool = async (): Promise<void> => {
  try {
    logger.info('Closing database pool...', 'database');
    await pool.end();
    logger.info('Database pool closed successfully', 'database');
  } catch (error) {
    logger.error('Error closing database pool', 'database', { error: String(error) });
  }
};

// Enhanced query function with retry logic
export const queryWithRetry = async (
  text: string,
  params?: unknown[],
  maxRetries = 3
): Promise<unknown> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query(text, params);
      if (attempt > 1) {
        logger.info(`Query succeeded on attempt ${attempt}`, 'database');
      }
      return result;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error('Unknown database error');
      logger.error(
        `Database query failed (attempt ${attempt}/${maxRetries})`,
        'database',
        { error: lastError.message }
      );

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      logger.debug(`Retrying in ${delay}ms...`, 'database');
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// Initialize database connection on module load
export const initializeDatabase = async (): Promise<void> => {
  try {
    logger.info('Initializing database connection...', 'database');
    const health = await checkDatabaseHealth();

    if (!health.healthy) {
      throw new Error(`Database health check failed: ${health.error}`);
    }

    logger.databaseConnected();
  } catch (error) {
    logger.databaseError(error as Error);
    throw error;
  }
};

// Database connection monitoring and health checks
let monitoringInterval: NodeJS.Timeout | null = null;

export const startDatabaseMonitoring = (): void => {
  if (monitoringInterval) {
    logger.warn('Database monitoring already started', 'database');
    return;
  }

  logger.info('Starting database connection monitoring', 'database');
  
  // Start connection pool monitoring
  connectionPoolMonitor.startMonitoring(30000); // Every 30 seconds
  
  monitoringInterval = setInterval(async () => {
    try {
      const health = await checkDatabaseHealth();
      
      if (!health.healthy) {
        logger.error('Database health check failed during monitoring', 'database', {
          error: health.error,
          poolStats: {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount
          }
        });
      } else {
        // Log pool statistics for monitoring
        const poolUtilization = health.metrics ? 
          Math.round((health.metrics.poolStats.totalCount - health.metrics.poolStats.idleCount) / health.metrics.poolStats.totalCount * 100) : 0;
        
        if (poolUtilization > 80) {
          logger.warn('High database pool utilization', 'database', {
            utilization: `${poolUtilization}%`,
            ...health.metrics?.poolStats
          });
        }
        
        if (health.metrics && health.metrics.responseTime > 1000) {
          logger.warn('Slow database response time', 'database', {
            responseTime: `${health.metrics.responseTime}ms`,
            poolStats: health.metrics.poolStats,
            version: health.metrics.version,
            uptime: health.metrics.uptime
          });
        }
      }
    } catch (error) {
      logger.error('Database monitoring error', 'database', { error: String(error) });
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
};

export const stopDatabaseMonitoring = (): void => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.info('Database monitoring stopped', 'database');
  }
  
  // Stop connection pool monitoring
  connectionPoolMonitor.stopMonitoring();
  logger.info('Connection pool monitoring stopped', 'database');
};

// Connection pool metrics for external monitoring
export const getPoolMetrics = () => ({
  totalCount: pool.totalCount,
  idleCount: pool.idleCount,
  waitingCount: pool.waitingCount,
  utilization: pool.totalCount > 0 ? 
    Math.round((pool.totalCount - pool.idleCount) / pool.totalCount * 100) : 0
});

// Export the pool as default for backward compatibility
export default pool;
