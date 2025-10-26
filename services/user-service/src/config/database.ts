/**
 * Database Configuration for User Service
 */

import { Pool, PoolClient } from 'pg';
import config from './environment';
import { logger } from '../utils/logger';

const poolConfig = {
  connectionString: config.database.url,
  max: config.database.poolMax,
  idleTimeoutMillis: config.database.poolIdleTimeout,
  connectionTimeoutMillis: config.database.poolConnectionTimeout,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Create the connection pool
export const pool = new Pool(poolConfig);

// Enhanced error handling for the pool
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
});

// Database health check
export const checkDatabaseHealth = async (): Promise<{ healthy: boolean; metrics?: any; error?: string }> => {
  let client: PoolClient | null = null;
  
  try {
    const startTime = Date.now();
    client = await pool.connect();
    
    // Test basic connectivity
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    const responseTime = Date.now() - startTime;
    
    const currentTime = result.rows[0].current_time;
    const dbVersion = result.rows[0].db_version;
    
    const metrics = {
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      },
      responseTime,
      version: dbVersion.split(' ')[0],
      currentTime: currentTime.toISOString(),
    };

    logger.info('Database health check passed', 'database', {
      responseTime: `${responseTime}ms`,
      version: metrics.version,
      poolStats: metrics.poolStats
    });

    return { healthy: true, metrics };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
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

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test connection
    const health = await checkDatabaseHealth();
    if (!health.healthy) {
      throw new Error(`Database health check failed: ${health.error}`);
    }
    
    logger.info('Database connection initialized successfully', 'database');
  } catch (error) {
    logger.error('Failed to initialize database connection', 'database', { 
      error: (error as Error).message 
    });
    throw error;
  }
};

// Close database connections
export const closeDatabasePool = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database connection pool closed', 'database');
  } catch (error) {
    logger.error('Error closing database pool', 'database', { 
      error: (error as Error).message 
    });
  }
};

// Database monitoring
let monitoringInterval: NodeJS.Timeout | null = null;

export const startDatabaseMonitoring = (): void => {
  if (monitoringInterval) return;
  
  monitoringInterval = setInterval(async () => {
    const health = await checkDatabaseHealth();
    if (!health.healthy) {
      logger.warn('Database health check failed during monitoring', 'database', {
        error: health.error,
        poolStats: health.metrics?.poolStats
      });
    }
  }, 60000); // Check every minute
  
  logger.info('Database monitoring started', 'database');
};

export const stopDatabaseMonitoring = (): void => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.info('Database monitoring stopped', 'database');
  }
};
