/**
 * Health Controller
 * Handles HTTP requests for health check endpoints
 * Delegates business logic to HealthService
 */

import { Request, Response } from 'express';
import { HealthService } from '../services/HealthService';
import { ResponseHelper } from '../utils/responseHelpers';
import { logger } from '../utils/logger';

export class HealthController {
  /**
   * Basic health check endpoint
   * Returns overall system health status
   */
  static async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await HealthService.getBasicHealth();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check failed', 'health-controller', { error: String(error) });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  }

  /**
   * Detailed health check endpoint
   * Returns comprehensive system health information including metrics
   */
  static async getDetailedHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await HealthService.getDetailedHealth();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Detailed health check failed', 'health-controller', { error: String(error) });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Detailed health check failed'
      });
    }
  }

  /**
   * Readiness check endpoint
   * Returns whether the system is ready to accept traffic
   */
  static async getReadiness(req: Request, res: Response): Promise<void> {
    try {
      const readiness = await HealthService.getReadiness();
      const statusCode = readiness.status === 'ready' ? 200 : 503;
      res.status(statusCode).json(readiness);
    } catch (error) {
      logger.error('Readiness check failed', 'health-controller', { error: String(error) });
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed'
      });
    }
  }

  /**
   * Liveness check endpoint
   * Returns whether the application is alive
   */
  static async getLiveness(req: Request, res: Response): Promise<void> {
    try {
      const liveness = HealthService.getLiveness();
      res.status(200).json(liveness);
    } catch (error) {
      logger.error('Liveness check failed', 'health-controller', { error: String(error) });
      res.status(503).json({
        status: 'dead',
        timestamp: new Date().toISOString(),
        error: 'Liveness check failed'
      });
    }
  }

  /**
   * WebSocket health endpoint
   * Returns WebSocket connection health and statistics
   */
  static async getWebSocketHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = HealthService.getWebSocketHealth();
      const statusCode = health.connected ? 200 : 503;
      res.status(statusCode).json({
        success: health.connected,
        data: {
          health,
          stats: HealthService.getWebSocketStats(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('WebSocket health check failed', 'health-controller', { error: String(error) });
      res.status(503).json({
        success: false,
        error: 'WebSocket health check failed',
        message: String(error)
      });
    }
  }

  /**
   * Connection pool health endpoint
   * Returns database connection pool metrics and health
   */
  static async getConnectionPoolHealth(req: Request, res: Response): Promise<void> {
    try {
      const poolHealth = HealthService.getConnectionPoolHealth();
      const statusCode = poolHealth.healthy ? 200 : 503;
      res.status(statusCode).json({
        success: poolHealth.healthy,
        data: {
          metrics: HealthService.getConnectionPoolMetrics(),
          optimization: HealthService.getConnectionPoolOptimization(),
          alerts: HealthService.getConnectionPoolAlerts(),
          health: poolHealth,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Connection pool health check failed', 'health-controller', { error: String(error) });
      res.status(503).json({
        success: false,
        error: 'Connection pool health check failed',
        message: String(error)
      });
    }
  }

  /**
   * Metrics endpoint
   * Returns system performance metrics
   */
  static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = HealthService.getMetrics();
      res.status(200).json(metrics);
    } catch (error) {
      logger.error('Metrics retrieval failed', 'health-controller', { error: String(error) });
      res.status(500).json({
        error: 'Failed to retrieve metrics',
        message: String(error)
      });
    }
  }
}

