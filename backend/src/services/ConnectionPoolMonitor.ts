/**
 * Connection Pool Monitor Service
 * Advanced monitoring and optimization for database connection pools
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { pool } from '../config/database';

export interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
  utilization: number;
  averageWaitTime: number;
  connectionErrors: number;
  connectionTimeouts: number;
  lastActivity: Date;
  healthScore: number;
}

export interface PoolOptimization {
  recommendedMaxConnections: number;
  recommendedIdleTimeout: number;
  recommendedConnectionTimeout: number;
  performanceScore: number;
  bottlenecks: string[];
  recommendations: string[];
}

export interface PoolAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

export class ConnectionPoolMonitor {
  private pool: Pool;
  private metrics: PoolMetrics;
  private alerts: PoolAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();
  private connectionErrors: number = 0;
  private connectionTimeouts: number = 0;
  private totalWaitTime: number = 0;
  private waitCount: number = 0;

  // Thresholds for alerts
  private readonly THRESHOLDS = {
    UTILIZATION_WARNING: 80,
    UTILIZATION_CRITICAL: 95,
    WAIT_TIME_WARNING: 1000, // 1 second
    WAIT_TIME_CRITICAL: 5000, // 5 seconds
    ERROR_RATE_WARNING: 5, // 5%
    ERROR_RATE_CRITICAL: 15, // 15%
    IDLE_CONNECTIONS_WARNING: 10,
    IDLE_CONNECTIONS_CRITICAL: 20
  };

  constructor(pool: Pool) {
    this.pool = pool;
    this.metrics = this.initializeMetrics();
    this.setupEventListeners();
  }

  /**
   * Start monitoring the connection pool
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      logger.warn('Connection pool monitoring already started', 'pool-monitor');
      return;
    }

    logger.info('Starting connection pool monitoring', 'pool-monitor', { intervalMs });
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
      this.optimizePool();
    }, intervalMs);
  }

  /**
   * Stop monitoring the connection pool
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Connection pool monitoring stopped', 'pool-monitor');
    }
  }

  /**
   * Get current pool metrics
   */
  getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Get pool optimization recommendations
   */
  getOptimization(): PoolOptimization {
    const utilization = this.metrics.utilization;
    const avgWaitTime = this.metrics.averageWaitTime;
    const errorRate = this.calculateErrorRate();
    
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze bottlenecks
    if (utilization > 90) {
      bottlenecks.push('High connection utilization');
      recommendations.push('Consider increasing max connections');
    }
    
    if (avgWaitTime > 2000) {
      bottlenecks.push('High connection wait time');
      recommendations.push('Optimize connection timeout settings');
    }
    
    if (errorRate > 10) {
      bottlenecks.push('High connection error rate');
      recommendations.push('Check database connectivity and configuration');
    }
    
    if (this.metrics.idleConnections > 15) {
      bottlenecks.push('Too many idle connections');
      recommendations.push('Reduce idle timeout or max connections');
    }

    // Calculate performance score (0-100)
    const performanceScore = Math.max(0, 100 - 
      (utilization * 0.3) - 
      (Math.min(avgWaitTime / 100, 30)) - 
      (errorRate * 2)
    );

    return {
      recommendedMaxConnections: this.calculateOptimalMaxConnections(),
      recommendedIdleTimeout: this.calculateOptimalIdleTimeout(),
      recommendedConnectionTimeout: this.calculateOptimalConnectionTimeout(),
      performanceScore: Math.round(performanceScore),
      bottlenecks,
      recommendations
    };
  }

  /**
   * Get active alerts
   */
  getAlerts(): PoolAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get pool health status
   */
  getHealth(): { healthy: boolean; score: number; issues: string[] } {
    const optimization = this.getOptimization();
    const issues: string[] = [];
    
    if (optimization.performanceScore < 70) {
      issues.push('Poor performance score');
    }
    
    if (this.metrics.utilization > this.THRESHOLDS.UTILIZATION_CRITICAL) {
      issues.push('Critical connection utilization');
    }
    
    if (this.metrics.averageWaitTime > this.THRESHOLDS.WAIT_TIME_CRITICAL) {
      issues.push('Critical connection wait time');
    }
    
    if (this.calculateErrorRate() > this.THRESHOLDS.ERROR_RATE_CRITICAL) {
      issues.push('Critical error rate');
    }

    return {
      healthy: issues.length === 0,
      score: optimization.performanceScore,
      issues
    };
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): PoolMetrics {
    return {
      totalConnections: 0,
      idleConnections: 0,
      activeConnections: 0,
      waitingClients: 0,
      utilization: 0,
      averageWaitTime: 0,
      connectionErrors: 0,
      connectionTimeouts: 0,
      lastActivity: new Date(),
      healthScore: 100
    };
  }

  /**
   * Setup event listeners for the pool
   */
  private setupEventListeners(): void {
    this.pool.on('error', (err: Error) => {
      this.connectionErrors++;
      logger.error('Pool connection error', 'pool-monitor', { error: err.message });
    });

    this.pool.on('connect', (client) => {
      this.metrics.lastActivity = new Date();
      logger.debug('New connection established', 'pool-monitor');
    });

    this.pool.on('acquire', (client) => {
      const startTime = Date.now();
      this.metrics.lastActivity = new Date();
      
      // Track wait time
      const waitTime = Date.now() - startTime;
      this.totalWaitTime += waitTime;
      this.waitCount++;
      
      logger.debug('Connection acquired from pool', 'pool-monitor', { waitTime });
    });

    this.pool.on('remove', (client) => {
      this.metrics.lastActivity = new Date();
      logger.debug('Connection removed from pool', 'pool-monitor');
    });
  }

  /**
   * Collect current pool metrics
   */
  private collectMetrics(): void {
    this.metrics.totalConnections = this.pool.totalCount;
    this.metrics.idleConnections = this.pool.idleCount;
    this.metrics.activeConnections = this.pool.totalCount - this.pool.idleCount;
    this.metrics.waitingClients = this.pool.waitingCount;
    this.metrics.utilization = this.pool.totalCount > 0 ? 
      Math.round((this.metrics.activeConnections / this.pool.totalCount) * 100) : 0;
    this.metrics.averageWaitTime = this.waitCount > 0 ? 
      Math.round(this.totalWaitTime / this.waitCount) : 0;
    this.metrics.connectionErrors = this.connectionErrors;
    this.metrics.connectionTimeouts = this.connectionTimeouts;
    
    // Calculate health score
    this.metrics.healthScore = this.calculateHealthScore();
  }

  /**
   * Check for alerts based on current metrics
   */
  private checkAlerts(): void {
    // Utilization alerts
    if (this.metrics.utilization >= this.THRESHOLDS.UTILIZATION_CRITICAL) {
      this.addAlert('critical', 
        `Critical connection utilization: ${this.metrics.utilization}%`, 
        'utilization', 
        this.metrics.utilization, 
        this.THRESHOLDS.UTILIZATION_CRITICAL
      );
    } else if (this.metrics.utilization >= this.THRESHOLDS.UTILIZATION_WARNING) {
      this.addAlert('warning', 
        `High connection utilization: ${this.metrics.utilization}%`, 
        'utilization', 
        this.metrics.utilization, 
        this.THRESHOLDS.UTILIZATION_WARNING
      );
    }

    // Wait time alerts
    if (this.metrics.averageWaitTime >= this.THRESHOLDS.WAIT_TIME_CRITICAL) {
      this.addAlert('critical', 
        `Critical connection wait time: ${this.metrics.averageWaitTime}ms`, 
        'waitTime', 
        this.metrics.averageWaitTime, 
        this.THRESHOLDS.WAIT_TIME_CRITICAL
      );
    } else if (this.metrics.averageWaitTime >= this.THRESHOLDS.WAIT_TIME_WARNING) {
      this.addAlert('warning', 
        `High connection wait time: ${this.metrics.averageWaitTime}ms`, 
        'waitTime', 
        this.metrics.averageWaitTime, 
        this.THRESHOLDS.WAIT_TIME_WARNING
      );
    }

    // Error rate alerts
    const errorRate = this.calculateErrorRate();
    if (errorRate >= this.THRESHOLDS.ERROR_RATE_CRITICAL) {
      this.addAlert('critical', 
        `Critical error rate: ${errorRate}%`, 
        'errorRate', 
        errorRate, 
        this.THRESHOLDS.ERROR_RATE_CRITICAL
      );
    } else if (errorRate >= this.THRESHOLDS.ERROR_RATE_WARNING) {
      this.addAlert('warning', 
        `High error rate: ${errorRate}%`, 
        'errorRate', 
        errorRate, 
        this.THRESHOLDS.ERROR_RATE_WARNING
      );
    }

    // Idle connections alerts
    if (this.metrics.idleConnections >= this.THRESHOLDS.IDLE_CONNECTIONS_CRITICAL) {
      this.addAlert('critical', 
        `Too many idle connections: ${this.metrics.idleConnections}`, 
        'idleConnections', 
        this.metrics.idleConnections, 
        this.THRESHOLDS.IDLE_CONNECTIONS_CRITICAL
      );
    } else if (this.metrics.idleConnections >= this.THRESHOLDS.IDLE_CONNECTIONS_WARNING) {
      this.addAlert('warning', 
        `High idle connections: ${this.metrics.idleConnections}`, 
        'idleConnections', 
        this.metrics.idleConnections, 
        this.THRESHOLDS.IDLE_CONNECTIONS_WARNING
      );
    }
  }

  /**
   * Add alert to the alerts array
   */
  private addAlert(type: 'warning' | 'critical' | 'info', message: string, metric: string, value: number, threshold: number): void {
    const alert: PoolAlert = {
      type,
      message,
      metric,
      value,
      threshold,
      timestamp: new Date()
    };

    // Avoid duplicate alerts
    const existingAlert = this.alerts.find(a => 
      a.metric === metric && 
      a.type === type && 
      (Date.now() - a.timestamp.getTime()) < 60000 // Within last minute
    );

    if (!existingAlert) {
      this.alerts.push(alert);
      logger.warn(`Pool ${type}: ${message}`, 'pool-monitor', { metric, value, threshold });
    }
  }

  /**
   * Optimize pool configuration based on metrics
   */
  private optimizePool(): void {
    const optimization = this.getOptimization();
    
    if (optimization.performanceScore < 70) {
      logger.info('Pool optimization recommendations', 'pool-monitor', {
        performanceScore: optimization.performanceScore,
        bottlenecks: optimization.bottlenecks,
        recommendations: optimization.recommendations
      });
    }
  }

  /**
   * Calculate error rate percentage
   */
  private calculateErrorRate(): number {
    const totalConnections = this.pool.totalCount;
    if (totalConnections === 0) return 0;
    
    return Math.round((this.connectionErrors / totalConnections) * 100);
  }

  /**
   * Calculate health score (0-100)
   */
  private calculateHealthScore(): number {
    const utilizationPenalty = Math.min(this.metrics.utilization * 0.5, 30);
    const waitTimePenalty = Math.min(this.metrics.averageWaitTime / 100, 20);
    const errorPenalty = Math.min(this.calculateErrorRate() * 2, 30);
    
    return Math.max(0, 100 - utilizationPenalty - waitTimePenalty - errorPenalty);
  }

  /**
   * Calculate optimal max connections
   */
  private calculateOptimalMaxConnections(): number {
    const currentMax = this.pool.options.max || 20;
    const utilization = this.metrics.utilization;
    
    if (utilization > 90) {
      return Math.min(currentMax * 1.5, 50); // Increase by 50%, max 50
    } else if (utilization < 30) {
      return Math.max(currentMax * 0.8, 10); // Decrease by 20%, min 10
    }
    
    return currentMax;
  }

  /**
   * Calculate optimal idle timeout
   */
  private calculateOptimalIdleTimeout(): number {
    const currentTimeout = this.pool.options.idleTimeoutMillis || 30000;
    const idleConnections = this.metrics.idleConnections;
    
    if (idleConnections > 15) {
      return Math.max(currentTimeout * 0.5, 10000); // Reduce by 50%, min 10s
    } else if (idleConnections < 5) {
      return Math.min(currentTimeout * 1.5, 60000); // Increase by 50%, max 60s
    }
    
    return currentTimeout;
  }

  /**
   * Calculate optimal connection timeout
   */
  private calculateOptimalConnectionTimeout(): number {
    const currentTimeout = this.pool.options.connectionTimeoutMillis || 10000;
    const avgWaitTime = this.metrics.averageWaitTime;
    
    if (avgWaitTime > 5000) {
      return Math.min(currentTimeout * 2, 30000); // Double, max 30s
    } else if (avgWaitTime < 1000) {
      return Math.max(currentTimeout * 0.5, 5000); // Half, min 5s
    }
    
    return currentTimeout;
  }
}

// Export singleton instance
export const connectionPoolMonitor = new ConnectionPoolMonitor(pool);
