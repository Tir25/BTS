/**
 * WebSocket Health Service
 * Monitors WebSocket connections, performance, and health metrics
 */

import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

export interface WebSocketHealth {
  connected: boolean;
  activeConnections: number;
  totalConnections: number;
  driverConnections: number;
  studentConnections: number;
  adminConnections: number;
  averageLatency: number;
  errorRate: number;
  uptime: number;
  lastActivity: string;
  performance: {
    eventsPerSecond: number;
    bytesPerSecond: number;
    memoryUsage: number;
  };
}

export interface WebSocketStats {
  connections: {
    total: number;
    drivers: number;
    students: number;
    admins: number;
    anonymous: number;
  };
  performance: {
    eventsPerSecond: number;
    bytesPerSecond: number;
    averageLatency: number;
    errorRate: number;
  };
  memory: {
    used: number;
    peak: number;
  };
}

export class WebSocketHealthService {
  private io: SocketIOServer | null = null;
  private startTime: number = Date.now();
  private eventCount: number = 0;
  private errorCount: number = 0;
  private bytesTransferred: number = 0;
  private lastActivity: number = Date.now();
  private performanceInterval: NodeJS.Timeout | null = null;
  private eventsPerSecond: number = 0;
  private bytesPerSecond: number = 0;

  constructor() {
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize WebSocket health monitoring
   */
  initialize(io: SocketIOServer): void {
    this.io = io;
    this.startTime = Date.now();
    
    // Monitor connection events
    io.on('connection', (socket) => {
      this.lastActivity = Date.now();
      this.monitorSocket(socket);
    });

    // Monitor disconnection events
    io.on('disconnect', () => {
      this.lastActivity = Date.now();
    });

    logger.info('WebSocket health monitoring initialized', 'websocket-health');
  }

  /**
   * Get WebSocket health status
   */
  getHealth(): WebSocketHealth {
    if (!this.io) {
      return {
        connected: false,
        activeConnections: 0,
        totalConnections: 0,
        driverConnections: 0,
        studentConnections: 0,
        adminConnections: 0,
        averageLatency: 0,
        errorRate: 0,
        uptime: 0,
        lastActivity: new Date(this.lastActivity).toISOString(),
        performance: {
          eventsPerSecond: 0,
          bytesPerSecond: 0,
          memoryUsage: 0
        }
      };
    }

    const sockets = this.io.sockets.sockets;
    const totalConnections = sockets.size;
    
    // Count connections by type
    let driverConnections = 0;
    let studentConnections = 0;
    let adminConnections = 0;

    sockets.forEach((socket: any) => {
      if (socket.userRole === 'driver') driverConnections++;
      else if (socket.userRole === 'student') studentConnections++;
      else if (socket.userRole === 'admin') adminConnections++;
    });

    const uptime = Date.now() - this.startTime;
    const errorRate = this.eventCount > 0 ? (this.errorCount / this.eventCount) * 100 : 0;

    return {
      connected: true,
      activeConnections: totalConnections,
      totalConnections,
      driverConnections,
      studentConnections,
      adminConnections,
      averageLatency: this.calculateAverageLatency(),
      errorRate: Math.round(errorRate * 100) / 100,
      uptime: Math.round(uptime / 1000),
      lastActivity: new Date(this.lastActivity).toISOString(),
      performance: {
        eventsPerSecond: this.eventsPerSecond,
        bytesPerSecond: this.bytesPerSecond,
        memoryUsage: this.getMemoryUsage()
      }
    };
  }

  /**
   * Get detailed WebSocket statistics
   */
  getStats(): WebSocketStats {
    if (!this.io) {
      return {
        connections: {
          total: 0,
          drivers: 0,
          students: 0,
          admins: 0,
          anonymous: 0
        },
        performance: {
          eventsPerSecond: 0,
          bytesPerSecond: 0,
          averageLatency: 0,
          errorRate: 0
        },
        memory: {
          used: 0,
          peak: 0
        }
      };
    }

    const sockets = this.io.sockets.sockets;
    const totalConnections = sockets.size;
    
    let drivers = 0;
    let students = 0;
    let admins = 0;
    let anonymous = 0;

    sockets.forEach((socket: any) => {
      if (socket.userRole === 'driver') drivers++;
      else if (socket.userRole === 'student') students++;
      else if (socket.userRole === 'admin') admins++;
      else anonymous++;
    });

    const errorRate = this.eventCount > 0 ? (this.errorCount / this.eventCount) * 100 : 0;

    return {
      connections: {
        total: totalConnections,
        drivers,
        students,
        admins,
        anonymous
      },
      performance: {
        eventsPerSecond: this.eventsPerSecond,
        bytesPerSecond: this.bytesPerSecond,
        averageLatency: this.calculateAverageLatency(),
        errorRate: Math.round(errorRate * 100) / 100
      },
      memory: {
        used: this.getMemoryUsage(),
        peak: this.getPeakMemoryUsage()
      }
    };
  }

  /**
   * Record event for performance monitoring
   */
  recordEvent(bytes: number = 0): void {
    this.eventCount++;
    this.bytesTransferred += bytes;
    this.lastActivity = Date.now();
  }

  /**
   * Record error for error rate calculation
   */
  recordError(): void {
    this.errorCount++;
    this.lastActivity = Date.now();
  }

  /**
   * Check if WebSocket is healthy
   */
  isHealthy(): boolean {
    if (!this.io) return false;
    
    const health = this.getHealth();
    const uptime = Date.now() - this.startTime;
    
    // Consider unhealthy if:
    // - No connections for more than 5 minutes
    // - Error rate is too high (>50%)
    // - No activity for more than 10 minutes
    const noConnectionsTooLong = health.activeConnections === 0 && uptime > 5 * 60 * 1000;
    const errorRateTooHigh = health.errorRate > 50;
    const noActivityTooLong = Date.now() - this.lastActivity > 10 * 60 * 1000;
    
    return !noConnectionsTooLong && !errorRateTooHigh && !noActivityTooLong;
  }

  /**
   * Get WebSocket connection metrics for monitoring
   */
  getConnectionMetrics(): any {
    if (!this.io) return null;

    const sockets = this.io.sockets.sockets;
    const metrics = {
      totalConnections: sockets.size,
      connectionTypes: {
        drivers: 0,
        students: 0,
        admins: 0,
        anonymous: 0
      },
      averageConnectionAge: 0,
      oldestConnection: 0,
      newestConnection: 0
    };

    let totalAge = 0;
    let oldestTime = Date.now();
    let newestTime = 0;

    sockets.forEach((socket: any) => {
      const connectionTime = socket.connectedAt || Date.now();
      const age = Date.now() - connectionTime;
      
      totalAge += age;
      oldestTime = Math.min(oldestTime, connectionTime);
      newestTime = Math.max(newestTime, connectionTime);

      if (socket.userRole === 'driver') metrics.connectionTypes.drivers++;
      else if (socket.userRole === 'student') metrics.connectionTypes.students++;
      else if (socket.userRole === 'admin') metrics.connectionTypes.admins++;
      else metrics.connectionTypes.anonymous++;
    });

    if (sockets.size > 0) {
      metrics.averageConnectionAge = Math.round(totalAge / sockets.size);
      metrics.oldestConnection = Date.now() - oldestTime;
      metrics.newestConnection = Date.now() - newestTime;
    }

    return metrics;
  }

  /**
   * Monitor individual socket
   */
  private monitorSocket(socket: any): void {
    // Track connection time
    socket.connectedAt = Date.now();
    
    // Monitor events
    const originalEmit = socket.emit;
    socket.emit = function(event: string, ...args: any[]) {
      try {
        const result = originalEmit.call(this, event, ...args);
        // Record successful event
        if (this.healthService) {
          this.healthService.recordEvent();
        }
        return result;
      } catch (error) {
        // Record error
        if (this.healthService) {
          this.healthService.recordError();
        }
        throw error;
      }
    };

    // Monitor disconnection
    socket.on('disconnect', () => {
      this.lastActivity = Date.now();
    });

    // Monitor errors
    socket.on('error', (error: Error) => {
      this.recordError();
      logger.error('WebSocket socket error', 'websocket-health', { 
        socketId: socket.id, 
        error: error.message 
      });
    });
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.performanceInterval = setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - this.startTime) / 1000; // seconds
      
      if (timeDiff > 0) {
        this.eventsPerSecond = Math.round(this.eventCount / timeDiff);
        this.bytesPerSecond = Math.round(this.bytesTransferred / timeDiff);
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(): number {
    // This would need to be implemented with actual latency measurements
    // For now, return a placeholder
    return 0;
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    const memoryUsage = process.memoryUsage();
    return Math.round(memoryUsage.heapUsed / 1024 / 1024); // MB
  }

  /**
   * Get peak memory usage
   */
  private getPeakMemoryUsage(): number {
    const memoryUsage = process.memoryUsage();
    return Math.round(memoryUsage.heapTotal / 1024 / 1024); // MB
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }
  }
}

// Export singleton instance
export const webSocketHealth = new WebSocketHealthService();
