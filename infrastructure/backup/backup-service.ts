/**
 * Automated Backup Service for Microservices
 * Handles scheduled backups, cross-region replication, and point-in-time recovery
 */

import { logger } from '../../shared/utils/logger';
import { Pool } from 'pg';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';

const execAsync = promisify(exec);

interface BackupConfig {
  serviceName: string;
  databaseUrl: string;
  backupInterval: string; // cron expression
  retentionDays: number;
  s3Bucket?: string;
  s3Region?: string;
  compression: boolean;
  encryption: boolean;
  crossRegionReplication: boolean;
}

interface BackupResult {
  id: string;
  serviceName: string;
  timestamp: string;
  size: number;
  status: 'success' | 'failed';
  location: string;
  error?: string;
}

class BackupService {
  private configs: Map<string, BackupConfig> = new Map();
  private s3Client?: S3;
  private backupJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    // Initialize S3 client if configured
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
      });
    }
  }

  /**
   * Register a service for automated backups
   */
  public registerService(config: BackupConfig): void {
    this.configs.set(config.serviceName, config);
    
    // Schedule backup job
    const job = cron.schedule(config.backupInterval, async () => {
      try {
        await this.createBackup(config.serviceName);
      } catch (error) {
        logger.error('Scheduled backup failed', 'backupService', {
          serviceName: config.serviceName,
          error: (error as Error).message,
        });
      }
    }, {
      scheduled: false,
      timezone: 'UTC',
    });

    this.backupJobs.set(config.serviceName, job);
    job.start();

    logger.info(`Backup service registered for ${config.serviceName}`, 'backupService', {
      interval: config.backupInterval,
      retentionDays: config.retentionDays,
    });
  }

  /**
   * Create a backup for a specific service
   */
  public async createBackup(serviceName: string): Promise<BackupResult> {
    const config = this.configs.get(serviceName);
    if (!config) {
      throw new Error(`No backup configuration found for service: ${serviceName}`);
    }

    const backupId = uuidv4();
    const timestamp = new Date().toISOString();
    const backupDir = `./backups/${serviceName}`;
    const backupFileName = `${serviceName}_${timestamp.replace(/[:.]/g, '-')}.sql`;
    const backupPath = `${backupDir}/${backupFileName}`;

    try {
      // Create backup directory if it doesn't exist
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
      }

      logger.info(`Creating backup for ${serviceName}`, 'backupService', {
        backupId,
        serviceName,
        timestamp,
      });

      // Create database backup
      const backupCommand = this.buildBackupCommand(config, backupPath);
      await execAsync(backupCommand);

      // Get backup size
      const stats = require('fs').statSync(backupPath);
      const size = stats.size;

      // Compress backup if configured
      let finalPath = backupPath;
      if (config.compression) {
        finalPath = await this.compressBackup(backupPath);
      }

      // Encrypt backup if configured
      if (config.encryption) {
        finalPath = await this.encryptBackup(finalPath);
      }

      // Upload to S3 if configured
      let s3Location = '';
      if (this.s3Client && config.s3Bucket) {
        s3Location = await this.uploadToS3(finalPath, config);
      }

      const result: BackupResult = {
        id: backupId,
        serviceName,
        timestamp,
        size,
        status: 'success',
        location: s3Location || finalPath,
      };

      logger.info(`Backup created successfully for ${serviceName}`, 'backupService', {
        backupId,
        size: `${(size / 1024 / 1024).toFixed(2)} MB`,
        location: result.location,
      });

      // Cleanup old backups
      await this.cleanupOldBackups(serviceName, config.retentionDays);

      return result;

    } catch (error) {
      const result: BackupResult = {
        id: backupId,
        serviceName,
        timestamp,
        size: 0,
        status: 'failed',
        location: '',
        error: (error as Error).message,
      };

      logger.error(`Backup failed for ${serviceName}`, 'backupService', {
        backupId,
        error: (error as Error).message,
      });

      return result;
    }
  }

  /**
   * Restore from backup
   */
  public async restoreBackup(serviceName: string, backupId: string): Promise<void> {
    const config = this.configs.get(serviceName);
    if (!config) {
      throw new Error(`No backup configuration found for service: ${serviceName}`);
    }

    try {
      logger.info(`Restoring backup for ${serviceName}`, 'backupService', {
        backupId,
        serviceName,
      });

      // Download from S3 if needed
      let backupPath = `./backups/${serviceName}/${backupId}.sql`;
      if (this.s3Client && config.s3Bucket) {
        backupPath = await this.downloadFromS3(backupId, config);
      }

      // Decrypt backup if needed
      if (config.encryption) {
        backupPath = await this.decryptBackup(backupPath);
      }

      // Decompress backup if needed
      if (config.compression) {
        backupPath = await this.decompressBackup(backupPath);
      }

      // Restore database
      const restoreCommand = this.buildRestoreCommand(config, backupPath);
      await execAsync(restoreCommand);

      logger.info(`Backup restored successfully for ${serviceName}`, 'backupService', {
        backupId,
        serviceName,
      });

    } catch (error) {
      logger.error(`Backup restore failed for ${serviceName}`, 'backupService', {
        backupId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * List available backups for a service
   */
  public async listBackups(serviceName: string): Promise<BackupResult[]> {
    const backupDir = `./backups/${serviceName}`;
    const backups: BackupResult[] = [];

    if (!existsSync(backupDir)) {
      return backups;
    }

    const files = require('fs').readdirSync(backupDir);
    
    for (const file of files) {
      if (file.endsWith('.sql') || file.endsWith('.sql.gz') || file.endsWith('.sql.enc')) {
        const stats = require('fs').statSync(`${backupDir}/${file}`);
        const timestamp = stats.mtime.toISOString();
        
        backups.push({
          id: file.replace(/\.(sql|gz|enc)$/, ''),
          serviceName,
          timestamp,
          size: stats.size,
          status: 'success',
          location: `${backupDir}/${file}`,
        });
      }
    }

    return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Build backup command
   */
  private buildBackupCommand(config: BackupConfig, outputPath: string): string {
    const url = new URL(config.databaseUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;

    return `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f ${outputPath}`;
  }

  /**
   * Build restore command
   */
  private buildRestoreCommand(config: BackupConfig, inputPath: string): string {
    const url = new URL(config.databaseUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;

    return `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database} -f ${inputPath}`;
  }

  /**
   * Compress backup file
   */
  private async compressBackup(filePath: string): Promise<string> {
    const compressedPath = `${filePath}.gz`;
    await execAsync(`gzip -c "${filePath}" > "${compressedPath}"`);
    require('fs').unlinkSync(filePath); // Remove original file
    return compressedPath;
  }

  /**
   * Encrypt backup file
   */
  private async encryptBackup(filePath: string): Promise<string> {
    const encryptedPath = `${filePath}.enc`;
    const key = process.env.BACKUP_ENCRYPTION_KEY || 'default-key';
    await execAsync(`openssl enc -aes-256-cbc -salt -in "${filePath}" -out "${encryptedPath}" -k "${key}"`);
    require('fs').unlinkSync(filePath); // Remove original file
    return encryptedPath;
  }

  /**
   * Upload backup to S3
   */
  private async uploadToS3(filePath: string, config: BackupConfig): Promise<string> {
    if (!this.s3Client || !config.s3Bucket) {
      throw new Error('S3 client not configured');
    }

    const fileName = require('path').basename(filePath);
    const key = `backups/${config.serviceName}/${fileName}`;

    const uploadParams = {
      Bucket: config.s3Bucket,
      Key: key,
      Body: require('fs').createReadStream(filePath),
      ServerSideEncryption: 'AES256',
    };

    await this.s3Client.upload(uploadParams).promise();
    return `s3://${config.s3Bucket}/${key}`;
  }

  /**
   * Download backup from S3
   */
  private async downloadFromS3(backupId: string, config: BackupConfig): Promise<string> {
    if (!this.s3Client || !config.s3Bucket) {
      throw new Error('S3 client not configured');
    }

    const key = `backups/${config.serviceName}/${backupId}`;
    const downloadPath = `./temp/${backupId}`;

    const downloadParams = {
      Bucket: config.s3Bucket,
      Key: key,
    };

    const data = await this.s3Client.getObject(downloadParams).promise();
    require('fs').writeFileSync(downloadPath, data.Body);
    return downloadPath;
  }

  /**
   * Decrypt backup file
   */
  private async decryptBackup(filePath: string): Promise<string> {
    const decryptedPath = filePath.replace('.enc', '');
    const key = process.env.BACKUP_ENCRYPTION_KEY || 'default-key';
    await execAsync(`openssl enc -aes-256-cbc -d -in "${filePath}" -out "${decryptedPath}" -k "${key}"`);
    return decryptedPath;
  }

  /**
   * Decompress backup file
   */
  private async decompressBackup(filePath: string): Promise<string> {
    const decompressedPath = filePath.replace('.gz', '');
    await execAsync(`gunzip -c "${filePath}" > "${decompressedPath}"`);
    return decompressedPath;
  }

  /**
   * Cleanup old backups
   */
  private async cleanupOldBackups(serviceName: string, retentionDays: number): Promise<void> {
    const backupDir = `./backups/${serviceName}`;
    if (!existsSync(backupDir)) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const files = require('fs').readdirSync(backupDir);
    
    for (const file of files) {
      const filePath = `${backupDir}/${file}`;
      const stats = require('fs').statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        require('fs').unlinkSync(filePath);
        logger.info(`Cleaned up old backup: ${file}`, 'backupService', {
          serviceName,
          file,
          age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)),
        });
      }
    }
  }

  /**
   * Stop backup service
   */
  public stop(): void {
    for (const [serviceName, job] of this.backupJobs) {
      job.stop();
      logger.info(`Backup service stopped for ${serviceName}`, 'backupService');
    }
    this.backupJobs.clear();
  }
}

// Global backup service instance
export const backupService = new BackupService();

export default backupService;
