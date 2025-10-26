/**
 * Comprehensive Monitoring and Alerting Service
 * Production-grade monitoring with real-time metrics, alerting, and dashboards
 */

import { logger } from '../utils/logger';
import { redisCache } from './RedisCacheService';
import { webSocketHealth } from './WebSocketHealthService';
import { connectionPoolMonitor } from './ConnectionPoolMonitor';

export interface SystemMetrics {
  timestamp: Date;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  cpu: {
    user: number;
    system: number;
    usage: number;
  };
  eventLoop: {
    lag: number;
    utilization: number;
  };
  database: {
    poolMetrics: any;
    health: any;
  };
  redis: {
    health: any;
    stats: any;
  };
  websocket: {
    health: any;
    stats: any;
  };
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'memory' | 'cpu' | 'database' | 'redis' | 'websocket' | 'performance';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  category: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  cooldown: number; // seconds
}

export interface MonitoringConfig {
  collectionInterval: number;
  retentionPeriod: number;
  alertCooldown: number;
  maxAlerts: number;
  enableAlerts: boolean;
  enableMetrics: boolean;
}

export class MonitoringService {
  private metrics: SystemMetrics[] = [];
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private config: MonitoringConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();
  private requestCount: number = 0;
  private errorCount: number = 0;
  private totalResponseTime: number = 0;

  constructor() {
    this.config = {
      collectionInterval: 30000, // 30 seconds
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      alertCooldown: 300, // 5 minutes
      maxAlerts: 1000,
      enableAlerts: true,
      enableMetrics: true
    };

    this.initializeAlertRules();
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.monitoringInterval) {
      logger.warn('Monitoring already started', 'monitoring');
      return;
    }

