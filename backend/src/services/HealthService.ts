/**
 * Health Service
 * Business logic for health checks and system monitoring
 * Coordinates with various services to gather health information
 */

import { checkDatabaseHealth } from '../config/database';
import { redisCache } from './RedisCacheService';
import { webSocketHealth } from './WebSocketHealthService';
import { connectionPoolMonitor } from './ConnectionPoolMonitor';
import { logger } from '../utils/logger';

// Helper function to add timeout to promises
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

export class HealthService {
  private static readonly HEALTH_CHECK_TIMEOUT = 2000; // 2 seconds max per check

  /**
   * Get basic health status
   * Checks database, Redis, and WebSocket connectivity
   */
  static async getBasicHealth(): Promise<{
    status: 'healthy' | 'degraded';
    timestamp: string;
    uptime: number;
    environment: string;
    version: string;
    services: {
      database: string;
      redis: string;
      websocket: string;
    };
  }> {
    try {
      const [databaseHealth, redisHealth, websocketHealth] = await Promise.allSettled([
        withTimeout(
          checkDatabaseHealth(), 
          this.HEALTH_CHECK_TIMEOUT, 
          'Database health check timeout'
        ).catch(err => ({ healthy: false, error: err.message })),
        withTimeout(
          redisCache.getHealth(), 
          this.HEALTH_CHECK_TIMEOUT, 
          'Redis health check timeout'
        ).catch(err => ({ connected: false, error: err.message })),
        Promise.resolve(webSocketHealth.getHealth())
      ]);
      
      const dbHealthy = databaseHealth.status === 'fulfilled' && databaseHealth.value.healthy;
      const redisHealthy = redisHealth.status === 'fulfilled' && redisHealth.value.connected;
      const websocketHealthy = websocketHealth.status === 'fulfilled' && websocketHealth.value.connected;
      const overallHealthy = dbHealthy && redisHealthy && websocketHealthy;
      
      return {
        status: overallHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        services: {
          database: dbHealthy ? 'connected' : 'disconnected',
          redis: redisHealthy ? 'connected' : 'disconnected',
          websocket: websocketHealthy ? 'connected' : 'disconnected'
        }
      };
    } catch (error) {
      logger.error('Error in getBasicHealth', 'health-service', { error: String(error) });
      throw error;
    }
  }

