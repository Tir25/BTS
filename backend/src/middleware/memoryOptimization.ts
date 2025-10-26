import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Memory optimization configuration
interface MemoryConfig {
  warningThreshold: number;
  criticalThreshold: number;
  emergencyThreshold: number;
  gcInterval: number;
  cleanupInterval: number;
}

// Default memory configuration
const defaultMemoryConfig: MemoryConfig = {
  warningThreshold: 300 * 1024 * 1024, // 300MB
  criticalThreshold: 400 * 1024 * 1024, // 400MB
  emergencyThreshold: 500 * 1024 * 1024, // 500MB
  gcInterval: 2 * 60 * 1000, // 2 minutes
  cleanupInterval: 5 * 60 * 1000 // 5 minutes
};

class MemoryOptimizer {
  private config: MemoryConfig;
  private gcTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private memoryHistory: Array<{ timestamp: number; usage: number }> = [];
  private maxHistorySize = 100;

  constructor(config: MemoryConfig = defaultMemoryConfig) {
    this.config = config;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Start garbage collection monitoring
    this.gcTimer = setInterval(() => {
      this.performGarbageCollection();
    }, this.config.gcInterval);

    // Start cleanup monitoring
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);

    logger.info('Memory optimization monitoring started', 'memory-optimizer');
  }

  private performGarbageCollection(): void {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;

    // Record memory usage
    this.recordMemoryUsage(heapUsed);

    // Check memory thresholds
    if (heapUsed > this.config.emergencyThreshold) {
      logger.error('Emergency memory threshold exceeded', 'memory-optimizer', {
        heapUsed: Math.round(heapUsed / 1024 / 1024),
        threshold: 'EMERGENCY'
      });
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
        logger.info('Emergency garbage collection triggered', 'memory-optimizer');
      }
    } else if (heapUsed > this.config.criticalThreshold) {
      logger.warn('Critical memory threshold exceeded', 'memory-optimizer', {
        heapUsed: Math.round(heapUsed / 1024 / 1024),
        threshold: 'CRITICAL'
      });
      
      // Trigger garbage collection
      if (global.gc) {
        global.gc();
        logger.info('Critical garbage collection triggered', 'memory-optimizer');
      }
    } else if (heapUsed > this.config.warningThreshold) {
      logger.warn('Memory usage warning', 'memory-optimizer', {
        heapUsed: Math.round(heapUsed / 1024 / 1024),
        threshold: 'WARNING'
      });
    }
  }

  private performCleanup(): void {
    // Clean up memory history
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
    }

    // Clean up any cached data
    this.cleanupCaches();

    // Log memory statistics
    this.logMemoryStatistics();
  }

  private recordMemoryUsage(heapUsed: number): void {
    this.memoryHistory.push({
      timestamp: Date.now(),
      usage: heapUsed
    });

    // Keep only recent history
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
    }
  }

  private cleanupCaches(): void {
    // Clear any application-level caches
    // This would be implemented based on your caching strategy
    logger.debug('Performing cache cleanup', 'memory-optimizer');
  }

  private logMemoryStatistics(): void {
    const memoryUsage = process.memoryUsage();
    const stats = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024)
    };

    logger.info('Memory statistics', 'memory-optimizer', stats);
  }

  public getMemoryStats(): any {
    const memoryUsage = process.memoryUsage();
    const history = this.memoryHistory.slice(-10); // Last 10 readings

    return {
      current: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024)
      },
      history: history.map(h => ({
        timestamp: new Date(h.timestamp).toISOString(),
        usage: Math.round(h.usage / 1024 / 1024)
      })),
      thresholds: {
        warning: Math.round(this.config.warningThreshold / 1024 / 1024),
        critical: Math.round(this.config.criticalThreshold / 1024 / 1024),
        emergency: Math.round(this.config.emergencyThreshold / 1024 / 1024)
      }
    };
  }

  public stop(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    logger.info('Memory optimization monitoring stopped', 'memory-optimizer');
  }
}

// Create global memory optimizer instance
const memoryOptimizer = new MemoryOptimizer();

// Memory optimization middleware
export const memoryOptimizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startMemory = process.memoryUsage();
  
  // Override res.end to track memory usage per request
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const endMemory = process.memoryUsage();
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external
    };

    // Log high memory usage requests
    if (memoryDelta.heapUsed > 10 * 1024 * 1024) { // 10MB threshold
      logger.warn('High memory usage request', 'memory-optimizer', {
        path: req.path,
        method: req.method,
        memoryDelta: {
          rss: Math.round(memoryDelta.rss / 1024 / 1024),
          heapUsed: Math.round(memoryDelta.heapUsed / 1024 / 1024),
          external: Math.round(memoryDelta.external / 1024 / 1024)
        }
      });
    }

    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

// Memory leak detection middleware
export const memoryLeakDetection = (req: Request, res: Response, next: NextFunction) => {
  const startMemory = process.memoryUsage();
  
  // Set up memory leak detection
  const checkMemoryLeak = () => {
    const currentMemory = process.memoryUsage();
    const memoryGrowth = currentMemory.heapUsed - startMemory.heapUsed;
    
    // Check for potential memory leak (growth > 50MB)
    if (memoryGrowth > 50 * 1024 * 1024) {
      logger.warn('Potential memory leak detected', 'memory-optimizer', {
        path: req.path,
        method: req.method,
        memoryGrowth: Math.round(memoryGrowth / 1024 / 1024),
        currentHeap: Math.round(currentMemory.heapUsed / 1024 / 1024)
      });
    }
  };

  // Check memory after response
  res.on('finish', checkMemoryLeak);
  res.on('close', checkMemoryLeak);

  next();
};

// Memory usage monitoring endpoint
export const getMemoryStats = (req: any, res: any) => {
  try {
    const stats = memoryOptimizer.getMemoryStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting memory stats', 'memory-optimizer', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get memory statistics'
    });
  }
};

// Force garbage collection endpoint
export const forceGarbageCollection = (req: any, res: any) => {
  try {
    if (global.gc) {
      const beforeMemory = process.memoryUsage();
      global.gc();
      const afterMemory = process.memoryUsage();
      
      const freed = beforeMemory.heapUsed - afterMemory.heapUsed;
      
      logger.info('Manual garbage collection performed', 'memory-optimizer', {
        freed: Math.round(freed / 1024 / 1024)
      });
      
      res.json({
        success: true,
        message: 'Garbage collection completed',
        freed: Math.round(freed / 1024 / 1024),
        before: Math.round(beforeMemory.heapUsed / 1024 / 1024),
        after: Math.round(afterMemory.heapUsed / 1024 / 1024)
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Garbage collection not available (run with --expose-gc)'
      });
    }
  } catch (error) {
    logger.error('Error during garbage collection', 'memory-optimizer', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to perform garbage collection'
    });
  }
};

// Export memory optimizer instance
export { memoryOptimizer };

// Graceful shutdown
process.on('SIGTERM', () => {
  memoryOptimizer.stop();
});

process.on('SIGINT', () => {
  memoryOptimizer.stop();
});
