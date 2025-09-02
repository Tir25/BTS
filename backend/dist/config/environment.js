"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEnvironment = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const initializeEnvironment = () => {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    if (isProduction) {
        const requiredEnvVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            'DATABASE_URL',
        ];
        const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
        if (missingEnvVars.length > 0) {
            console.error('❌ Missing required environment variables:', missingEnvVars);
            console.error('💡 Please check your .env file and ensure all required variables are set');
            throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
        }
    }
    const supabaseUrl = process.env.SUPABASE_URL ||
        (isProduction ? '' : 'https://gthwmwfwvhyriygpcdlr.supabase.co');
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ||
        (isProduction
            ? ''
            : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI');
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (isProduction
            ? ''
            : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk3MTQ1NSwiZXhwIjoyMDcwNTQ3NDU1fQ.LuwfYUuGMRQh3Gbc7NQuRCqZxLsS5CrQOd1eMjiWj2o');
    const config = {
        port: parseInt(process.env.PORT || '3000'),
        nodeEnv,
        database: {
            url: process.env.DATABASE_URL ||
                'postgresql://postgres:password@localhost:5432/bus_tracking',
            poolMax: parseInt(process.env.DB_POOL_MAX || '20'),
            poolIdleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
            poolConnectionTimeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '10000'),
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
                    'https://bts-frontend-navy.vercel.app',
                    'https://bts-frontend-navy.vercel.com',
                    /^https:\/\/.*\.onrender\.com$/,
                    /^https:\/\/.*\.render\.com$/,
                    /^https:\/\/.*\.vercel\.app$/,
                    /^https:\/\/.*\.vercel\.com$/,
                ]
                : [
                    'http://localhost:5173',
                    'http://localhost:3000',
                    'http://127.0.0.1:5173',
                    'http://127.0.0.1:3000',
                    /^https:\/\/[a-zA-Z0-9-]+\.devtunnels\.ms$/,
                    /^wss:\/\/[a-zA-Z0-9-]+\.devtunnels\.ms$/,
                    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
                    /^ws:\/\/192\.168\.\d+\.\d+:\d+$/,
                ],
            credentials: true,
        },
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
            authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'),
        },
        security: {
            enableHelmet: true,
            enableCors: true,
            enableRateLimit: true,
        },
        logging: {
            level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
            enableDebugLogs: process.env.ENABLE_DEBUG_LOGS === 'true' && !isProduction,
        },
        websocket: {
            cors: {
                origin: isProduction
                    ? [
                        'https://bts-frontend-navy.vercel.app',
                        'wss://bts-frontend-navy.vercel.app',
                        'https://bts-frontend-navy.vercel.com',
                        'wss://bts-frontend-navy.vercel.com',
                        /^https:\/\/.*\.onrender\.com$/,
                        /^wss:\/\/.*\.onrender\.com$/,
                        /^https:\/\/.*\.vercel\.app$/,
                        /^wss:\/\/.*\.vercel\.app$/,
                        /^https:\/\/.*\.vercel\.com$/,
                        /^wss:\/\/.*\.vercel\.com$/,
                    ]
                    : [
                        'http://localhost:5173',
                        'http://localhost:3000',
                        'http://127.0.0.1:5173',
                        'http://127.0.0.1:3000',
                        'ws://localhost:3000',
                        'ws://127.0.0.1:3000',
                        'ws://localhost:5173',
                        'ws://127.0.0.1:5173',
                        /^https:\/\/[a-zA-Z0-9-]+\.devtunnels\.ms$/,
                        /^wss:\/\/[a-zA-Z0-9-]+\.devtunnels\.ms$/,
                        /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
                        /^ws:\/\/192\.168\.\d+\.\d+:\d+$/,
                    ],
                methods: ['GET', 'POST', 'OPTIONS'],
                credentials: true,
            },
        },
    };
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
exports.initializeEnvironment = initializeEnvironment;
exports.default = exports.initializeEnvironment;
//# sourceMappingURL=environment.js.map