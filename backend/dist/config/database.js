"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.queryWithRetry = exports.closeDatabasePool = exports.checkDatabaseHealth = exports.pool = void 0;
const pg_1 = require("pg");
const environment_1 = __importDefault(require("./environment"));
const environment = (0, environment_1.default)();
const getDatabaseUrl = () => {
    return environment.database.url;
};
const poolConfig = {
    connectionString: getDatabaseUrl(),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    maxUses: 7500,
    ssl: environment.nodeEnv === 'production'
        ? { rejectUnauthorized: false }
        : false,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
};
exports.pool = new pg_1.Pool(poolConfig);
exports.pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});
exports.pool.on('connect', () => {
    console.log('✅ New database client connected');
});
exports.pool.on('acquire', () => {
    console.log('🔗 Database client acquired from pool');
});
exports.pool.on('remove', () => {
    console.log('🔓 Database client removed from pool');
});
const checkDatabaseHealth = async () => {
    let client = null;
    try {
        client = await exports.pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as db_version');
        console.log('✅ Database health check passed:', {
            currentTime: result.rows[0].current_time,
            version: result.rows[0].db_version.split(' ')[0],
        });
        return { healthy: true };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        console.error('❌ Database health check failed:', errorMessage);
        return { healthy: false, error: errorMessage };
    }
    finally {
        if (client) {
            client.release();
        }
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
const closeDatabasePool = async () => {
    try {
        console.log('🔄 Closing database pool...');
        await exports.pool.end();
        console.log('✅ Database pool closed successfully');
    }
    catch (error) {
        console.error('❌ Error closing database pool:', error);
    }
};
exports.closeDatabasePool = closeDatabasePool;
const queryWithRetry = async (text, params, maxRetries = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await exports.pool.query(text, params);
            if (attempt > 1) {
                console.log(`✅ Query succeeded on attempt ${attempt}`);
            }
            return result;
        }
        catch (error) {
            lastError =
                error instanceof Error ? error : new Error('Unknown database error');
            console.error(`❌ Database query failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
            if (attempt === maxRetries) {
                throw lastError;
            }
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
};
exports.queryWithRetry = queryWithRetry;
const initializeDatabase = async () => {
    try {
        console.log('🔄 Initializing database connection...');
        const health = await (0, exports.checkDatabaseHealth)();
        if (!health.healthy) {
            throw new Error(`Database health check failed: ${health.error}`);
        }
        console.log('✅ Database initialized successfully');
    }
    catch (error) {
        console.error('❌ Failed to initialize database:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
exports.default = exports.pool;
//# sourceMappingURL=database.js.map