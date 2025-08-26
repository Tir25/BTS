"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabaseConnection = exports.initializeDatabaseConnection = exports.checkDatabaseHealth = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const getDatabaseConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '10000'),
        retryDelay: parseInt(process.env.DB_RETRY_DELAY || '5000'),
        maxRetries: parseInt(process.env.DB_MAX_RETRIES || '5'),
    };
};
const createPool = () => {
    const config = getDatabaseConfig();
    return new pg_1.Pool(config);
};
let pool = createPool();
const retryConnection = async (retryCount = 0) => {
    const config = getDatabaseConfig();
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        console.log('✅ Database connection successful');
        return pool;
    }
    catch (error) {
        console.error(`❌ Database connection attempt ${retryCount + 1} failed:`, error);
        if (retryCount < config.maxRetries) {
            console.log(`🔄 Retrying database connection in ${config.retryDelay / 1000} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, config.retryDelay));
            return retryConnection(retryCount + 1);
        }
        else {
            console.error('❌ Maximum database connection retries exceeded');
            throw new Error(`Database connection failed after ${config.maxRetries} attempts`);
        }
    }
};
pool.on('connect', () => {
    console.log('✅ New client connected to PostgreSQL database');
});
pool.on('error', (err) => {
    console.error('❌ Database pool error:', err);
    if (err.message.includes('connection') ||
        err.message.includes('authentication')) {
        pool
            .end()
            .then(() => {
            pool = createPool();
        })
            .catch(console.error);
    }
});
pool.on('remove', () => {
    console.log('🔌 Client removed from database pool');
});
const checkDatabaseHealth = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
        client.release();
        return {
            healthy: true,
            details: {
                currentTime: result.rows[0].current_time,
                postgresVersion: result.rows[0].postgres_version,
                poolSize: pool.totalCount,
                idleCount: pool.idleCount,
                waitingCount: pool.waitingCount,
            },
        };
    }
    catch (error) {
        return {
            healthy: false,
            details: {
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            },
        };
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
const initializeDatabaseConnection = async () => {
    console.log('🔄 Initializing database connection...');
    return await retryConnection();
};
exports.initializeDatabaseConnection = initializeDatabaseConnection;
const closeDatabaseConnection = async () => {
    console.log('🔄 Closing database connections...');
    await pool.end();
    console.log('✅ Database connections closed');
};
exports.closeDatabaseConnection = closeDatabaseConnection;
exports.default = pool;
//# sourceMappingURL=database.js.map