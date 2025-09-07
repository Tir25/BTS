// Connection Pool Optimization Service

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';

export interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
}

export interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  activeConnections: number;
  averageWaitTime: number;
  averageQueryTime: number;
  connectionUtilization: number;
  errorRate: number;
}

export interface QueryStats {
  query: string;
  count: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  errorCount: number;
}

class ConnectionPoolOptimizer {
  private pool: Pool;
  private metrics: PoolMetrics;
  private queryStats: Map<string, QueryStats> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor(poolInstance: Pool = pool) {
    this.pool = poolInstance;
    this.metrics = {
      totalConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      activeConnections: 0,
      averageWaitTime: 0,
      averageQueryTime: 0,
      connectionUtilization: 0,
      errorRate: 0,
    };
  }

  // Start monitoring pool performance
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.optimizePool();
    }, intervalMs);

    console.log('📊 Connection pool monitoring started');
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('📊 Connection pool monitoring stopped');
  }

  // Update pool metrics
  private updateMetrics(): void {
    this.metrics = {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      averageWaitTime: this.calculateAverageWaitTime(),
      averageQueryTime: this.calculateAverageQueryTime(),
      connectionUtilization: this.calculateConnectionUtilization(),
      errorRate: this.calculateErrorRate(),
    };
  }

  // Calculate average wait time
  private calculateAverageWaitTime(): number {
    // This would need to be implemented with actual timing data
    // For now, return a placeholder
    return 0;
  }

  // Calculate average query time
  private calculateAverageQueryTime(): number {
    const stats = Array.from(this.queryStats.values());
    if (stats.length === 0) return 0;

    const totalTime = stats.reduce((sum, stat) => sum + stat.totalTime, 0);
    const totalCount = stats.reduce((sum, stat) => sum + stat.count, 0);
    
    return totalCount > 0 ? totalTime / totalCount : 0;
  }

  // Calculate connection utilization
  private calculateConnectionUtilization(): number {
    if (this.pool.totalCount === 0) return 0;
    return (this.pool.totalCount - this.pool.idleCount) / this.pool.totalCount;
  }

  // Calculate error rate
  private calculateErrorRate(): number {
    const stats = Array.from(this.queryStats.values());
    if (stats.length === 0) return 0;

    const totalErrors = stats.reduce((sum, stat) => sum + stat.errorCount, 0);
    const totalQueries = stats.reduce((sum, stat) => sum + stat.count, 0);
    
    return totalQueries > 0 ? totalErrors / totalQueries : 0;
  }

  // Optimize pool configuration
  private optimizePool(): void {
    const config = this.pool.options;
    const utilization = this.metrics.connectionUtilization;
    const waitTime = this.metrics.averageWaitTime;
    const errorRate = this.metrics.errorRate;

    // Adjust pool size based on utilization
    if (utilization > 0.8 && waitTime > 1000) {
      // High utilization and long wait times - increase pool size
      this.suggestPoolSizeIncrease();
    } else if (utilization < 0.3 && this.pool.totalCount > 5) {
      // Low utilization - could decrease pool size
      this.suggestPoolSizeDecrease();
    }

    // Adjust timeouts based on performance
    if (errorRate > 0.05) {
      // High error rate - increase timeouts
      this.suggestTimeoutIncrease();
    }

    // Log optimization suggestions
    this.logOptimizationSuggestions();
  }

  // Suggest pool size increase
  private suggestPoolSizeIncrease(): void {
    const currentMax = this.pool.options.max || 20;
    const suggestedMax = Math.min(currentMax + 5, 50); // Cap at 50
    
    console.log(`💡 Pool optimization: Consider increasing max connections from ${currentMax} to ${suggestedMax}`);
  }

  // Suggest pool size decrease
  private suggestPoolSizeDecrease(): void {
    const currentMax = this.pool.options.max || 20;
    const suggestedMax = Math.max(currentMax - 2, 5); // Minimum of 5
    
    console.log(`💡 Pool optimization: Consider decreasing max connections from ${currentMax} to ${suggestedMax}`);
  }

  // Suggest timeout increase
  private suggestTimeoutIncrease(): void {
    console.log('💡 Pool optimization: Consider increasing connection timeouts due to high error rate');
  }

  // Log optimization suggestions
  private logOptimizationSuggestions(): void {
    const suggestions: string[] = [];

    if (this.metrics.connectionUtilization > 0.9) {
      suggestions.push('High connection utilization - consider scaling');
    }

    if (this.metrics.averageWaitTime > 2000) {
      suggestions.push('Long wait times - consider increasing pool size');
    }

    if (this.metrics.errorRate > 0.1) {
      suggestions.push('High error rate - check connection stability');
    }

    if (suggestions.length > 0) {
      console.log('🔧 Pool optimization suggestions:', suggestions);
    }
  }

  // Track query performance
  trackQuery(query: string, startTime: number, endTime: number, error?: Error): void {
    const duration = endTime - startTime;
    const normalizedQuery = this.normalizeQuery(query);
    
    const existing = this.queryStats.get(normalizedQuery);
    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.averageTime = existing.totalTime / existing.count;
      existing.minTime = Math.min(existing.minTime, duration);
      existing.maxTime = Math.max(existing.maxTime, duration);
      if (error) {
        existing.errorCount++;
      }
    } else {
      this.queryStats.set(normalizedQuery, {
        query: normalizedQuery,
        count: 1,
        totalTime: duration,
        averageTime: duration,
        minTime: duration,
        maxTime: duration,
        errorCount: error ? 1 : 0,
      });
    }
  }

  // Normalize query for statistics
  private normalizeQuery(query: string): string {
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '$?') // Replace parameter placeholders
      .toLowerCase();
  }

  // Get pool metrics
  getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }

  // Get query statistics
  getQueryStats(): QueryStats[] {
    return Array.from(this.queryStats.values()).sort((a, b) => b.count - a.count);
  }

  // Get slow queries
  getSlowQueries(threshold: number = 1000): QueryStats[] {
    return Array.from(this.queryStats.values())
      .filter(stat => stat.averageTime > threshold)
      .sort((a, b) => b.averageTime - a.averageTime);
  }

  // Get most frequent queries
  getMostFrequentQueries(limit: number = 10): QueryStats[] {
    return Array.from(this.queryStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Get queries with errors
  getQueriesWithErrors(): QueryStats[] {
    return Array.from(this.queryStats.values())
      .filter(stat => stat.errorCount > 0)
      .sort((a, b) => b.errorCount - a.errorCount);
  }

  // Execute query with performance tracking
  async executeQuery<T>(
    query: string,
    params: any[] = [],
    client?: PoolClient
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = client 
        ? await client.query(query, params)
        : await this.pool.query(query, params);
      
      const endTime = Date.now();
      this.trackQuery(query, startTime, endTime);
      
      return result.rows as T;
    } catch (error) {
      const endTime = Date.now();
      this.trackQuery(query, startTime, endTime, error as Error);
      throw error;
    }
  }

  // Get connection from pool with timeout
  async getConnection(timeoutMs: number = 10000): Promise<PoolClient> {
    const startTime = Date.now();
    
    try {
      const client = await Promise.race([
        this.pool.connect(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), timeoutMs);
        })
      ]);
      
      const endTime = Date.now();
      console.log(`🔗 Connection acquired in ${endTime - startTime}ms`);
      
      return client;
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ Failed to acquire connection after ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{
    healthy: boolean;
    metrics: PoolMetrics;
    issues: string[];
  }> {
    const issues: string[] = [];
    let healthy = true;

    // Check pool metrics
    if (this.metrics.connectionUtilization > 0.95) {
      issues.push('Very high connection utilization');
      healthy = false;
    }

    if (this.metrics.averageWaitTime > 5000) {
      issues.push('Long connection wait times');
      healthy = false;
    }

    if (this.metrics.errorRate > 0.1) {
      issues.push('High error rate');
      healthy = false;
    }

    // Test actual connection
    try {
      const client = await this.getConnection(5000);
      await client.query('SELECT 1');
      client.release();
    } catch (error) {
      issues.push('Connection test failed');
      healthy = false;
    }

    return {
      healthy,
      metrics: this.metrics,
      issues,
    };
  }

  // Reset statistics
  resetStats(): void {
    this.queryStats.clear();
    this.metrics = {
      totalConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      activeConnections: 0,
      averageWaitTime: 0,
      averageQueryTime: 0,
      connectionUtilization: 0,
      errorRate: 0,
    };
  }

  // Destroy optimizer
  destroy(): void {
    this.stopMonitoring();
    this.queryStats.clear();
  }
}

export const connectionPoolOptimizer = new ConnectionPoolOptimizer();

