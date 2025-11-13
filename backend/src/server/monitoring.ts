/**
 * Memory Monitoring
 * Handles memory monitoring and cleanup
 */

import { logger } from '../utils/logger';
import { SERVER_CONFIG } from './config/serverConfig';

/**
 * Sets up memory monitoring with automatic cleanup
 */
export function setupMemoryMonitoring(): void {
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const memoryMB = Math.round(heapUsed / 1024 / 1024);
    
    // Proactive memory monitoring with multiple thresholds
    if (heapUsed > SERVER_CONFIG.MEMORY_WARNING_THRESHOLD) {
      logger.warn('Memory usage warning', 'server', { 
        memoryMB, 
        heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        threshold: 'WARNING'
      });
    }
    
    // Trigger garbage collection at critical threshold
    if (heapUsed > SERVER_CONFIG.MEMORY_CRITICAL_THRESHOLD && global.gc) {
      logger.warn('Memory usage critical - triggering garbage collection', 'server', { 
        memoryMB,
        threshold: 'CRITICAL'
      });
      global.gc();
      
      // Check memory after GC
      const postGcMemory = process.memoryUsage();
      const postGcMB = Math.round(postGcMemory.heapUsed / 1024 / 1024);
      logger.info('Garbage collection completed', 'server', { 
        beforeMB: memoryMB,
        afterMB: postGcMB,
        reduction: memoryMB - postGcMB
      });
    }
    
    // Emergency shutdown if memory is still too high
    if (heapUsed > SERVER_CONFIG.MEMORY_EMERGENCY_THRESHOLD) {
      logger.error('Memory usage emergency - considering restart', 'server', { 
        memoryMB,
        threshold: 'EMERGENCY'
      });
      
      // In production, consider graceful restart
      if (process.env.NODE_ENV === 'production') {
        logger.error('Emergency memory threshold exceeded - graceful shutdown initiated', 'server');
        // Trigger graceful shutdown via SIGTERM signal
        process.kill(process.pid, 'SIGTERM');
      }
    }
  }, SERVER_CONFIG.MEMORY_CHECK_INTERVAL);
}

