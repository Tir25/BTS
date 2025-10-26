"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEnvironment = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const isProduction = process.env.NODE_ENV === 'production';
const envFiles = isProduction
    ? ['.env.production', '.env']
    : ['.env.local', '.env'];
envFiles.forEach((envFile, index) => {
    const envPath = path_1.default.resolve(process.cwd(), envFile);
    const result = dotenv_1.default.config({ path: envPath, override: false });
    const dotenvVersion = '16.3.1';
    if (result.error) {
        console.log(`[dotenv@${dotenvVersion}] injecting env (0) from ${envFile} -- tip: 📡 add observability to secrets: https://dotenvx.com/ops`);
    }
    else {
        const envCount = Object.keys(result.parsed || {}).length;
        console.log(`[dotenv@${dotenvVersion}] injecting env (${envCount}) from ${envFile} -- tip: ⚙️  load multiple .env files with { path: ['.env.local', '.env'] }`);
    }
});
const envValidation_1 = require("./envValidation");
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
    else {
        const recommendedEnvVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            'DATABASE_URL',
        ];
        const missingEnvVars = recommendedEnvVars.filter((envVar) => !process.env[envVar]);
        if (missingEnvVars.length > 0) {
            console.warn('⚠️ Missing recommended environment variables in development:', missingEnvVars);
            console.warn('💡 For full functionality, please check your .env.local file and ensure all variables are set');
        }
    }
    let supabaseUrl;
    let supabaseAnonKey;
    let supabaseServiceRoleKey;
    if (isProduction) {
        supabaseUrl = process.env.SUPABASE_URL || '';
        supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
        supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    }
    else {
        supabaseUrl = process.env.SUPABASE_URL || '';
        supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
        supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn('⚠️ Missing Supabase credentials in development. Check your .env file and ensure all required variables are set.');
            console.warn('💡 The server will not start without proper credentials for security reasons.');
        }
    }
    const config = {
        port: (0, envValidation_1.getEnvNumber)('PORT', isProduction ? 3000 : 3001),
        nodeEnv,
        database: {
            url: (0, envValidation_1.getEnvVar)('DATABASE_URL', ''),
            poolMax: (0, envValidation_1.getEnvNumber)('DB_POOL_MAX', 20),
            poolIdleTimeout: (0, envValidation_1.getEnvNumber)('DB_POOL_IDLE_TIMEOUT', 30000),
            poolConnectionTimeout: (0, envValidation_1.getEnvNumber)('DB_POOL_CONNECTION_TIMEOUT', 10000),
            retryDelay: (0, envValidation_1.getEnvNumber)('DB_RETRY_DELAY', 5000),
            maxRetries: (0, envValidation_1.getEnvNumber)('DB_MAX_RETRIES', 5),
        },
        supabase: {
            url: supabaseUrl,
            anonKey: supabaseAnonKey,
            serviceRoleKey: supabaseServiceRoleKey,
        },
        cors: {
            allowedOrigins: process.env.CORS_ORIGIN
                ? process.env.CORS_ORIGIN.split(',').map(origin => {
                    origin = origin.trim();
                    if (origin.startsWith('/') && origin.endsWith('/')) {
                        return new RegExp(origin.slice(1, -1));
                    }
                    return origin;
                })
                : isProduction
                    ? [
                        'https://bts-frontend-navy.vercel.app',
                        'https://bts-frontend-navy.vercel.com',
                        /^https:\/\/.*\.onrender\.com$/,
                        /^https:\/\/.*\.vercel\.app$/,
                        /^https:\/\/.*\.vercel\.com$/,
                    ]
                    : [
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
                        /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
                        /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,
                        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
                    ],
            credentials: (0, envValidation_1.getEnvBoolean)('CORS_CREDENTIALS', true),
        },
        rateLimit: {
            windowMs: (0, envValidation_1.getEnvNumber)('RATE_LIMIT_WINDOW_MS', 900000),
            maxRequests: (0, envValidation_1.getEnvNumber)('RATE_LIMIT_MAX_REQUESTS', isProduction ? 1000 : 5000),
            authMaxRequests: (0, envValidation_1.getEnvNumber)('AUTH_RATE_LIMIT_MAX_REQUESTS', 5),
        },
        security: {
            enableHelmet: (0, envValidation_1.getEnvBoolean)('ENABLE_HELMET', true),
            enableCors: (0, envValidation_1.getEnvBoolean)('ENABLE_CORS', true),
            enableRateLimit: (0, envValidation_1.getEnvBoolean)('ENABLE_RATE_LIMIT', true),
        },
        logging: {
            level: (0, envValidation_1.getEnvVar)('LOG_LEVEL', isProduction ? 'info' : 'debug'),
            enableDebugLogs: (0, envValidation_1.getEnvBoolean)('ENABLE_DEBUG_LOGS', !isProduction),
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
                        /^https:\/\/[a-zA-Z0-9-]+\.devtunnels\.ms$/,
                        /^wss:\/\/[a-zA-Z0-9-]+\.devtunnels\.ms$/,
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
            url: (0, envValidation_1.getEnvVar)('REDIS_URL', 'redis://localhost:6379'),
            maxRetries: (0, envValidation_1.getEnvNumber)('REDIS_MAX_RETRIES', 5),
            retryDelay: (0, envValidation_1.getEnvNumber)('REDIS_RETRY_DELAY', 1000),
            connectTimeout: (0, envValidation_1.getEnvNumber)('REDIS_CONNECT_TIMEOUT', 10000),
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
const config = (0, exports.initializeEnvironment)();
exports.default = config;
//# sourceMappingURL=environment.js.map