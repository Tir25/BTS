import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  metadata?: Record<string, unknown>;
}

export interface SystemMetrics {
  timestamp: number;
  memory: NodeJS.MemoryUsage;
  uptime: number;
  activeConnections: number;
  databaseConnections: {
    total: number;
    idle: number;
    waiting: number;
  };
  websocketConnections: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private maxMetricsHistory = 1000;
  private startTime = Date.now();
  private lastCpuUsage: NodeJS.CpuUsage = process.cpuUsage();

  // Track operation performance
  async trackOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now();
    const startCpu = process.cpuUsage();
    
    try {
      const result = await fn();
      const end = performance.now();
      const endCpu = process.cpuUsage();
      
      this.recordMetric({
        timestamp: Date.now(),
        operation,
        duration: end - start,
        memoryUsage: process.memoryUsage(),
        cpuUsage: {
          user: endCpu.user - startCpu.user,
          system: endCpu.system - startCpu.system,
        },
        metadata: {
          ...metadata,
          success: true,
        },
      });
      
      return result;
    } catch (error) {
      const end = performance.now();
      const endCpu = process.cpuUsage();
      
      this.recordMetric({
        timestamp: Date.now(),
        operation,
        duration: end - start,
        memoryUsage: process.memoryUsage(),
        cpuUsage: {
          user: endCpu.user - startCpu.user,
          system: endCpu.system - startCpu.system,
        },
        metadata: {
          ...metadata,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      
      throw error;
    }
  }

  // Record a performance metric
  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
    
    // Log slow operations
    if (metric.duration > 1000) { // 1 second
      console.warn(`🐌 Slow operation detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`);
    }
  }

  // Record system metrics
  recordSystemMetrics(data: {
    activeConnections: number;
    databaseConnections: { total: number; idle: number; waiting: number };
    websocketConnections: number;
  }): void {
    const systemMetric: SystemMetrics = {
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      uptime: Date.now() - this.startTime,
      activeConnections: data.activeConnections,
      databaseConnections: data.databaseConnections,
      websocketConnections: data.websocketConnections,
    };
    
    this.systemMetrics.push(systemMetric);
    
    // Keep only recent system metrics
    if (this.systemMetrics.length > 100) {
      this.systemMetrics = this.systemMetrics.slice(-100);
    }
  }

  // Get performance statistics
  getPerformanceStats(): {
    totalOperations: number;
    averageResponseTime: number;
    slowOperations: PerformanceMetrics[];
    errorRate: number;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  } {
    const recentMetrics = this.metrics.slice(-100); // Last 100 operations
    const totalOperations = recentMetrics.length;
    
    if (totalOperations === 0) {
      return {
        totalOperations: 0,
        averageResponseTime: 0,
        slowOperations: [],
        errorRate: 0,
        memoryUsage: process.memoryUsage(),
        uptime: Date.now() - this.startTime,
      };
    }
    
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;
    const slowOperations = recentMetrics.filter(m => m.duration > 500); // > 500ms
    const errorRate = recentMetrics.filter(m => !m.metadata?.success).length / totalOperations;
    
    return {
      totalOperations,
      averageResponseTime,
      slowOperations,
      errorRate,
      memoryUsage: process.memoryUsage(),
      uptime: Date.now() - this.startTime,
    };
  }

  // Get system health
  getSystemHealth(): {
    healthy: boolean;
    issues: string[];
    metrics: SystemMetrics | null;
  } {
    const latestSystemMetric = this.systemMetrics[this.systemMetrics.length - 1];
    const issues: string[] = [];
    
    if (!latestSystemMetric) {
      return { healthy: true, issues: [], metrics: null };
    }
    
    // Check memory usage
    const memoryUsagePercent = (latestSystemMetric.memory.heapUsed / latestSystemMetric.memory.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      issues.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
    }
    
    // Check database connections
    if (latestSystemMetric.databaseConnections.waiting > 5) {
      issues.push(`High database connection wait: ${latestSystemMetric.databaseConnections.waiting}`);
    }
    
    // Check uptime
    if (latestSystemMetric.uptime > 7 * 24 * 60 * 60 * 1000) { // 7 days
      issues.push('Server uptime exceeds 7 days - consider restart');
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      metrics: latestSystemMetric,
    };
  }

  // Get recent metrics for analysis
  getRecentMetrics(limit = 50): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  // Get system metrics history
  getSystemMetricsHistory(limit = 20): SystemMetrics[] {
    return this.systemMetrics.slice(-limit);
  }

  // Clear old metrics
  clearOldMetrics(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > oneHourAgo);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-cleanup old metrics every hour
setInterval(() => {
  performanceMonitor.clearOldMetrics();
}, 60 * 60 * 1000);

