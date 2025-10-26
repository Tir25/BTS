"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvArray = exports.getEnvBoolean = exports.getEnvNumber = exports.getEnvVar = exports.validateEnvironment = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
];
const optionalEnvVars = [
    'JWT_SECRET',
    'CORS_ORIGIN',
    'CORS_METHODS',
    'CORS_CREDENTIALS',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX',
    'LOG_LEVEL',
    'ENABLE_DEBUG_LOGS',
    'WEBSOCKET_PATH',
    'DB_POOL_MAX',
    'DB_POOL_IDLE_TIMEOUT',
    'DB_POOL_CONNECTION_TIMEOUT',
    'DB_RETRY_DELAY',
    'DB_MAX_RETRIES',
];
const validateEnvironment = () => {
    const missingVars = [];
    const invalidVars = [];
    requiredEnvVars.forEach((varName) => {
        const value = process.env[varName];
        if (!value) {
            missingVars.push(varName);
        }
    });
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:', missingVars.join(', '));
        console.error('💡 Please check your .env file and ensure all required variables are set');
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    if (process.env.PORT && isNaN(Number(process.env.PORT))) {
        invalidVars.push('PORT must be a number');
    }
    if (process.env.SUPABASE_URL &&
        !process.env.SUPABASE_URL.startsWith('https://')) {
        invalidVars.push('SUPABASE_URL must be a valid HTTPS URL');
    }
    if (process.env.SUPABASE_ANON_KEY &&
        process.env.SUPABASE_ANON_KEY.length < 20) {
        invalidVars.push('SUPABASE_ANON_KEY appears to be invalid');
    }
    if (process.env.SUPABASE_SERVICE_ROLE_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY.length < 20) {
        invalidVars.push('SUPABASE_SERVICE_ROLE_KEY appears to be invalid');
    }
    if (process.env.DATABASE_URL &&
        !process.env.DATABASE_URL.startsWith('postgres://') &&
        !process.env.DATABASE_URL.startsWith('postgresql://')) {
        const decodedUrl = decodeURIComponent(process.env.DATABASE_URL);
        if (!decodedUrl.startsWith('postgres://') && !decodedUrl.startsWith('postgresql://')) {
            invalidVars.push('DATABASE_URL must be a valid PostgreSQL connection string');
        }
    }
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:', missingVars.join(', '));
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    if (invalidVars.length > 0) {
        console.error('❌ Invalid environment variables:', invalidVars.join(', '));
        throw new Error(`Invalid environment variables: ${invalidVars.join(', ')}`);
    }
    console.log('✅ Environment variables validated successfully');
    const missingOptional = optionalEnvVars.filter((varName) => !process.env[varName]);
    if (missingOptional.length > 0) {
        console.log('ℹ️  Optional environment variables not set:', missingOptional.join(', '));
    }
};
exports.validateEnvironment = validateEnvironment;
const getEnvVar = (name, defaultValue) => {
    const value = process.env[name];
    if (!value && !defaultValue) {
        throw new Error(`Environment variable ${name} is required but not set`);
    }
    return value || defaultValue;
};
exports.getEnvVar = getEnvVar;
const getEnvNumber = (name, defaultValue) => {
    const value = process.env[name];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${name} is required but not set`);
    }
    const numValue = value ? Number(value) : defaultValue;
    if (isNaN(numValue)) {
        throw new Error(`Environment variable ${name} must be a valid number`);
    }
    return numValue;
};
exports.getEnvNumber = getEnvNumber;
const getEnvBoolean = (name, defaultValue) => {
    const value = process.env[name];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${name} is required but not set`);
    }
    if (!value)
        return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
};
exports.getEnvBoolean = getEnvBoolean;
const getEnvArray = (name, separator = ',', defaultValue) => {
    const value = process.env[name];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${name} is required but not set`);
    }
    if (!value)
        return defaultValue;
    return value.split(separator).map(item => item.trim());
};
exports.getEnvArray = getEnvArray;
//# sourceMappingURL=envValidation.js.map