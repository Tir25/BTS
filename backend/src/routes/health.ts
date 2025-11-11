import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { redisCache } from '../services/RedisCacheService';
import { webSocketHealth } from '../services/WebSocketHealthService';
import { connectionPoolMonitor } from '../services/ConnectionPoolMonitor';
import { logger } from '../utils/logger';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const [databaseHealth, redisHealth, websocketHealth] = await Promise.allSettled([
      checkDatabaseHealth(),
      redisCache.getHealth(),
      Promise.resolve(webSocketHealth.getHealth())
    ]);
    
    const dbHealthy = databaseHealth.status === 'fulfilled' && databaseHealth.value.healthy;
    const redisHealthy = redisHealth.status === 'fulfilled' && redisHealth.value.connected;
    const websocketHealthy = websocketHealth.status === 'fulfilled' && websocketHealth.value.connected;
    
    const overallHealthy = dbHealthy && redisHealthy && websocketHealthy;
    
    const status = {
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
    
    res.status(overallHealthy ? 200 : 503).json(status);
  } catch (error) {
    logger.error('Health check failed', 'health', { error: String(error) });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const memoryUsage = process.memoryUsage();
    
    const [databaseHealth, redisHealth, websocketHealth] = await Promise.allSettled([
      checkDatabaseHealth(),
      redisCache.getHealth(),
      Promise.resolve(webSocketHealth.getHealth())
    ]);
    
    const dbHealthy = databaseHealth.status === 'fulfilled' && databaseHealth.value.healthy;
    const redisHealthy = redisHealth.status === 'fulfilled' && redisHealth.value.connected;
    const websocketHealthy = websocketHealth.status === 'fulfilled' && websocketHealth.value.connected;
    const overallHealthy = dbHealthy && redisHealthy && websocketHealthy;
    
    const detailedStatus = {
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
                 (databaseHealth.status === 'fulfilled' ? databaseHealth.value.error : null),
          metrics: databaseHealth.status === 'fulfilled' ? databaseHealth.value.metrics : null
        },
        redis: {
          status: redisHealthy ? 'connected' : 'disconnected',
          error: redisHealth.status === 'rejected' ? String(redisHealth.reason) : 
                 (redisHealth.status === 'fulfilled' ? redisHealth.value.error : null),
          latency: redisHealth.status === 'fulfilled' ? `${redisHealth.value.latency}ms` : null,
          stats: redisHealth.status === 'fulfilled' ? redisHealth.value.stats : null
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
    
    res.status(overallHealthy ? 200 : 503).json(detailedStatus);
  } catch (error) {
    logger.error('Detailed health check failed', 'health', { error: String(error) });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed'
    });
  }
});

// Readiness check
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const [databaseHealth, redisHealth, websocketHealth] = await Promise.allSettled([
      checkDatabaseHealth(),
      redisCache.getHealth(),
      Promise.resolve(webSocketHealth.getHealth())
    ]);
    
    const dbHealthy = databaseHealth.status === 'fulfilled' && databaseHealth.value.healthy;
    const redisHealthy = redisHealth.status === 'fulfilled' && redisHealth.value.connected;
    const websocketHealthy = websocketHealth.status === 'fulfilled' && websocketHealth.value.connected;
    
    if (dbHealthy && redisHealthy && websocketHealthy) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        services: {
          database: 'ready',
          redis: 'ready',
          websocket: 'ready'
        }
      });
    } else {
      const reasons: string[] = [];
      if (!dbHealthy) reasons.push('Database not available');
      if (!redisHealthy) reasons.push('Redis not available');
      if (!websocketHealthy) reasons.push('WebSocket not available');
      
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: reasons.join(', '),
        services: {
          database: dbHealthy ? 'ready' : 'not ready',
          redis: redisHealthy ? 'ready' : 'not ready',
          websocket: websocketHealthy ? 'ready' : 'not ready'
        }
      });
    }
  } catch (error) {
    logger.error('Readiness check failed', 'health', { error: String(error) });
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    });
  }
});

// Liveness check
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// WebSocket health endpoint
router.get('/websocket', (req: Request, res: Response) => {
  try {
    const health = webSocketHealth.getHealth();
    const stats = webSocketHealth.getStats();
    
    res.status(health.connected ? 200 : 503).json({
      success: health.connected,
      data: {
        health,
        stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('WebSocket health check failed', 'health', { error: String(error) });
    res.status(503).json({
      success: false,
      error: 'WebSocket health check failed',
      message: String(error)
    });
  }
});

// Connection pool health endpoint
router.get('/pool', (req: Request, res: Response) => {
  try {
    const metrics = connectionPoolMonitor.getMetrics();
    const optimization = connectionPoolMonitor.getOptimization();
    const alerts = connectionPoolMonitor.getAlerts();
    const health = connectionPoolMonitor.getHealth();
    
    res.status(health.healthy ? 200 : 503).json({
      success: health.healthy,
      data: {
        metrics,
        optimization,
        alerts,
        health,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Connection pool health check failed', 'health', { error: String(error) });
    res.status(503).json({
      success: false,
      error: 'Connection pool health check failed',
      message: String(error)
    });
  }
});

// Metrics endpoint
router.get('/metrics', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const websocketStats = webSocketHealth.getStats();
  
  const metrics = {
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
  
  res.status(200).json(metrics);
});

export default router;