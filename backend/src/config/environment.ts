import dotenv from 'dotenv';
import path from 'path';

// Load environment variables in correct order for development
const isProduction = process.env.NODE_ENV === 'production';
const envFiles = isProduction 
  ? ['.env.production', '.env'] 
  : ['.env.local', '.env'];

// Load environment files in order (later files override earlier ones)
envFiles.forEach((envFile, index) => {
  const envPath = path.resolve(process.cwd(), envFile);
  const result = dotenv.config({ path: envPath, override: false });
  
  const dotenvVersion = '16.3.1'; // Static version to avoid require() in ES modules
  
  if (result.error) {
    console.log(`[dotenv@${dotenvVersion}] injecting env (0) from ${envFile} -- tip: 📡 add observability to secrets: https://dotenvx.com/ops`);
  } else {
    const envCount = Object.keys(result.parsed || {}).length;
    console.log(`[dotenv@${dotenvVersion}] injecting env (${envCount}) from ${envFile} -- tip: ⚙️  load multiple .env files with { path: ['.env.local', '.env'] }`);
  }
});

// Import environment variable helpers
import { getEnvVar, getEnvNumber, getEnvBoolean, getEnvArray } from './envValidation';

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
    poolMax: number;
    poolIdleTimeout: number;
    poolConnectionTimeout: number;
    retryDelay: number;
    maxRetries: number;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  cors: {
    allowedOrigins: (string | RegExp)[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    authMaxRequests: number;
  };
  security: {
    enableHelmet: boolean;
    enableCors: boolean;
    enableRateLimit: boolean;
  };
  logging: {
    level: string;
    enableDebugLogs: boolean;
  };
  websocket: {
    cors: {
      origin: (string | RegExp)[];
      methods: string[];
      credentials: boolean;
    };
  };
  redis: {
    url: string;
    maxRetries: number;
    retryDelay: number;
    connectTimeout: number;
  };
}

