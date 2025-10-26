"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTableColumns = exports.tableExists = exports.getDatabaseHealth = exports.testDatabaseConnection = exports.initializeDatabase = void 0;
const database_1 = __importStar(require("../config/database"));
const logger_1 = require("../utils/logger");
const migrationRunner_1 = __importDefault(require("../utils/migrationRunner"));
const initializeDatabase = async () => {
    try {
        logger_1.logger.info('Initializing database schema...', 'database');
        await (0, database_1.checkDatabaseHealth)();
        const migrationRunner = migrationRunner_1.default.getInstance();
        try {
            await migrationRunner.runMigrations();
            logger_1.logger.info('Database migrations completed successfully', 'database');
        }
        catch (migrationError) {
            logger_1.logger.error('Database migrations failed', 'database', { error: String(migrationError) });
            logger_1.logger.warn('Continuing with existing database schema...', 'database');
        }
        logger_1.logger.info('Database initialization completed successfully', 'database');
    }
    catch (error) {
        logger_1.logger.error('Database initialization failed', 'database', { error: String(error) });
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
const testDatabaseConnection = async () => {
    try {
        const health = await (0, database_1.checkDatabaseHealth)();
        if (health.healthy) {
            logger_1.logger.info('Database connection test successful', 'database');
        }
        else {
            const errorMessage = health.error;
            throw new Error(typeof errorMessage === 'string'
                ? errorMessage
                : 'Database health check failed');
        }
    }
    catch (error) {
        logger_1.logger.error('Database connection test failed', 'database', { error: String(error) });
        throw error;
    }
};
exports.testDatabaseConnection = testDatabaseConnection;
const getDatabaseHealth = async () => {
    return await (0, database_1.checkDatabaseHealth)();
};
exports.getDatabaseHealth = getDatabaseHealth;
const tableExists = async (tableName) => {
    try {
        const result = await database_1.default.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
        return result.rows[0].exists;
    }
    catch (error) {
        logger_1.logger.error(`Error checking if table ${tableName} exists`, 'database', { error: String(error) });
        return false;
    }
};
exports.tableExists = tableExists;
const getTableColumns = async (tableName) => {
    try {
        const result = await database_1.default.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      ORDER BY ordinal_position;
    `, [tableName]);
        return result.rows.map((row) => row.column_name);
    }
    catch (error) {
        logger_1.logger.error(`Error getting columns for table ${tableName}`, 'database', { error: String(error) });
        return [];
    }
};
exports.getTableColumns = getTableColumns;
//# sourceMappingURL=database.js.map