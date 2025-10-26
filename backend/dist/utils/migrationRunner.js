"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationRunner = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const database_1 = require("../config/database");
const logger_1 = require("./logger");
class MigrationRunner {
    constructor() {
        this.migrationsPath = (0, path_1.join)(__dirname, '..', 'migrations');
    }
    static getInstance() {
        if (!MigrationRunner.instance) {
            MigrationRunner.instance = new MigrationRunner();
        }
        return MigrationRunner.instance;
    }
    async createMigrationsTable() {
        try {
            await database_1.pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
            logger_1.logger.info('Migrations table created/verified', 'migration');
        }
        catch (error) {
            logger_1.logger.error('Failed to create migrations table', 'migration', { error: String(error) });
            throw error;
        }
    }
    async getExecutedMigrations() {
        try {
            const result = await database_1.pool.query('SELECT * FROM migrations ORDER BY executed_at');
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Failed to get executed migrations', 'migration', { error: String(error) });
            return [];
        }
    }
    getAvailableMigrations() {
        try {
            const files = (0, fs_1.readdirSync)(this.migrationsPath)
                .filter((file) => file.endsWith('.sql'))
                .sort();
            return files.map((file) => {
                const match = file.match(/^(\d+)_(.+)\.sql$/);
                if (!match) {
                    throw new Error(`Invalid migration filename: ${file}`);
                }
                return {
                    id: match[1],
                    name: match[2],
                    filename: file,
                };
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get available migrations', 'migration', { error: String(error) });
            return [];
        }
    }
    async executeMigration(migration) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            logger_1.logger.info(`Executing migration: ${migration.filename}`, 'migration');
            const migrationPath = (0, path_1.join)(this.migrationsPath, migration.filename);
            const migrationSQL = (0, fs_1.readFileSync)(migrationPath, 'utf8');
            const statements = migrationSQL
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await client.query(statement);
                    }
                    catch (stmtError) {
                        logger_1.logger.error(`Statement failed in migration ${migration.filename}`, 'migration', {
                            error: String(stmtError),
                            statement: statement.substring(0, 100) + '...'
                        });
                        throw stmtError;
                    }
                }
            }
            await client.query('INSERT INTO migrations (id, name) VALUES ($1, $2)', [migration.id, migration.name]);
            await client.query('COMMIT');
            logger_1.logger.info(`Migration ${migration.filename} executed successfully`, 'migration');
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error(`Migration ${migration.filename} failed`, 'migration', {
                error: String(error),
                migrationId: migration.id,
                migrationName: migration.name
            });
            if (String(error).includes('foreign key constraint')) {
                logger_1.logger.error('Foreign key constraint violation detected. Check data integrity.', 'migration');
            }
            else if (String(error).includes('duplicate key')) {
                logger_1.logger.error('Duplicate key violation detected. Check for existing data conflicts.', 'migration');
            }
            throw error;
        }
        finally {
            client.release();
        }
    }
    async runMigrations() {
        try {
            logger_1.logger.info('Starting database migrations...', 'migration');
            await this.createMigrationsTable();
            const executedMigrations = await this.getExecutedMigrations();
            const availableMigrations = this.getAvailableMigrations();
            const executedIds = new Set(executedMigrations.map(m => m.id));
            const pendingMigrations = availableMigrations.filter(m => !executedIds.has(m.id));
            if (pendingMigrations.length === 0) {
                logger_1.logger.info('No pending migrations', 'migration');
                return;
            }
            logger_1.logger.info(`Found ${pendingMigrations.length} pending migrations`, 'migration');
            for (const migration of pendingMigrations) {
                await this.executeMigration(migration);
            }
            logger_1.logger.info('All migrations completed successfully', 'migration');
        }
        catch (error) {
            logger_1.logger.error('Migration process failed', 'migration', { error: String(error) });
            throw error;
        }
    }
    async checkMigrationStatus() {
        try {
            await this.createMigrationsTable();
            const executedMigrations = await this.getExecutedMigrations();
            const availableMigrations = this.getAvailableMigrations();
            const executedIds = new Set(executedMigrations.map(m => m.id));
            const pendingMigrations = availableMigrations.filter(m => !executedIds.has(m.id));
            return {
                isUpToDate: pendingMigrations.length === 0,
                pendingCount: pendingMigrations.length,
                executedCount: executedMigrations.length,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to check migration status', 'migration', { error: String(error) });
            return {
                isUpToDate: false,
                pendingCount: 0,
                executedCount: 0,
            };
        }
    }
    async rollbackMigration(migrationId) {
        try {
            logger_1.logger.info(`Rolling back migration: ${migrationId}`, 'migration');
            const rollbackPath = (0, path_1.join)(this.migrationsPath, `rollback_${migrationId}_*.sql`);
            const rollbackFiles = (0, fs_1.readdirSync)(this.migrationsPath)
                .filter((file) => file.startsWith(`rollback_${migrationId}_`));
            if (rollbackFiles.length === 0) {
                throw new Error(`No rollback script found for migration ${migrationId}`);
            }
            const client = await database_1.pool.connect();
            try {
                await client.query('BEGIN');
                const rollbackFile = rollbackFiles[0];
                const rollbackPath = (0, path_1.join)(this.migrationsPath, rollbackFile);
                const rollbackSQL = (0, fs_1.readFileSync)(rollbackPath, 'utf8');
                await client.query(rollbackSQL);
                await client.query('DELETE FROM migrations WHERE id = $1', [migrationId]);
                await client.query('COMMIT');
                logger_1.logger.info(`Migration ${migrationId} rolled back successfully`, 'migration');
            }
            catch (error) {
                await client.query('ROLLBACK');
                logger_1.logger.error(`Failed to rollback migration ${migrationId}`, 'migration', { error: String(error) });
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            logger_1.logger.error('Migration rollback failed', 'migration', { error: String(error) });
            throw error;
        }
    }
}
exports.MigrationRunner = MigrationRunner;
exports.default = MigrationRunner;
//# sourceMappingURL=migrationRunner.js.map