export const initializeEnvironment = (): EnvironmentConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // Validate required environment variables (only in production)
  if (isProduction) {
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'DATABASE_URL',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      console.error(
        '❌ Missing required environment variables:',
        missingEnvVars
      );
      console.error(
        '💡 Please check your .env file and ensure all required variables are set'
      );
      throw new Error(
        `Missing required environment variables: ${missingEnvVars.join(', ')}`
      );
    }
  } else {
    // In development, just warn about missing variables but don't fail
    const recommendedEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'DATABASE_URL',
    ];

    const missingEnvVars = recommendedEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      console.warn(
        '⚠️ Missing recommended environment variables in development:',
        missingEnvVars
      );
      console.warn(
        '💡 For full functionality, please check your .env.local file and ensure all variables are set'
      );
    }
  }

  // Provide fallbacks for development - but never hardcode sensitive keys
  let supabaseUrl: string;
  let supabaseAnonKey: string;
  let supabaseServiceRoleKey: string;
  
  if (isProduction) {
    // In production, we require these environment variables
    supabaseUrl = process.env.SUPABASE_URL || '';
    supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
    supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  } else {
    // In development, require environment variables - no hardcoded fallbacks for security
    supabaseUrl = process.env.SUPABASE_URL || '';
    supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
    supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    // Log warning if keys are not provided in development
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️ Missing Supabase credentials in development. Check your .env file and ensure all required variables are set.');
      console.warn('💡 The server will not start without proper credentials for security reasons.');
    }
  }

  const config: EnvironmentConfig = {
    port: getEnvNumber('PORT', isProduction ? 3000 : 3001),
    nodeEnv,
    database: {
      url: getEnvVar('DATABASE_URL', ''),
      poolMax: getEnvNumber('DB_POOL_MAX', 20),
      poolIdleTimeout: getEnvNumber('DB_POOL_IDLE_TIMEOUT', 30000),
      poolConnectionTimeout: getEnvNumber('DB_POOL_CONNECTION_TIMEOUT', 10000),
      retryDelay: getEnvNumber('DB_RETRY_DELAY', 5000),
      maxRetries: getEnvNumber('DB_MAX_RETRIES', 5),
    },
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceRoleKey: supabaseServiceRoleKey,
    },
    cors: {
      // Parse allowed origins from environment variable or use defaults
      allowedOrigins: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(origin => {
            origin = origin.trim();
            // Convert regex strings to actual regex objects
            if (origin.startsWith('/') && origin.endsWith('/')) {
              return new RegExp(origin.slice(1, -1));
            }
            return origin;
          })
        : isProduction
          ? [
              // Specific frontend domains
              'https://bts-frontend-navy.vercel.app',
              'https://bts-frontend-navy.vercel.com',
              // Platform domains
              /^https:\/\/.*\.onrender\.com$/,
              /^https:\/\/.*\.vercel\.app$/,
              /^https:\/\/.*\.vercel\.com$/,
            ]
          : [
              // Development - support multiple ports
              'http://localhost:5173',
              'http://localhost:5174',
              'http://localhost:5175',
              'http://localhost:5176',
              'http://127.0.0.1:5173',
              'http://127.0.0.1:5174',
              'http://127.0.0.1:5175',
              'http://127.0.0.1:5176',
              'http://localhost:3000',
              'http://127.0.0.1:3000',
              // Network access for cross-laptop testing
              /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
              /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,
              /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
            ],
      credentials: getEnvBoolean('CORS_CREDENTIALS', true),
    },
    rateLimit: {
      windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
      maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', isProduction ? 1000 : 5000),
      authMaxRequests: getEnvNumber('AUTH_RATE_LIMIT_MAX_REQUESTS', 5),
    },
    security: {
      enableHelmet: getEnvBoolean('ENABLE_HELMET', true),
      enableCors: getEnvBoolean('ENABLE_CORS', true),
      enableRateLimit: getEnvBoolean('ENABLE_RATE_LIMIT', true),
    },
    logging: {
      level: getEnvVar('LOG_LEVEL', isProduction ? 'info' : 'debug'),
      enableDebugLogs: getEnvBoolean('ENABLE_DEBUG_LOGS', !isProduction),
    },
    websocket: {
      cors: {
        origin: isProduction
          ? [
              // Production WebSocket origins - Vercel frontend
              'https://bts-frontend-navy.vercel.app',
              'wss://bts-frontend-navy.vercel.app',
              'https://bts-frontend-navy.vercel.com',
              'wss://bts-frontend-navy.vercel.com',
              // Render domains
              /^https:\/\/.*\.onrender\.com$/,
              /^wss:\/\/.*\.onrender\.com$/,
              // Generic Vercel domains
              /^https:\/\/.*\.vercel\.app$/,
              /^wss:\/\/.*\.vercel\.app$/,
              /^https:\/\/.*\.vercel\.com$/,
              /^wss:\/\/.*\.vercel\.com$/,
            ]
          : [
              // Development WebSocket origins - support multiple ports
              'http://localhost:5173',
              'http://localhost:5174',
              'http://localhost:5175',
              'http://localhost:5176',
              'http://localhost:3000',
              'http://127.0.0.1:5173',
              'http://127.0.0.1:5174',
              'http://127.0.0.1:5175',
              'http://127.0.0.1:5176',
              'http://127.0.0.1:3000',
              'ws://localhost:3000',
              'ws://127.0.0.1:3000',
              'ws://localhost:5173',
              'ws://localhost:5174',
              'ws://localhost:5175',
              'ws://localhost:5176',
              'ws://127.0.0.1:5173',
              'ws://127.0.0.1:5174',
              'ws://127.0.0.1:5175',
              'ws://127.0.0.1:5176',

              // VS Code tunnel origins
              /^https:\/\/[a-zA-Z0-9-]+\.devtunnels\.ms$/,
              /^wss:\/\/[a-zA-Z0-9-]+\.devtunnels\.ms$/,
              // Network access for cross-laptop testing
              /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
              /^ws:\/\/192\.168\.\d+\.\d+:\d+$/,
              /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,
              /^ws:\/\/172\.\d+\.\d+\.\d+:\d+$/,
              /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
              /^ws:\/\/10\.\d+\.\d+\.\d+:\d+$/,
            ],
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
      },
    },
    redis: {
      url: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
      maxRetries: getEnvNumber('REDIS_MAX_RETRIES', 5),
      retryDelay: getEnvNumber('REDIS_RETRY_DELAY', 1000),
      connectTimeout: getEnvNumber('REDIS_CONNECT_TIMEOUT', 10000),
    },
  };

  // Log configuration (only in development)
  if (!isProduction) {
    console.log('🔧 Environment Configuration:', {
      nodeEnv: config.nodeEnv,
      port: config.port,
      database: {
        url: config.database.url ? '✅ Set' : '❌ Missing',
        poolMax: config.database.poolMax,
      },
      supabase: {
        url: config.supabase.url ? '✅ Set' : '❌ Missing',
        anonKey: config.supabase.anonKey ? '✅ Set' : '❌ Missing',
        serviceRoleKey: config.supabase.serviceRoleKey
          ? '✅ Set'
          : '❌ Missing',
      },
      cors: {
        allowedOrigins: config.cors.allowedOrigins.length,
        credentials: config.cors.credentials,
      },
      rateLimit: {
        windowMs: config.rateLimit.windowMs,
        maxRequests: config.rateLimit.maxRequests,
        authMaxRequests: config.rateLimit.authMaxRequests,
      },
      security: config.security,
      logging: config.logging,
    });
  }

  return config;
};

const config = initializeEnvironment();

export default config;
