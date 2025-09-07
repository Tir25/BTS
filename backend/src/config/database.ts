import { Pool, PoolClient } from 'pg';
import initializeEnvironment from './environment';
import { connectionPoolOptimizer } from '../services/ConnectionPoolOptimizer';
import { queryOptimizer } from '../services/QueryOptimizer';

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
  connectionTimeoutMillis: 10000, // Increased to 10 seconds for better reliability
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
  ssl:
    environment.nodeEnv === 'production'
      ? { rejectUnauthorized: false }
      : false,
  // Additional options for better performance
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Create the connection pool
export const pool = new Pool(poolConfig);

// Enhanced error handling for the pool
pool.on('error', (err: Error) => {
  console.error('❌ Unexpected error on idle client', err);
  // Don't exit the process, just log the error
  // This prevents the entire application from crashing due to database issues
});

pool.on('connect', () => {
  console.log('✅ New database client connected');
});

pool.on('acquire', () => {
  console.log('🔗 Database client acquired from pool');
});

pool.on('remove', () => {
  console.log('🔓 Database client removed from pool');
});

// Health check function
export const checkDatabaseHealth = async (): Promise<{
  healthy: boolean;
  error?: string;
}> => {
  let client: PoolClient | null = null;

  try {
    client = await pool.connect();
    const result = await client.query(
      'SELECT NOW() as current_time, version() as db_version'
    );

    console.log('✅ Database health check passed:', {
      currentTime: result.rows[0].current_time,
      version: result.rows[0].db_version.split(' ')[0], // Just the version number
    });

    return { healthy: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown database error';
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
  params?: unknown[],
  maxRetries = 3
): Promise<unknown> => {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query(text, params);
      if (attempt > 1) {
        console.log(`✅ Query succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error('Unknown database error');
      console.error(
        `❌ Database query failed (attempt ${attempt}/${maxRetries}):`,
        lastError.message
      );

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Query failed after all retry attempts');
};

// Initialize database connection on module load
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Initializing database connection...');
    const health = await checkDatabaseHealth();

    if (!health.healthy) {
      throw new Error(`Database health check failed: ${health.error}`);
    }

    // Start connection pool monitoring
    connectionPoolOptimizer.startMonitoring(30000); // Monitor every 30 seconds
    
    // Prepare common statements
    queryOptimizer.prepareStatement(
      'get_bus_by_id',
      'SELECT * FROM buses WHERE id = $1'
    );
    
    queryOptimizer.prepareStatement(
      'get_route_by_id',
      'SELECT * FROM routes WHERE id = $1'
    );
    
    queryOptimizer.prepareStatement(
      'get_live_locations',
      'SELECT * FROM live_locations WHERE recorded_at > NOW() - INTERVAL \'5 minutes\''
    );

    console.log('✅ Database initialized successfully with optimizations');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

// Optimized query functions
export const executeOptimizedQuery = async <T>(
  query: string,
  params: any[] = [],
  client?: PoolClient
): Promise<T> => {
  return queryOptimizer.executeOptimizedQuery<T>(query, params, client);
};

export const executePreparedStatement = async <T>(
  statementName: string,
  params: any[] = [],
  client?: PoolClient
): Promise<T> => {
  return queryOptimizer.executePreparedStatement<T>(statementName, params, client);
};

export const analyzeQuery = async (
  query: string,
  params: any[] = []
) => {
  return queryOptimizer.analyzeQuery(query, params);
};

// Get optimization statistics
export const getOptimizationStats = () => {
  return {
    queryOptimizer: queryOptimizer.getOptimizationStats(),
    connectionPool: connectionPoolOptimizer.getMetrics(),
    queryCache: queryOptimizer.getOptimizationStats(),
  };
};

// Graceful shutdown with optimizations
export const shutdownDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Shutting down database with optimizations...');
    
    // Stop monitoring
    connectionPoolOptimizer.stopMonitoring();
    
    // Clear caches and prepared statements
    queryOptimizer.clear();
    
    // Close pool
    await closeDatabasePool();
    
    console.log('✅ Database shutdown completed');
  } catch (error) {
    console.error('❌ Error during database shutdown:', error);
    throw error;
  }
};

// Export the pool as default for backward compatibility
export default pool;
