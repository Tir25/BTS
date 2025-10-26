"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDevelopment = exports.isProduction = exports.getConfigValue = exports.getConfig = exports.configManager = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
const fallbackEnvFile = '.env';
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), envFile) });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), fallbackEnvFile) });
class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    loadConfig() {
        const nodeEnv = process.env.NODE_ENV || 'development';
        const isProduction = nodeEnv === 'production';
        if (isProduction) {
            this.validateRequiredEnvVars();
        }
        return {
            port: this.getEnvNumber('PORT', 3000),
            nodeEnv,
            database: {
                url: this.getEnvVar('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/bus_tracking'),
                poolMax: this.getEnvNumber('DB_POOL_MAX', 20),
                poolIdleTimeout: this.getEnvNumber('DB_POOL_IDLE_TIMEOUT', 30000),
                poolConnectionTimeout: this.getEnvNumber('DB_POOL_CONNECTION_TIMEOUT', 10000),
            },
            supabase: {
                url: this.getEnvVar('SUPABASE_URL', 'http://localhost:54321'),
                anonKey: this.getEnvVar('SUPABASE_ANON_KEY', 'DEVELOPMENT-PLACEHOLDER-KEY'),
                serviceRoleKey: this.getEnvVar('SUPABASE_SERVICE_ROLE_KEY', 'DEVELOPMENT-PLACEHOLDER-SERVICE-KEY'),
            },
            security: {
                corsOrigins: this.getCorsOrigins(),
                enableHelmet: this.getEnvBoolean('ENABLE_HELMET', true),
                enableCors: this.getEnvBoolean('ENABLE_CORS', true),
                enableRateLimit: this.getEnvBoolean('ENABLE_RATE_LIMIT', true),
            },
            rateLimit: {
                windowMs: this.getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
                maxRequests: this.getEnvNumber('RATE_LIMIT_MAX', 100),
            },
            logging: {
                level: this.getEnvVar('LOG_LEVEL', 'info'),
                enableDebugLogs: this.getEnvBoolean('ENABLE_DEBUG_LOGS', !isProduction),
            },
        };
    }
    validateRequiredEnvVars() {
        const requiredVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            'DATABASE_URL',
        ];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            logger_1.logger.error('Missing required environment variables', 'config-manager', {
                missing: missingVars
            });
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
    }
    getEnvVar(name, defaultValue) {
        return process.env[name] || defaultValue;
    }
    getEnvNumber(name, defaultValue) {
        const value = process.env[name];
        return value ? parseInt(value, 10) : defaultValue;
    }
    getEnvBoolean(name, defaultValue) {
        const value = process.env[name];
        return value ? value.toLowerCase() === 'true' : defaultValue;
    }
    getCorsOrigins() {
        const corsOrigin = process.env.CORS_ORIGIN;
        if (corsOrigin) {
            return corsOrigin.split(',').map(origin => origin.trim());
        }
        if (this.config?.nodeEnv === 'production') {
            return [
                'https://bts-frontend-navy.vercel.app',
                'https://bts-frontend-navy.vercel.com',
            ];
        }
        return [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
        ];
    }
    getConfig() {
        return this.config;
    }
    get(key) {
        return this.config[key];
    }
    isProduction() {
        return this.config.nodeEnv === 'production';
    }
    isDevelopment() {
        return this.config.nodeEnv === 'development';
    }
    reload() {
        this.config = this.loadConfig();
        logger_1.logger.info('Configuration reloaded', 'config-manager');
    }
}
exports.configManager = ConfigManager.getInstance();
const getConfig = () => exports.configManager.getConfig();
exports.getConfig = getConfig;
const getConfigValue = (key) => exports.configManager.get(key);
exports.getConfigValue = getConfigValue;
const isProduction = () => exports.configManager.isProduction();
exports.isProduction = isProduction;
const isDevelopment = () => exports.configManager.isDevelopment();
exports.isDevelopment = isDevelopment;
//# sourceMappingURL=ConfigManager.js.map