import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment-specific configuration
const loadEnvironmentConfig = (): void => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = path.join(__dirname, '..', '..', `env.${nodeEnv}`);

  // Check if environment-specific file exists
  if (fs.existsSync(envFile)) {
    console.log(`📁 Loading environment configuration from: env.${nodeEnv}`);
    dotenv.config({ path: envFile });
  } else {
    console.log(
      `📁 Environment file not found: env.${nodeEnv}, using default .env`
    );
    dotenv.config();
  }

  console.log(`🌍 Environment: ${nodeEnv}`);
};

// Environment configuration interface
export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  websocketPort: number;
  databaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  corsOrigin: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  logLevel: string;
  enableDebugLogs: boolean;
  dbPoolMax: number;
  dbPoolIdleTimeout: number;
  dbPoolConnectionTimeout: number;
  dbRetryDelay: number;
  dbMaxRetries: number;
}

// Get environment configuration
export const getEnvironmentConfig = (): EnvironmentConfig => {
  loadEnvironmentConfig();

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
    websocketPort: parseInt(process.env.WEBSOCKET_PORT || '3001'),
    databaseUrl: process.env.DATABASE_URL!,
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    corsOrigin:
      process.env.CORS_ORIGIN ||
      'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://192.168.1.2:5173,http://192.168.1.2:5174,http://192.168.1.2:5175',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    rateLimitMaxRequests: parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || '100'
    ),
    logLevel: process.env.LOG_LEVEL || 'info',
    enableDebugLogs: process.env.ENABLE_DEBUG_LOGS === 'true',
    dbPoolMax: parseInt(process.env.DB_POOL_MAX || '20'),
    dbPoolIdleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
    dbPoolConnectionTimeout: parseInt(
      process.env.DB_POOL_CONNECTION_TIMEOUT || '10000'
    ),
    dbRetryDelay: parseInt(process.env.DB_RETRY_DELAY || '5000'),
    dbMaxRetries: parseInt(process.env.DB_MAX_RETRIES || '5'),
  };
};

// Validate environment configuration
export const validateEnvironmentConfig = (config: EnvironmentConfig): void => {
  const requiredFields = [
    'databaseUrl',
    'supabaseUrl',
    'supabaseAnonKey',
    'supabaseServiceRoleKey',
  ];

  const missingFields = requiredFields.filter(
    field => !config[field as keyof EnvironmentConfig]
  );

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingFields.join(', ')}`
    );
  }

  console.log('✅ Environment configuration validated successfully');
};

// Initialize environment configuration
export const initializeEnvironment = (): EnvironmentConfig => {
  console.log('🔄 Initializing environment configuration...');

  const config = getEnvironmentConfig();
  validateEnvironmentConfig(config);

  console.log(`✅ Environment initialized: ${config.nodeEnv}`);
  console.log(`🔧 Port: ${config.port}`);
  console.log(`🔌 WebSocket Port: ${config.websocketPort}`);
  console.log(`🌐 CORS Origin: ${config.corsOrigin}`);
  console.log(
    `📊 Rate Limit: ${config.rateLimitMaxRequests} requests per ${config.rateLimitWindowMs / 1000}s`
  );
  console.log(`🗄️ Database Pool: ${config.dbPoolMax} max connections`);

  return config;
};
