import fs from 'fs';
import path from 'path';
import * as zlib from 'zlib';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

interface LogRotationConfig {
  maxSize: number; // Maximum size in bytes
  maxFiles: number; // Maximum number of log files to keep
  compress: boolean; // Whether to compress old logs
  rotateOnStart: boolean; // Whether to rotate on application start
  datePattern: string; // Date pattern for log files
  logDirectory: string; // Directory to store rotated logs
}

// Default log rotation configuration
const defaultConfig: LogRotationConfig = {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  compress: true,
  rotateOnStart: true,
  datePattern: 'YYYY-MM-DD',
  logDirectory: path.join(process.cwd(), 'logs')
};

class LogRotator {
  private config: LogRotationConfig;
  private rotationTimer: NodeJS.Timeout | null = null;
  private isRotating = false;

  constructor(config: Partial<LogRotationConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.ensureLogDirectory();
    this.setupRotation();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
      logger.info('Created log directory', 'log-rotator', { 
        directory: this.config.logDirectory 
      });
    }
  }

  private setupRotation(): void {
    // Rotate on start if configured
    if (this.config.rotateOnStart) {
      this.rotateLogs();
    }

    // Set up periodic rotation check (every hour)
    this.rotationTimer = setInterval(() => {
      this.checkAndRotate();
    }, 60 * 60 * 1000); // 1 hour

    logger.info('Log rotation setup completed', 'log-rotator', {
      maxSize: this.config.maxSize,
      maxFiles: this.config.maxFiles,
      compress: this.config.compress
    });
  }

  private checkAndRotate(): void {
    if (this.isRotating) {
      return;
    }

    try {
      // Check if rotation is needed
      if (this.shouldRotate()) {
        this.rotateLogs();
      }
    } catch (error) {
      logger.error('Error during log rotation check', 'log-rotator', { error });
    }
  }

  private shouldRotate(): boolean {
    // Check if any log files exceed the maximum size
    const logFiles = this.getLogFiles();
    
    for (const file of logFiles) {
      const stats = fs.statSync(file);
      if (stats.size > this.config.maxSize) {
        return true;
      }
    }

    return false;
  }

  private getLogFiles(): string[] {
    const files: string[] = [];
    
    // Check for common log file patterns
    const logPatterns = [
      'app.log',
      'error.log',
      'access.log',
      'combined.log'
    ];

    for (const pattern of logPatterns) {
      const filePath = path.join(this.config.logDirectory, pattern);
      if (fs.existsSync(filePath)) {
        files.push(filePath);
      }
    }

    return files;
  }

  private rotateLogs(): void {
    if (this.isRotating) {
      return;
    }

    this.isRotating = true;
    logger.info('Starting log rotation', 'log-rotator');

    try {
      const logFiles = this.getLogFiles();
      
      for (const logFile of logFiles) {
        this.rotateFile(logFile);
      }

      // Clean up old log files
      this.cleanupOldLogs();

      logger.info('Log rotation completed', 'log-rotator');
    } catch (error) {
      logger.error('Error during log rotation', 'log-rotator', { error });
    } finally {
      this.isRotating = false;
    }
  }

  private rotateFile(logFile: string): void {
    const stats = fs.statSync(logFile);
    
    // Only rotate if file is large enough
    if (stats.size < this.config.maxSize) {
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const rotatedFile = `${logFile}.${timestamp}`;
    
    // Move current log to rotated file
    fs.renameSync(logFile, rotatedFile);
    
    // Create new empty log file
    fs.writeFileSync(logFile, '');
    
    // Compress if configured
    if (this.config.compress) {
      this.compressFile(rotatedFile);
    }

    logger.info('Rotated log file', 'log-rotator', {
      original: logFile,
      rotated: rotatedFile,
      size: stats.size
    });
  }

  private compressFile(filePath: string): void {
    try {
      // Simple compression using gzip (Node.js built-in)
      const gzip = zlib.createGzip();
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(`${filePath}.gz`);
      
      input.pipe(gzip).pipe(output);
      
      // Remove original file after compression
      output.on('finish', () => {
        fs.unlinkSync(filePath);
        logger.debug('Compressed log file', 'log-rotator', { file: filePath });
      });
    } catch (error) {
      logger.error('Error compressing log file', 'log-rotator', { error, file: filePath });
    }
  }

  private cleanupOldLogs(): void {
    const logFiles = this.getLogFiles();
    
    for (const logFile of logFiles) {
      this.cleanupFile(logFile);
    }
  }

  private cleanupFile(logFile: string): void {
    const baseName = path.basename(logFile);
    const directory = path.dirname(logFile);
    
    // Get all rotated files for this log
    const files = fs.readdirSync(directory)
      .filter(file => file.startsWith(baseName) && file !== baseName)
      .map(file => ({
        name: file,
        path: path.join(directory, file),
        stats: fs.statSync(path.join(directory, file))
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

    // Remove excess files
    if (files.length > this.config.maxFiles) {
      const filesToRemove = files.slice(this.config.maxFiles);
      
      for (const file of filesToRemove) {
        try {
          fs.unlinkSync(file.path);
          logger.debug('Removed old log file', 'log-rotator', { file: file.name });
        } catch (error) {
          logger.error('Error removing old log file', 'log-rotator', { 
            error, 
            file: file.name 
          });
        }
      }
    }
  }

  public getRotationStats(): any {
    const logFiles = this.getLogFiles();
    const stats = {
      totalFiles: logFiles.length,
      files: logFiles.map(file => {
        const fileStats = fs.statSync(file);
        return {
          name: path.basename(file),
          size: fileStats.size,
          lastModified: fileStats.mtime,
          sizeMB: Math.round(fileStats.size / 1024 / 1024 * 100) / 100
        };
      }),
      config: {
        maxSize: this.config.maxSize,
        maxFiles: this.config.maxFiles,
        compress: this.config.compress
      }
    };

    return stats;
  }

  public forceRotation(): void {
    logger.info('Manual log rotation requested', 'log-rotator');
    this.rotateLogs();
  }

  public stop(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
    logger.info('Log rotation stopped', 'log-rotator');
  }
}

// Create global log rotator instance
const logRotator = new LogRotator();

// Log rotation middleware
export const logRotationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // This middleware can be used to trigger rotation based on request patterns
  next();
};

// Log rotation endpoints
export const getLogRotationStats = (req: any, res: any) => {
  try {
    const stats = logRotator.getRotationStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting log rotation stats', 'log-rotator', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get log rotation statistics'
    });
  }
};

export const forceLogRotation = (req: any, res: any) => {
  try {
    logRotator.forceRotation();
    res.json({
      success: true,
      message: 'Log rotation completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error during manual log rotation', 'log-rotator', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to perform log rotation'
    });
  }
};

// Export log rotator instance
export { logRotator };

// Graceful shutdown
process.on('SIGTERM', () => {
  logRotator.stop();
});

process.on('SIGINT', () => {
  logRotator.stop();
});
