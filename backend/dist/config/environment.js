"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEnvironment = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const isProduction = process.env.NODE_ENV === 'production';
const envFiles = isProduction
    ? ['.env.production', '.env']
    : ['.env.local', '.env'];
function findEnvFile(filename) {
    const possiblePaths = [
        path_1.default.resolve(process.cwd(), filename),
        path_1.default.resolve(process.cwd(), 'backend', filename),
        path_1.default.resolve(process.cwd(), '..', filename),
    ];
    for (const envPath of possiblePaths) {
        if ((0, fs_1.existsSync)(envPath)) {
            return envPath;
        }
    }
    return null;
}
envFiles.forEach((envFile) => {
    const envPath = findEnvFile(envFile);
    const result = envPath
        ? dotenv_1.default.config({ path: envPath, override: false })
        : { error: new Error(`File not found: ${envFile}`), parsed: undefined };
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
            requiredEnvVars.push('DRIVER_SUPABASE_URL', 'DRIVER_SUPABASE_ANON_KEY', 'DRIVER_SUPABASE_SERVICE_ROLE_KEY');
        }
        if (!hasStudentConfig && !hasLegacyConfig) {
            requiredEnvVars.push('STUDENT_SUPABASE_URL', 'STUDENT_SUPABASE_ANON_KEY', 'STUDENT_SUPABASE_SERVICE_ROLE_KEY');
        }
        const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
        if (missingEnvVars.length > 0) {
            console.error('❌ Missing required environment variables:', missingEnvVars);
            console.error('💡 Please check your .env file and ensure all required variables are set');
            throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
        }
    }
    else {
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
        const missingEnvVars = recommendedEnvVars.filter((envVar) => !process.env[envVar]);
        if (missingEnvVars.length > 0) {
            console.warn('⚠️ Missing recommended environment variables in development:', missingEnvVars);
            console.warn('💡 For full functionality, please check your .env.local file and ensure all variables are set');
        }
    }
    const getSupabaseConfig = (role) => {
        if (role === 'driver') {
            return {
                url: process.env.DRIVER_SUPABASE_URL || process.env.SUPABASE_URL || '',
                anonKey: process.env.DRIVER_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
                serviceRoleKey: process.env.DRIVER_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
            };
        }
        else if (role === 'student') {
            return {
                url: process.env.STUDENT_SUPABASE_URL || process.env.SUPABASE_URL || '',
                anonKey: process.env.STUDENT_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
                serviceRoleKey: process.env.STUDENT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
            };
        }
        else {
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
    if (!isProduction) {
        const hasDriverSpecific = !!(process.env.DRIVER_SUPABASE_URL && process.env.DRIVER_SUPABASE_ANON_KEY);
        const hasStudentSpecific = !!(process.env.STUDENT_SUPABASE_URL && process.env.STUDENT_SUPABASE_ANON_KEY);
        const hasLegacy = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
        if (hasDriverSpecific || hasStudentSpecific) {
            console.log('✅ Using role-based Supabase configurations');
            if (hasDriverSpecific)
                console.log('  - Driver: ✅ Configured');
            if (hasStudentSpecific)
                console.log('  - Student: ✅ Configured');
            if (hasLegacy)
                console.log('  - Legacy: ⚠️ Fallback available');
        }
        else if (hasLegacy) {
            console.warn('⚠️ Using legacy Supabase configuration. Consider migrating to role-based configs.');
        }
        else {
            console.warn('⚠️ Missing Supabase credentials. Check your .env file.');
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
            authMaxRequests: (0, envValidation_1.getEnvNumber)('AUTH_RATE_LIMIT_MAX_REQUESTS', isProduction ? 30 : 200),
        },
        security: {
            enableHelmet: (0, envValidation_1.getEnvBoolean)('ENABLE_HELMET', true),
            enableCors: (0, envValidation_1.getEnvBoolean)('ENABLE_CORS', true),
            enableRateLimit: (0, envValidation_1.getEnvBoolean)('ENABLE_RATE_LIMIT', false),
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
exports.initializeEnvironment = initializeEnvironment;
const config = (0, exports.initializeEnvironment)();
exports.default = config;
//# sourceMappingURL=environment.js.map