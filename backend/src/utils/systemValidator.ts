/**
 * System Validator Service
 * Validates system health and prevents issues through comprehensive checks
 */

import { logger } from '../utils/logger';
import { redisCache } from '../services/RedisCacheService';
import { webSocketHealth } from '../services/WebSocketHealthService';
import { connectionPoolMonitor } from '../services/ConnectionPoolMonitor';
import { monitoringService } from '../services/MonitoringService';

export interface ValidationResult {
  component: string;
  status: 'healthy' | 'degraded' | 'critical';
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
  lastChecked: Date;
}

export interface SystemValidation {
  overall: 'healthy' | 'degraded' | 'critical';
  score: number;
  components: ValidationResult[];
  criticalIssues: number;
  warnings: number;
  timestamp: Date;
}

export class SystemValidator {
  private validationInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Start system validation
   */
  startValidation(intervalMs: number = 60000): void {
    if (this.isRunning) {
      logger.warn('System validator already running', 'system-validator');
      return;
    }

    this.isRunning = true;
    logger.info('Starting system validation', 'system-validator');

    this.validationInterval = setInterval(async () => {
      await this.validateSystem();
    }, intervalMs);
  }

  /**
   * Stop system validation
   */
  stopValidation(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }
    this.isRunning = false;
    logger.info('System validation stopped', 'system-validator');
  }

  /**
   * Validate entire system
   */
  async validateSystem(): Promise<SystemValidation> {
    const components: ValidationResult[] = [];
    
    try {
      // Validate Redis
      const redisValidation = await this.validateRedis();
      components.push(redisValidation);

      // Validate Database
      const dbValidation = await this.validateDatabase();
      components.push(dbValidation);

      // Validate WebSocket
      const wsValidation = await this.validateWebSocket();
      components.push(wsValidation);

      // Validate Memory
      const memoryValidation = await this.validateMemory();
      components.push(memoryValidation);

      // Validate Performance
      const performanceValidation = await this.validatePerformance();
      components.push(performanceValidation);

      // Calculate overall status
      const overall = this.calculateOverallStatus(components);
      const score = this.calculateOverallScore(components);
      const criticalIssues = components.filter(c => c.status === 'critical').length;
      const warnings = components.filter(c => c.status === 'degraded').length;

      const validation: SystemValidation = {
        overall,
        score,
        components,
        criticalIssues,
        warnings,
        timestamp: new Date()
      };

      // Log validation results
      if (criticalIssues > 0) {
        logger.error('System validation found critical issues', 'system-validator', {
          criticalIssues,
          warnings,
          score
        });
      } else if (warnings > 0) {
        logger.warn('System validation found warnings', 'system-validator', {
          warnings,
          score
        });
      } else {
        logger.info('System validation passed', 'system-validator', { score });
      }

      return validation;
    } catch (error) {
      logger.error('Error in system validation', 'system-validator', { error: String(error) });
      throw error;
    }
  }

  /**
   * Validate Redis cache
   */
  private async validateRedis(): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      const health = await redisCache.getHealth();
      
      if (!health.connected) {
        issues.push('Redis not connected');
        score -= 50;
      }

      if (health.latency > 100) {
        issues.push(`High Redis latency: ${health.latency}ms`);
        score -= 20;
        recommendations.push('Check Redis server performance');
      }

      if (health.stats && health.stats.hitRate < 80) {
        issues.push(`Low cache hit rate: ${health.stats.hitRate}%`);
        score -= 15;
        recommendations.push('Review cache TTL settings');
      }

      if (health.stats && health.stats.errors > 10) {
        issues.push(`High Redis error count: ${health.stats.errors}`);
        score -= 25;
        recommendations.push('Check Redis server logs');
      }

      const status = score >= 80 ? 'healthy' : score >= 60 ? 'degraded' : 'critical';

      return {
        component: 'Redis Cache',
        status,
        score,
        issues,
        recommendations,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        component: 'Redis Cache',
        status: 'critical',
        score: 0,
        issues: ['Redis validation failed', String(error)],
        recommendations: ['Check Redis connection and configuration'],
        lastChecked: new Date()
      };
    }
  }

  /**
   * Validate Database
   */
  private async validateDatabase(): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      const metrics = connectionPoolMonitor.getMetrics();
      const health = connectionPoolMonitor.getHealth();

      if (!health.healthy) {
        issues.push('Database pool unhealthy');
        score -= 40;
      }

      if (metrics.utilization > 90) {
        issues.push(`High pool utilization: ${metrics.utilization}%`);
        score -= 30;
        recommendations.push('Increase database pool size');
      }

      if (metrics.averageWaitTime > 1000) {
        issues.push(`High connection wait time: ${metrics.averageWaitTime}ms`);
        score -= 20;
        recommendations.push('Optimize database queries');
      }

      if (metrics.connectionErrors > 5) {
        issues.push(`High connection errors: ${metrics.connectionErrors}`);
        score -= 25;
        recommendations.push('Check database connectivity');
      }

      const status = score >= 80 ? 'healthy' : score >= 60 ? 'degraded' : 'critical';

      return {
        component: 'Database',
        status,
        score,
        issues,
        recommendations,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        component: 'Database',
        status: 'critical',
        score: 0,
        issues: ['Database validation failed', String(error)],
        recommendations: ['Check database connection and configuration'],
        lastChecked: new Date()
      };
    }
  }

  /**
   * Validate WebSocket
   */
  private async validateWebSocket(): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      const health = webSocketHealth.getHealth();

      if (!health.connected) {
        issues.push('WebSocket not connected');
        score -= 50;
      }

      if (health.errorRate > 10) {
        issues.push(`High WebSocket error rate: ${health.errorRate}%`);
        score -= 30;
        recommendations.push('Check WebSocket connection stability');
      }

      if (health.activeConnections === 0 && health.uptime > 300) {
        issues.push('No active WebSocket connections for extended period');
        score -= 20;
        recommendations.push('Check WebSocket client connectivity');
      }

      const status = score >= 80 ? 'healthy' : score >= 60 ? 'degraded' : 'critical';

      return {
        component: 'WebSocket',
        status,
        score,
        issues,
        recommendations,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        component: 'WebSocket',
        status: 'critical',
        score: 0,
        issues: ['WebSocket validation failed', String(error)],
        recommendations: ['Check WebSocket server configuration'],
        lastChecked: new Date()
      };
    }
  }

  /**
   * Validate Memory
   */
  private async validateMemory(): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const utilization = (heapUsedMB / heapTotalMB) * 100;

      if (heapUsedMB > 500) {
        issues.push(`High memory usage: ${heapUsedMB}MB`);
        score -= 40;
        recommendations.push('Consider increasing memory or optimizing memory usage');
      }

      if (utilization > 90) {
        issues.push(`High memory utilization: ${utilization.toFixed(1)}%`);
        score -= 30;
        recommendations.push('Trigger garbage collection or restart service');
      }

      if (memoryUsage.external > 100 * 1024 * 1024) { // 100MB
        issues.push(`High external memory: ${Math.round(memoryUsage.external / 1024 / 1024)}MB`);
        score -= 20;
        recommendations.push('Check for memory leaks in external dependencies');
      }

      const status = score >= 80 ? 'healthy' : score >= 60 ? 'degraded' : 'critical';

      return {
        component: 'Memory',
        status,
        score,
        issues,
        recommendations,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        component: 'Memory',
        status: 'critical',
        score: 0,
        issues: ['Memory validation failed', String(error)],
        recommendations: ['Check system memory configuration'],
        lastChecked: new Date()
      };
    }
  }

  /**
   * Validate Performance
   */
  private async validatePerformance(): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      const metrics = monitoringService.getMetrics();
      if (!metrics) {
        return {
          component: 'Performance',
          status: 'degraded',
          score: 50,
          issues: ['Performance metrics not available'],
          recommendations: ['Check monitoring service'],
          lastChecked: new Date()
        };
      }

      if (metrics.performance.responseTime > 2000) {
        issues.push(`High response time: ${metrics.performance.responseTime}ms`);
        score -= 30;
        recommendations.push('Optimize database queries and caching');
      }

      if (metrics.performance.errorRate > 5) {
        issues.push(`High error rate: ${metrics.performance.errorRate}%`);
        score -= 25;
        recommendations.push('Check error logs and fix issues');
      }

      if (metrics.performance.throughput < 10) {
        issues.push(`Low throughput: ${metrics.performance.throughput} requests/second`);
        score -= 20;
        recommendations.push('Check for performance bottlenecks');
      }

      if (metrics.eventLoop.lag > 100) {
        issues.push(`High event loop lag: ${metrics.eventLoop.lag}ms`);
        score -= 15;
        recommendations.push('Optimize synchronous operations');
      }

      const status = score >= 80 ? 'healthy' : score >= 60 ? 'degraded' : 'critical';

      return {
        component: 'Performance',
        status,
        score,
        issues,
        recommendations,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        component: 'Performance',
        status: 'critical',
        score: 0,
        issues: ['Performance validation failed', String(error)],
        recommendations: ['Check monitoring service configuration'],
        lastChecked: new Date()
      };
    }
  }

  /**
   * Calculate overall system status
   */
  private calculateOverallStatus(components: ValidationResult[]): 'healthy' | 'degraded' | 'critical' {
    const criticalCount = components.filter(c => c.status === 'critical').length;
    const degradedCount = components.filter(c => c.status === 'degraded').length;

    if (criticalCount > 0) return 'critical';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  /**
   * Calculate overall system score
   */
  private calculateOverallScore(components: ValidationResult[]): number {
    if (components.length === 0) return 0;
    
    const totalScore = components.reduce((sum, component) => sum + component.score, 0);
    return Math.round(totalScore / components.length);
  }

  /**
   * Get validation status
   */
  getStatus(): { running: boolean; lastValidation?: Date } {
    return {
      running: this.isRunning,
      lastValidation: this.isRunning ? new Date() : undefined
    };
  }
}

// Export singleton instance
export const systemValidator = new SystemValidator();
