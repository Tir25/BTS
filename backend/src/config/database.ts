import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration interface
interface DatabaseConfig {
  connectionString: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  retryDelay: number;
  maxRetries: number;
}

// Environment-specific configurations
const getDatabaseConfig = (): DatabaseConfig => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    connectionString: process.env.DATABASE_URL!,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of clients in the pool
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'), // Close idle clients after 30 seconds
    connectionTimeoutMillis: parseInt(
      process.env.DB_POOL_CONNECTION_TIMEOUT || '10000'
    ), // Return an error after 10 seconds if connection could not be established
    retryDelay: parseInt(process.env.DB_RETRY_DELAY || '5000'), // Wait 5 seconds between retries
    maxRetries: parseInt(process.env.DB_MAX_RETRIES || '5'), // Maximum number of retry attempts
  };
};

// Create database pool with configuration
const createPool = (): Pool => {
  const config = getDatabaseConfig();
  return new Pool(config);
};

let pool: Pool = createPool();

// Database connection retry logic
const retryConnection = async (retryCount = 0): Promise<Pool> => {
  const config = getDatabaseConfig();

  try {
    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    console.log('✅ Database connection successful');
    return pool;
  } catch (error) {
    console.error(
      `❌ Database connection attempt ${retryCount + 1} failed:`,
      error
    );

    if (retryCount < config.maxRetries) {
      console.log(
        `🔄 Retrying database connection in ${config.retryDelay / 1000} seconds...`
      );
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      return retryConnection(retryCount + 1);
    } else {
      console.error('❌ Maximum database connection retries exceeded');
      throw new Error(
        `Database connection failed after ${config.maxRetries} attempts`
      );
    }
  }
};

// Enhanced pool event handlers
pool.on('connect', () => {
  console.log('✅ New client connected to PostgreSQL database');
});

pool.on('error', (err: Error) => {
  console.error('❌ Database pool error:', err);
  // Attempt to recreate the pool on critical errors
  if (
    err.message.includes('connection') ||
    err.message.includes('authentication')
  ) {
    // Attempting to recreate database pool...
    pool
      .end()
      .then(() => {
        pool = createPool();
      })
      .catch(console.error);
  }
});

pool.on('remove', () => {
  console.log('🔌 Client removed from database pool');
});

// Database health check function
export const checkDatabaseHealth = async (): Promise<{
  healthy: boolean;
  details: Record<string, unknown>;
}> => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT NOW() as current_time, version() as postgres_version'
    );
    client.release();

    return {
      healthy: true,
      details: {
        currentTime: result.rows[0].current_time,
        postgresVersion: result.rows[0].postgres_version,
        poolSize: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      },
    };
  } catch (error) {
    return {
      healthy: false,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    };
  }
};

// Initialize database connection with retry logic
export const initializeDatabaseConnection = async (): Promise<Pool> => {
  console.log('🔄 Initializing database connection...');
  return await retryConnection();
};

// Graceful shutdown function
export const closeDatabaseConnection = async (): Promise<void> => {
  console.log('🔄 Closing database connections...');
  await pool.end();
  console.log('✅ Database connections closed');
};

export default pool;