    logger.info('Starting comprehensive monitoring service', 'monitoring');
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
      this.cleanupOldData();
    }, this.config.collectionInterval);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Monitoring service stopped', 'monitoring');
    }
  }

  /**
   * Get current system metrics
   */
  getMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit: number = 100): SystemMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit: number = 100): Alert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: AlertRule = { ...rule, id };
    this.alertRules.push(newRule);
    
    logger.info('Alert rule added', 'monitoring', { rule: newRule });
    return id;
  }

  /**
   * Update alert rule
   */
  updateAlertRule(id: string, updates: Partial<AlertRule>): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === id);
    if (index === -1) return false;
    
    this.alertRules[index] = { ...this.alertRules[index], ...updates };
    logger.info('Alert rule updated', 'monitoring', { id, updates });
    return true;
  }

  /**
   * Delete alert rule
   */
  deleteAlertRule(id: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === id);
    if (index === -1) return false;
    
    this.alertRules.splice(index, 1);
    logger.info('Alert rule deleted', 'monitoring', { id });
    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(id: string): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (!alert || alert.resolved) return false;
    
    alert.resolved = true;
    alert.resolvedAt = new Date();
    
    logger.info('Alert resolved', 'monitoring', { id, alert: alert.title });
    return true;
  }

  /**
   * Record request metrics
   */
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    this.totalResponseTime += responseTime;
    if (isError) this.errorCount++;
  }

  /**
   * Get system health summary
   */
  async getSystemHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'critical';
    services: Record<string, 'healthy' | 'degraded' | 'critical'>;
    alerts: number;
    uptime: number;
    performance: {
      responseTime: number;
      throughput: number;
      errorRate: number;
    };
  }> {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.type === 'critical');
    const warningAlerts = activeAlerts.filter(a => a.type === 'warning');
    
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) overall = 'critical';
    else if (warningAlerts.length > 0) overall = 'degraded';
    
    const services: Record<string, 'healthy' | 'degraded' | 'critical'> = {};
    
    // Check database health
    const dbHealth = connectionPoolMonitor.getHealth();
    services.database = dbHealth.healthy ? 'healthy' : 'degraded';
    
    // Check Redis health
    const redisHealth = await redisCache.getHealth();
    services.redis = redisHealth.connected ? 'healthy' : 'degraded';
    
    // Check WebSocket health
    const wsHealth = webSocketHealth.getHealth();
    services.websocket = wsHealth.connected ? 'healthy' : 'degraded';
    
    const avgResponseTime = this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    const throughput = this.requestCount / ((Date.now() - this.startTime) / 1000);
    
    return {
      overall,
      services,
      alerts: activeAlerts.length,
      uptime: Date.now() - this.startTime,
      performance: {
        responseTime: Math.round(avgResponseTime),
        throughput: Math.round(throughput),
        errorRate: Math.round(errorRate * 100) / 100
      }
    };
  }

  /**
   * Collect system metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const eventLoopLag = this.measureEventLoopLag();
      
      // Get service health data
      const [dbHealth, redisHealth, wsHealth] = await Promise.allSettled([
        connectionPoolMonitor.getMetrics(),
        redisCache.getHealth(),
        webSocketHealth.getHealth()
      ]);
      
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        uptime: Date.now() - this.startTime,
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          usage: this.calculateCpuUsage(cpuUsage)
        },
        eventLoop: {
          lag: eventLoopLag,
          utilization: this.calculateEventLoopUtilization()
        },
        database: {
          poolMetrics: dbHealth.status === 'fulfilled' ? dbHealth.value : null,
          health: dbHealth.status === 'fulfilled' ? connectionPoolMonitor.getHealth() : null
        },
        redis: {
          health: redisHealth.status === 'fulfilled' ? redisHealth.value : null,
          stats: redisHealth.status === 'fulfilled' ? redisHealth.value.stats : null
        },
        websocket: {
          health: wsHealth.status === 'fulfilled' ? wsHealth.value : null,
          stats: wsHealth.status === 'fulfilled' ? webSocketHealth.getStats() : null
        },
        performance: {
          responseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
          throughput: this.requestCount / ((Date.now() - this.startTime) / 1000),
          errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0
        }
      };
      
      this.metrics.push(metrics);
      
      // Keep only recent metrics
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-500);
      }
      
    } catch (error) {
      logger.error('Failed to collect metrics', 'monitoring', { error: String(error) });
    }
  }

  /**
   * Check for alerts based on current metrics
   */
  private checkAlerts(): void {
    if (!this.config.enableAlerts) return;
    
    const currentMetrics = this.getMetrics();
    if (!currentMetrics) return;
    
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;
      
      const value = this.getMetricValue(currentMetrics, rule.metric);
      if (value === null) continue;
      
      const shouldAlert = this.evaluateRule(value, rule.operator, rule.threshold);
      if (!shouldAlert) continue;
      
      // Check cooldown
      const lastAlert = this.alerts.find(a => 
        a.metric === rule.metric && 
        a.type === rule.severity &&
        !a.resolved &&
        (Date.now() - a.timestamp.getTime()) < rule.cooldown * 1000
      );
      
      if (lastAlert) continue;
      
      this.createAlert(rule, value);
    }
  }

  /**
   * Create new alert
   */
  private createAlert(rule: AlertRule, value: number): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: rule.severity,
      category: rule.category as any,
      title: rule.name,
      message: `${rule.metric} is ${rule.operator} ${rule.threshold} (current: ${value})`,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      timestamp: new Date(),
      resolved: false
    };
    
    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > this.config.maxAlerts) {
      this.alerts = this.alerts.slice(-this.config.maxAlerts);
    }
    
    logger.warn(`Alert triggered: ${alert.title}`, 'monitoring', {
      type: alert.type,
      category: alert.category,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold
    });
  }

  /**
   * Get metric value from system metrics
   */
  private getMetricValue(metrics: SystemMetrics, metric: string): number | null {
    const parts = metric.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return typeof value === 'number' ? value : null;
  }

  /**
   * Evaluate alert rule
   */
  private evaluateRule(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  /**
   * Measure event loop lag
   */
  private measureEventLoopLag(): number {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
      return lag;
    });
    return 0; // Placeholder - would need async implementation
  }

  /**
   * Calculate CPU usage
   */
  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // This is a simplified calculation
    // In production, you'd want more sophisticated CPU monitoring
    return (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
  }

  /**
   * Calculate event loop utilization
   */
  private calculateEventLoopUtilization(): number {
    // Simplified calculation - in production, use more sophisticated monitoring
    return 0;
  }

  /**
   * Cleanup old data
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    
    // Cleanup old metrics
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff);
    
    // Cleanup old alerts
    this.alerts = this.alerts.filter(a => a.timestamp.getTime() > cutoff);
  }

  /**
   * Initialize default alert rules
   */
  private initializeAlertRules(): void {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High Memory Usage',
        category: 'memory',
        metric: 'memory.heapUsed',
        operator: 'gt',
        threshold: 400 * 1024 * 1024, // 400MB
        severity: 'warning',
        enabled: true,
        cooldown: 300
      },
      {
        name: 'Critical Memory Usage',
        category: 'memory',
        metric: 'memory.heapUsed',
        operator: 'gt',
        threshold: 500 * 1024 * 1024, // 500MB
        severity: 'critical',
        enabled: true,
        cooldown: 60
      },
      {
        name: 'High Database Pool Utilization',
        category: 'database',
        metric: 'database.poolMetrics.utilization',
        operator: 'gt',
        threshold: 80,
        severity: 'warning',
        enabled: true,
        cooldown: 300
      },
      {
        name: 'Critical Database Pool Utilization',
        category: 'database',
        metric: 'database.poolMetrics.utilization',
        operator: 'gt',
        threshold: 95,
        severity: 'critical',
        enabled: true,
        cooldown: 60
      },
      {
        name: 'High Error Rate',
        category: 'performance',
        metric: 'performance.errorRate',
        operator: 'gt',
        threshold: 5, // 5%
        severity: 'warning',
        enabled: true,
        cooldown: 300
      },
      {
        name: 'Critical Error Rate',
        category: 'performance',
        metric: 'performance.errorRate',
        operator: 'gt',
        threshold: 15, // 15%
        severity: 'critical',
        enabled: true,
        cooldown: 60
      }
    ];

    defaultRules.forEach(rule => this.addAlertRule(rule));
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
