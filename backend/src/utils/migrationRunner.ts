import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database';
import { logger } from './logger';

export interface Migration {
  id: string;
  name: string;
  filename: string;
  executed_at?: Date;
}

export class MigrationRunner {
  private static instance: MigrationRunner;
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = join(__dirname, '..', 'migrations');
  }

  static getInstance(): MigrationRunner {
    if (!MigrationRunner.instance) {
      MigrationRunner.instance = new MigrationRunner();
    }
    return MigrationRunner.instance;
  }

  /**
   * Create migrations table if it doesn't exist
   */
  private async createMigrationsTable(): Promise<void> {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      logger.info('Migrations table created/verified', 'migration');
    } catch (error) {
      logger.error('Failed to create migrations table', 'migration', { error: String(error) });
      throw error;
    }
  }

  /**
   * Get list of executed migrations
   */
  private async getExecutedMigrations(): Promise<Migration[]> {
    try {
      const result = await pool.query('SELECT * FROM migrations ORDER BY executed_at');
      return result.rows;
    } catch (error) {
      logger.error('Failed to get executed migrations', 'migration', { error: String(error) });
      return [];
    }
  }

  /**
   * Get list of available migration files
   */
  private getAvailableMigrations(): Migration[] {
    try {
      const files = readdirSync(this.migrationsPath)
        .filter((file: string) => file.endsWith('.sql'))
        .sort();

      return files.map((file: string) => {
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
    } catch (error) {
      logger.error('Failed to get available migrations', 'migration', { error: String(error) });
      return [];
    }
  }

  /**
   * Execute a single migration with enhanced error handling
   */
  private async executeMigration(migration: Migration): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.info(`Executing migration: ${migration.filename}`, 'migration');
      
      // Read and execute the migration file
      const migrationPath = join(this.migrationsPath, migration.filename);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      // Split SQL into individual statements for better error handling
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await client.query(statement);
          } catch (stmtError) {
            logger.error(`Statement failed in migration ${migration.filename}`, 'migration', { 
              error: String(stmtError),
              statement: statement.substring(0, 100) + '...'
            });
            throw stmtError;
          }
        }
      }
      
      // Record the migration as executed
      await client.query(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      );
      
      await client.query('COMMIT');
      logger.info(`Migration ${migration.filename} executed successfully`, 'migration');
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Migration ${migration.filename} failed`, 'migration', { 
        error: String(error),
        migrationId: migration.id,
        migrationName: migration.name
      });
      
      // Provide helpful error information
      if (String(error).includes('foreign key constraint')) {
        logger.error('Foreign key constraint violation detected. Check data integrity.', 'migration');
      } else if (String(error).includes('duplicate key')) {
        logger.error('Duplicate key violation detected. Check for existing data conflicts.', 'migration');
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  public async runMigrations(): Promise<void> {
    try {
      logger.info('Starting database migrations...', 'migration');
      
      // Create migrations table
      await this.createMigrationsTable();
      
      // Get executed and available migrations
      const executedMigrations = await this.getExecutedMigrations();
      const availableMigrations = this.getAvailableMigrations();
      
      const executedIds = new Set(executedMigrations.map(m => m.id));
      const pendingMigrations = availableMigrations.filter(m => !executedIds.has(m.id));
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations', 'migration');
        return;
      }
      
      logger.info(`Found ${pendingMigrations.length} pending migrations`, 'migration');
      
      // Execute pending migrations in order
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      logger.info('All migrations completed successfully', 'migration');
      
    } catch (error) {
      logger.error('Migration process failed', 'migration', { error: String(error) });
      throw error;
    }
  }

  /**
   * Check if migrations are up to date
   */
  public async checkMigrationStatus(): Promise<{
    isUpToDate: boolean;
    pendingCount: number;
    executedCount: number;
  }> {
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
    } catch (error) {
      logger.error('Failed to check migration status', 'migration', { error: String(error) });
      return {
        isUpToDate: false,
        pendingCount: 0,
        executedCount: 0,
      };
    }
  }

  /**
   * Rollback a specific migration
   */
  public async rollbackMigration(migrationId: string): Promise<void> {
    try {
      logger.info(`Rolling back migration: ${migrationId}`, 'migration');
      
      // Check if rollback file exists
      const rollbackPath = join(this.migrationsPath, `rollback_${migrationId}_*.sql`);
      const rollbackFiles = readdirSync(this.migrationsPath)
        .filter((file: string) => file.startsWith(`rollback_${migrationId}_`));
      
      if (rollbackFiles.length === 0) {
        throw new Error(`No rollback script found for migration ${migrationId}`);
      }
      
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Execute rollback script
        const rollbackFile = rollbackFiles[0];
        const rollbackPath = join(this.migrationsPath, rollbackFile);
        const rollbackSQL = readFileSync(rollbackPath, 'utf8');
        
        await client.query(rollbackSQL);
        
        // Remove migration record
        await client.query('DELETE FROM migrations WHERE id = $1', [migrationId]);
        
        await client.query('COMMIT');
        logger.info(`Migration ${migrationId} rolled back successfully`, 'migration');
        
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to rollback migration ${migrationId}`, 'migration', { error: String(error) });
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      logger.error('Migration rollback failed', 'migration', { error: String(error) });
      throw error;
    }
  }
}

export default MigrationRunner;
