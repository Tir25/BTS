import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// Load environment variables in correct order for development
const isProduction = process.env.NODE_ENV === 'production';
const envFiles = isProduction 
  ? ['.env.production', '.env'] 
  : ['.env.local', '.env'];

// Helper function to find env file in multiple possible locations
function findEnvFile(filename: string): string | null {
  // Possible locations (in order of preference)
  const possiblePaths = [
    // Backend directory (where we expect it)
    path.resolve(process.cwd(), filename),
    // If running from root in workspace, try backend subdirectory
    path.resolve(process.cwd(), 'backend', filename),
    // Fallback: try parent directory
    path.resolve(process.cwd(), '..', filename),
  ];
  
  for (const envPath of possiblePaths) {
    if (existsSync(envPath)) {
      return envPath;
    }
  }
  
  return null;
}

// Load environment files in order (later files override earlier ones)
envFiles.forEach((envFile) => {
  const envPath = findEnvFile(envFile);
  const result = envPath 
    ? dotenv.config({ path: envPath, override: false })
    : { error: new Error(`File not found: ${envFile}`), parsed: undefined };
  
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
  // Role-based Supabase configurations
  supabaseDriver: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  supabaseStudent: {
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
      'DATABASE_URL',
    ];

    // Check for role-based Supabase configs (preferred) or legacy config
    const hasDriverConfig = process.env.DRIVER_SUPABASE_URL && 
                            process.env.DRIVER_SUPABASE_ANON_KEY && 
                            process.env.DRIVER_SUPABASE_SERVICE_ROLE_KEY;
    const hasStudentConfig = process.env.STUDENT_SUPABASE_URL && 
                             process.env.STUDENT_SUPABASE_ANON_KEY && 
                             process.env.STUDENT_SUPABASE_SERVICE_ROLE_KEY;
    const hasLegacyConfig = process.env.SUPABASE_URL && 
                            process.env.SUPABASE_ANON_KEY && 
                            process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!hasDriverConfig && !hasLegacyConfig) {
      requiredEnvVars.push('DRIVER_SUPABASE_URL', 'DRIVER_SUPABASE_ANON_KEY', 'DRIVER_SUPABASE_SERVICE_ROLE_KEY');
    }
    if (!hasStudentConfig && !hasLegacyConfig) {
      requiredEnvVars.push('STUDENT_SUPABASE_URL', 'STUDENT_SUPABASE_ANON_KEY', 'STUDENT_SUPABASE_SERVICE_ROLE_KEY');
    }

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
      'DATABASE_URL',
    ];

    const hasDriverConfig = process.env.DRIVER_SUPABASE_URL && 
                            process.env.DRIVER_SUPABASE_ANON_KEY && 
                            process.env.DRIVER_SUPABASE_SERVICE_ROLE_KEY;
    const hasStudentConfig = process.env.STUDENT_SUPABASE_URL && 
                             process.env.STUDENT_SUPABASE_ANON_KEY && 
                             process.env.STUDENT_SUPABASE_SERVICE_ROLE_KEY;
    const hasLegacyConfig = process.env.SUPABASE_URL && 
                            process.env.SUPABASE_ANON_KEY && 
                            process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!hasDriverConfig && !hasLegacyConfig) {
      recommendedEnvVars.push('DRIVER_SUPABASE_URL', 'DRIVER_SUPABASE_ANON_KEY', 'DRIVER_SUPABASE_SERVICE_ROLE_KEY');
    }
    if (!hasStudentConfig && !hasLegacyConfig) {
      recommendedEnvVars.push('STUDENT_SUPABASE_URL', 'STUDENT_SUPABASE_ANON_KEY', 'STUDENT_SUPABASE_SERVICE_ROLE_KEY');
    }

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

  // Load Supabase configurations with fallback to legacy config
  // Priority: Role-specific config > Legacy config
  const getSupabaseConfig = (role: 'driver' | 'student' | 'legacy') => {
    if (role === 'driver') {
      return {
        url: process.env.DRIVER_SUPABASE_URL || process.env.SUPABASE_URL || '',
        anonKey: process.env.DRIVER_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.DRIVER_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      };
    } else if (role === 'student') {
      return {
        url: process.env.STUDENT_SUPABASE_URL || process.env.SUPABASE_URL || '',
        anonKey: process.env.STUDENT_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.STUDENT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      };
  } else {
      // Legacy config
      return {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      };
    }
  };

  const legacyConfig = getSupabaseConfig('legacy');
  const driverConfig = getSupabaseConfig('driver');
  const studentConfig = getSupabaseConfig('student');
  
  // Log configuration status
  if (!isProduction) {
    const hasDriverSpecific = !!(process.env.DRIVER_SUPABASE_URL && process.env.DRIVER_SUPABASE_ANON_KEY);
    const hasStudentSpecific = !!(process.env.STUDENT_SUPABASE_URL && process.env.STUDENT_SUPABASE_ANON_KEY);
    const hasLegacy = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
    
    if (hasDriverSpecific || hasStudentSpecific) {
      console.log('✅ Using role-based Supabase configurations');
      if (hasDriverSpecific) console.log('  - Driver: ✅ Configured');
      if (hasStudentSpecific) console.log('  - Student: ✅ Configured');
      if (hasLegacy) console.log('  - Legacy: ⚠️ Fallback available');
    } else if (hasLegacy) {
      console.warn('⚠️ Using legacy Supabase configuration. Consider migrating to role-based configs.');
    } else {
      console.warn('⚠️ Missing Supabase credentials. Check your .env file.');
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
      url: legacyConfig.url,
      anonKey: legacyConfig.anonKey,
      serviceRoleKey: legacyConfig.serviceRoleKey,
    },
    supabaseDriver: {
      url: driverConfig.url,
      anonKey: driverConfig.anonKey,
      serviceRoleKey: driverConfig.serviceRoleKey,
    },
    supabaseStudent: {
      url: studentConfig.url,
      anonKey: studentConfig.anonKey,
      serviceRoleKey: studentConfig.serviceRoleKey,
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
        serviceRoleKey: config.supabase.serviceRoleKey ? '✅ Set' : '❌ Missing',
      },
      supabaseDriver: {
        url: config.supabaseDriver.url ? '✅ Set' : '❌ Missing',
        anonKey: config.supabaseDriver.anonKey ? '✅ Set' : '❌ Missing',
        serviceRoleKey: config.supabaseDriver.serviceRoleKey ? '✅ Set' : '❌ Missing',
      },
      supabaseStudent: {
        url: config.supabaseStudent.url ? '✅ Set' : '❌ Missing',
        anonKey: config.supabaseStudent.anonKey ? '✅ Set' : '❌ Missing',
        serviceRoleKey: config.supabaseStudent.serviceRoleKey ? '✅ Set' : '❌ Missing',
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
