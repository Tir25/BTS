/**
 * Backend Performance Monitor
 * Tracks and analyzes backend performance metrics
 */

import { logger } from './logger';

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  slowRequests: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
}

export interface RequestMetrics {
  method: string;
  path: string;
  responseTime: number;
  statusCode: number;
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private requestMetrics: RequestMetrics[];
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      uptime: 0,
    };
    this.requestMetrics = [];
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record a request
   */
  recordRequest(method: string, path: string, responseTime: number, statusCode: number): void {
    const requestMetric: RequestMetrics = {
      method,
      path,
      responseTime,
      statusCode,
      timestamp: Date.now(),
    };

    this.requestMetrics.push(requestMetric);
    this.metrics.requestCount++;

    // Keep only last 1000 requests
    if (this.requestMetrics.length > 1000) {
      this.requestMetrics.shift();
    }

    // Update metrics
    this.updateMetrics();

    // Log slow requests
    if (responseTime > 1000) { // 1 second
      logger.warn('Slow request detected', 'performance-monitor', {
        method,
        path,
        responseTime,
        statusCode,
      });
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    if (this.requestMetrics.length === 0) return;

    const totalResponseTime = this.requestMetrics.reduce((sum, req) => sum + req.responseTime, 0);
    this.metrics.averageResponseTime = totalResponseTime / this.requestMetrics.length;

    this.metrics.slowRequests = this.requestMetrics.filter(req => req.responseTime > 1000).length;

    const errorCount = this.requestMetrics.filter(req => req.statusCode >= 400).length;
    this.metrics.errorRate = (errorCount / this.requestMetrics.length) * 100;

    this.metrics.uptime = Date.now() - this.startTime;

    // Memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get request metrics for a specific time range
   */
  getRequestMetrics(startTime?: number, endTime?: number): RequestMetrics[] {
    const start = startTime || 0;
    const end = endTime || Date.now();

    return this.requestMetrics.filter(
      req => req.timestamp >= start && req.timestamp <= end
    );
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    metrics: PerformanceMetrics;
    recommendations: string[];
    healthScore: number;
  } {
    this.updateMetrics();
    const recommendations: string[] = [];
    let healthScore = 100;

    // Analyze metrics and provide recommendations
    if (this.metrics.averageResponseTime > 500) {
      recommendations.push('Consider optimizing database queries or adding caching');
      healthScore -= 20;
    }

    if (this.metrics.slowRequests > this.metrics.requestCount * 0.1) {
      recommendations.push('High number of slow requests detected - investigate bottlenecks');
      healthScore -= 15;
    }

    if (this.metrics.errorRate > 5) {
      recommendations.push('High error rate detected - review error handling');
      healthScore -= 25;
    }

    if (this.metrics.memoryUsage > 500) { // 500MB
      recommendations.push('High memory usage - consider memory optimization');
      healthScore -= 10;
    }

    return {
      metrics: this.metrics,
      recommendations,
      healthScore: Math.max(0, healthScore),
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      uptime: 0,
    };
    this.requestMetrics = [];
    this.startTime = Date.now();
  }

  /**
   * Get top slow endpoints
   */
  getTopSlowEndpoints(limit: number = 10): Array<{
    method: string;
    path: string;
    averageResponseTime: number;
    requestCount: number;
  }> {
    const endpointMetrics = new Map<string, { totalTime: number; count: number }>();

    this.requestMetrics.forEach(req => {
      const key = `${req.method} ${req.path}`;
      const existing = endpointMetrics.get(key);
      
      if (existing) {
        existing.totalTime += req.responseTime;
        existing.count++;
      } else {
        endpointMetrics.set(key, { totalTime: req.responseTime, count: 1 });
      }
    });

    return Array.from(endpointMetrics.entries())
      .map(([key, metrics]) => {
        const [method, path] = key.split(' ', 2);
        return {
          method,
          path,
          averageResponseTime: metrics.totalTime / metrics.count,
          requestCount: metrics.count,
        };
      })
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, limit);
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Middleware for Express
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    performanceMonitor.recordRequest(
      req.method,
      req.path,
      responseTime,
      res.statusCode
    );
  });

  next();
};
