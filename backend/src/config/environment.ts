import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
    adminEmails: string[];
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
  }

  // Validate required secrets in production
  if (isProduction) {
    const requiredSecrets = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];

    const missingSecrets = requiredSecrets.filter(
      (secret) => !process.env[secret]
    );

    if (missingSecrets.length > 0) {
      console.error(
        '❌ Missing required secrets in production:',
        missingSecrets
      );
      throw new Error(
        `Missing required secrets: ${missingSecrets.join(', ')}`
      );
    }
  }

  // Get Supabase configuration from environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Validate that secrets are provided
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('❌ Missing Supabase configuration');
    throw new Error('Supabase configuration is required');
  }

  // Get admin emails from environment variables
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

  // Get allowed origins from environment variables
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [];

  const config: EnvironmentConfig = {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv,
    database: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://postgres:password@localhost:5432/bus_tracking',
      poolMax: parseInt(process.env.DB_POOL_MAX || '20'),
      poolIdleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
      poolConnectionTimeout: parseInt(
        process.env.DB_POOL_CONNECTION_TIMEOUT || '10000'
      ),
      retryDelay: parseInt(process.env.DB_RETRY_DELAY || '5000'),
      maxRetries: parseInt(process.env.DB_MAX_RETRIES || '5'),
    },
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceRoleKey: supabaseServiceRoleKey,
    },
    cors: {
      allowedOrigins: isProduction
        ? [
            // Use environment variables first, then fallback to defaults
            ...allowedOriginsEnv,
            // Specific frontend domains
            'https://bts-frontend-navy.vercel.app',
            'https://bts-frontend-navy.vercel.com',
            // Platform domains
            /^https:\/\/.*\.onrender\.com$/,
            /^https:\/\/.*\.vercel\.app$/,
            /^https:\/\/.*\.vercel\.com$/,
          ]
        : [
            // Use environment variables first, then fallback to defaults
            ...allowedOriginsEnv,
            // Development - localhost
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            
            // Network access for cross-laptop testing
            'http://192.168.1.2:5173',
            'http://192.168.1.2:3000',
            'http://192.168.1.2:8080',
            'http://192.168.1.2:9000',
            
            // Dynamic network IPs (192.168.x.x range)
            /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
            /^https:\/\/192\.168\.\d+\.\d+:\d+$/,
          ],
      credentials: true,
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      authMaxRequests: parseInt(
        process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'
      ),
    },
    security: {
      enableHelmet: true,
      enableCors: true,
      enableRateLimit: true,
      adminEmails: adminEmails,
    },
    logging: {
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      enableDebugLogs:
        process.env.ENABLE_DEBUG_LOGS === 'true' && !isProduction,
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
              // Development WebSocket origins - localhost
              'http://localhost:5173',
              'http://localhost:3000',
              'http://127.0.0.1:5173',
              'http://127.0.0.1:3000',
              'ws://localhost:3000',
              'ws://127.0.0.1:3000',
              'ws://localhost:5173',
              'ws://127.0.0.1:5173',

              // Network access for cross-laptop testing - dynamic IPs
              /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
              /^ws:\/\/192\.168\.\d+\.\d+:\d+$/,
              /^wss:\/\/192\.168\.\d+\.\d+:\d+$/,
              
              // Common local network IPs for testing
              'http://192.168.1.2:5173',
              'http://192.168.1.2:3000',
              'http://192.168.1.2:8080',
              'http://192.168.1.2:9000',
              'ws://192.168.1.2:3000',
              'ws://192.168.1.2:8080',
              'ws://192.168.1.2:9000',

              // VS Code tunnel origins
              /^https:\/\/[a-zA-Z0-9-]+\.devtunnels\.ms$/,
              /^wss:\/\/[a-zA-Z0-9-]+\.devtunnels\.ms$/,
              
              // Additional network IPs for comprehensive testing
              /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
              /^ws:\/\/10\.\d+\.\d+\.\d+:\d+$/,
              /^wss:\/\/10\.\d+\.\d+\.\d+:\d+$/,
            ],
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
      },
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

export default initializeEnvironment;