  /**
   * Get detailed health status with metrics
   * Includes system information, memory usage, and service details
   */
  static async getDetailedHealth(): Promise<{
    status: 'healthy' | 'degraded';
    timestamp: string;
    uptime: number;
    environment: string;
    version: string;
    system: {
      platform: string;
      arch: string;
      nodeVersion: string;
      pid: number;
    };
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
      external: string;
    };
    services: {
      database: any;
      redis: any;
      websocket: any;
    };
    responseTime: string;
  }> {
    try {
      const startTime = Date.now();
      const memoryUsage = process.memoryUsage();
      
      const [databaseHealth, redisHealth, websocketHealth] = await Promise.allSettled([
        withTimeout(
          checkDatabaseHealth(), 
          this.HEALTH_CHECK_TIMEOUT, 
          'Database health check timeout'
        ).catch(err => ({ healthy: false, error: err.message })),
        withTimeout(
          redisCache.getHealth(), 
          this.HEALTH_CHECK_TIMEOUT, 
          'Redis health check timeout'
        ).catch(err => ({ connected: false, error: err.message })),
        Promise.resolve(webSocketHealth.getHealth())
      ]);
      
      const dbHealthy = databaseHealth.status === 'fulfilled' && databaseHealth.value.healthy;
      const redisHealthy = redisHealth.status === 'fulfilled' && redisHealth.value.connected;
      const websocketHealthy = websocketHealth.status === 'fulfilled' && websocketHealth.value.connected;
      const overallHealthy = dbHealthy && redisHealthy && websocketHealthy;
      
      return {
        status: overallHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        system: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          pid: process.pid
        },
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        services: {
          database: {
            status: dbHealthy ? 'connected' : 'disconnected',
            error: databaseHealth.status === 'rejected' ? String(databaseHealth.reason) : 
                   (databaseHealth.status === 'fulfilled' && 'error' in databaseHealth.value ? databaseHealth.value.error : null),
            metrics: databaseHealth.status === 'fulfilled' && 'metrics' in databaseHealth.value ? databaseHealth.value.metrics : null
          },
          redis: {
            status: redisHealthy ? 'connected' : 'disconnected',
            error: redisHealth.status === 'rejected' ? String(redisHealth.reason) : 
                   (redisHealth.status === 'fulfilled' && 'error' in redisHealth.value ? redisHealth.value.error : null),
            latency: redisHealth.status === 'fulfilled' && 'latency' in redisHealth.value ? `${redisHealth.value.latency}ms` : null,
            stats: redisHealth.status === 'fulfilled' && 'stats' in redisHealth.value ? redisHealth.value.stats : null
          },
          websocket: {
            status: websocketHealthy ? 'connected' : 'disconnected',
            activeConnections: websocketHealth.status === 'fulfilled' ? websocketHealth.value.activeConnections : 0,
            driverConnections: websocketHealth.status === 'fulfilled' ? websocketHealth.value.driverConnections : 0,
            studentConnections: websocketHealth.status === 'fulfilled' ? websocketHealth.value.studentConnections : 0,
            adminConnections: websocketHealth.status === 'fulfilled' ? websocketHealth.value.adminConnections : 0,
            errorRate: websocketHealth.status === 'fulfilled' ? `${websocketHealth.value.errorRate}%` : '0%',
            uptime: websocketHealth.status === 'fulfilled' ? `${websocketHealth.value.uptime}s` : '0s',
            performance: websocketHealth.status === 'fulfilled' ? websocketHealth.value.performance : null
          }
        },
        responseTime: `${Date.now() - startTime}ms`
      };
    } catch (error) {
      logger.error('Error in getDetailedHealth', 'health-service', { error: String(error) });
      throw error;
    }
  }

  /**
   * Get readiness status
   * Checks if all critical services are ready to accept traffic
   */
  static async getReadiness(): Promise<{
    status: 'ready' | 'not ready';
    timestamp: string;
    reason?: string;
    services: {
      database: string;
      redis: string;
      websocket: string;
    };
  }> {
    try {
      const [databaseHealth, redisHealth, websocketHealth] = await Promise.allSettled([
        withTimeout(
          checkDatabaseHealth(), 
          this.HEALTH_CHECK_TIMEOUT, 
          'Database health check timeout'
        ).catch(err => ({ healthy: false, error: err.message })),
        withTimeout(
          redisCache.getHealth(), 
          this.HEALTH_CHECK_TIMEOUT, 
          'Redis health check timeout'
        ).catch(err => ({ connected: false, error: err.message })),
        Promise.resolve(webSocketHealth.getHealth())
      ]);
      
      const dbHealthy = databaseHealth.status === 'fulfilled' && databaseHealth.value.healthy;
      const redisHealthy = redisHealth.status === 'fulfilled' && redisHealth.value.connected;
      const websocketHealthy = websocketHealth.status === 'fulfilled' && websocketHealth.value.connected;
      
      if (dbHealthy && redisHealthy && websocketHealthy) {
        return {
          status: 'ready',
          timestamp: new Date().toISOString(),
          services: {
            database: 'ready',
            redis: 'ready',
            websocket: 'ready'
          }
        };
      } else {
        const reasons: string[] = [];
        if (!dbHealthy) reasons.push('Database not available');
        if (!redisHealthy) reasons.push('Redis not available');
        if (!websocketHealthy) reasons.push('WebSocket not available');
        
        return {
          status: 'not ready',
          timestamp: new Date().toISOString(),
          reason: reasons.join(', '),
          services: {
            database: dbHealthy ? 'ready' : 'not ready',
            redis: redisHealthy ? 'ready' : 'not ready',
            websocket: websocketHealthy ? 'ready' : 'not ready'
          }
        };
      }
    } catch (error) {
      logger.error('Error in getReadiness', 'health-service', { error: String(error) });
      throw error;
    }
  }

  /**
   * Get liveness status
   * Simple check to see if the application is running
   */
  static getLiveness(): {
    status: 'alive';
    timestamp: string;
    uptime: number;
  } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  /**
   * Get WebSocket health information
   */
  static getWebSocketHealth() {
    return webSocketHealth.getHealth();
  }

  /**
   * Get WebSocket statistics
   */
  static getWebSocketStats() {
    return webSocketHealth.getStats();
  }

  /**
   * Get connection pool health
   */
  static getConnectionPoolHealth() {
    return connectionPoolMonitor.getHealth();
  }

  /**
   * Get connection pool metrics
   */
  static getConnectionPoolMetrics() {
    return connectionPoolMonitor.getMetrics();
  }

  /**
   * Get connection pool optimization recommendations
   */
  static getConnectionPoolOptimization() {
    return connectionPoolMonitor.getOptimization();
  }

  /**
   * Get connection pool alerts
   */
  static getConnectionPoolAlerts() {
    return connectionPoolMonitor.getAlerts();
  }

  /**
   * Get system metrics
   */
  static getMetrics(): {
    timestamp: string;
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    cpu: {
      user: number;
      system: number;
    };
    eventLoop: {
      lag: bigint;
    };
    websocket: any;
  } {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const websocketStats = webSocketHealth.getStats();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      eventLoop: {
        lag: process.hrtime.bigint()
      },
      websocket: websocketStats
    };
  }
}

