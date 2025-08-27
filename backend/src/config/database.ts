import { Pool, PoolClient } from 'pg';
import initializeEnvironment from './environment';

const environment = initializeEnvironment();

// Use centralized environment configuration for database URL
const getDatabaseUrl = (): string => {
  return environment.database.url;
};

// Enhanced database configuration
const poolConfig = {
  connectionString: getDatabaseUrl(),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
  ssl: environment.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  // Additional options for better performance
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Create the connection pool
export const pool = new Pool(poolConfig);

// Enhanced error handling for the pool
pool.on('error', (err: Error, client: PoolClient) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

pool.on('connect', (client: PoolClient) => {
  console.log('✅ New database client connected');
});

pool.on('acquire', (client: PoolClient) => {
  console.log('🔗 Database client acquired from pool');
});

pool.on('remove', (client: PoolClient) => {
  console.log('🔓 Database client removed from pool');
});

// Health check function
export const checkDatabaseHealth = async (): Promise<{ healthy: boolean; error?: string }> => {
  let client: PoolClient | null = null;
  
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    
    console.log('✅ Database health check passed:', {
      currentTime: result.rows[0].current_time,
      version: result.rows[0].db_version.split(' ')[0] // Just the version number
    });
    
    return { healthy: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    console.error('❌ Database health check failed:', errorMessage);
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
    console.log('🔄 Closing database pool...');
    await pool.end();
    console.log('✅ Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
};

// Enhanced query function with retry logic
export const queryWithRetry = async (
  text: string,
  params?: any[],
  maxRetries: number = 3
): Promise<any> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query(text, params);
      if (attempt > 1) {
        console.log(`✅ Query succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown database error');
      console.error(`❌ Database query failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// Initialize database connection on module load
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Initializing database connection...');
    const health = await checkDatabaseHealth();
    
    if (!health.healthy) {
      throw new Error(`Database health check failed: ${health.error}`);
    }
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

// Export the pool as default for backward compatibility
export default pool;
