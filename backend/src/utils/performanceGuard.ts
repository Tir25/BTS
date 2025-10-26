/**
 * Performance Guard Service
 * Prevents performance degradation and implements preventive measures
 */

import { logger } from './logger';
import { monitoringService } from '../services/MonitoringService';
import { redisCache } from '../services/RedisCacheService';

export interface PerformanceThresholds {
  memoryUsage: number; // MB
  responseTime: number; // ms
  errorRate: number; // percentage
  cacheHitRate: number; // percentage
  databaseConnections: number; // count
}

export interface PreventiveAction {
  type: 'cache_clear' | 'gc_trigger' | 'connection_reset' | 'alert_threshold';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoExecute: boolean;
}

export class PerformanceGuard {
  private thresholds: PerformanceThresholds;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastGcTime: number = 0;
  private gcCooldown: number = 60000; // 1 minute

  constructor() {
    this.thresholds = {
      memoryUsage: 400, // 400MB
      responseTime: 2000, // 2 seconds
      errorRate: 5, // 5%
      cacheHitRate: 80, // 80%
      databaseConnections: 40 // 40 connections
    };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Performance guard already monitoring', 'performance-guard');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting performance guard monitoring', 'performance-guard');

    this.monitoringInterval = setInterval(() => {
      this.checkPerformance();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Performance guard monitoring stopped', 'performance-guard');
  }

  /**
   * Check current performance and take preventive actions
   */
  private async checkPerformance(): Promise<void> {
    try {
      const metrics = monitoringService.getMetrics();
      if (!metrics) return;

      const actions: PreventiveAction[] = [];

      // Check memory usage
      const memoryMB = Math.round(metrics.memory.heapUsed / 1024 / 1024);
      if (memoryMB > this.thresholds.memoryUsage) {
        actions.push({
          type: 'gc_trigger',
          description: `High memory usage: ${memoryMB}MB (threshold: ${this.thresholds.memoryUsage}MB)`,
          severity: memoryMB > 500 ? 'critical' : 'high',
          autoExecute: true
        });
      }

      // Check response time
      if (metrics.performance.responseTime > this.thresholds.responseTime) {
        actions.push({
          type: 'cache_clear',
          description: `High response time: ${metrics.performance.responseTime}ms (threshold: ${this.thresholds.responseTime}ms)`,
          severity: 'medium',
          autoExecute: true
        });
      }

      // Check error rate
      if (metrics.performance.errorRate > this.thresholds.errorRate) {
        actions.push({
          type: 'alert_threshold',
          description: `High error rate: ${metrics.performance.errorRate}% (threshold: ${this.thresholds.errorRate}%)`,
          severity: 'high',
          autoExecute: false
        });
      }

      // Check database connections
      if (metrics.database.poolMetrics && 
          metrics.database.poolMetrics.totalCount > this.thresholds.databaseConnections) {
        actions.push({
          type: 'connection_reset',
          description: `High database connections: ${metrics.database.poolMetrics.totalCount} (threshold: ${this.thresholds.databaseConnections})`,
          severity: 'medium',
          autoExecute: false
        });
      }

      // Execute preventive actions
      for (const action of actions) {
        await this.executePreventiveAction(action);
      }

    } catch (error) {
      logger.error('Error in performance guard check', 'performance-guard', { error: String(error) });
    }
  }

  /**
   * Execute preventive action
   */
  private async executePreventiveAction(action: PreventiveAction): Promise<void> {
    try {
      logger.warn(`Performance guard action: ${action.description}`, 'performance-guard', {
        type: action.type,
        severity: action.severity,
        autoExecute: action.autoExecute
      });

      switch (action.type) {
        case 'gc_trigger':
          await this.triggerGarbageCollection();
          break;
        
        case 'cache_clear':
          await this.clearCache();
          break;
        
        case 'connection_reset':
          await this.resetConnections();
          break;
        
        case 'alert_threshold':
          await this.sendAlert(action);
          break;
      }
    } catch (error) {
      logger.error('Error executing preventive action', 'performance-guard', {
        action: action.type,
        error: String(error)
      });
    }
  }

  /**
   * Trigger garbage collection
   */
  private async triggerGarbageCollection(): Promise<void> {
    const now = Date.now();
    if (now - this.lastGcTime < this.gcCooldown) {
      logger.debug('Garbage collection on cooldown', 'performance-guard');
      return;
    }

    if (global.gc) {
      logger.info('Triggering garbage collection', 'performance-guard');
      global.gc();
      this.lastGcTime = now;
      
      // Log memory after GC
      const memoryUsage = process.memoryUsage();
      const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      logger.info('Garbage collection completed', 'performance-guard', { memoryMB });
    } else {
      logger.warn('Garbage collection not available (run with --expose-gc)', 'performance-guard');
    }
  }

  /**
   * Clear cache to free memory
   */
  private async clearCache(): Promise<void> {
    try {
      logger.info('Clearing cache to improve performance', 'performance-guard');
      await redisCache.clear();
      logger.info('Cache cleared successfully', 'performance-guard');
    } catch (error) {
      logger.error('Error clearing cache', 'performance-guard', { error: String(error) });
    }
  }

  /**
   * Reset database connections
   */
  private async resetConnections(): Promise<void> {
    try {
      logger.info('Resetting database connections', 'performance-guard');
      // This would require integration with the database service
      // For now, just log the action
      logger.info('Database connection reset requested', 'performance-guard');
    } catch (error) {
      logger.error('Error resetting connections', 'performance-guard', { error: String(error) });
    }
  }

  /**
   * Send alert for threshold breach
   */
  private async sendAlert(action: PreventiveAction): Promise<void> {
    try {
      logger.error('Performance threshold breached', 'performance-guard', {
        action: action.description,
        severity: action.severity,
        timestamp: new Date().toISOString()
      });
      
      // In a real implementation, this would send alerts to monitoring systems
      // For now, just log the alert
    } catch (error) {
      logger.error('Error sending alert', 'performance-guard', { error: String(error) });
    }
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('Performance thresholds updated', 'performance-guard', { thresholds: this.thresholds });
  }

  /**
   * Get current thresholds
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  /**
   * Get performance guard status
   */
  getStatus(): {
    monitoring: boolean;
    thresholds: PerformanceThresholds;
    lastGcTime: number;
    gcCooldown: number;
  } {
    return {
      monitoring: this.isMonitoring,
      thresholds: this.thresholds,
      lastGcTime: this.lastGcTime,
      gcCooldown: this.gcCooldown
    };
  }
}

// Export singleton instance
export const performanceGuard = new PerformanceGuard();
