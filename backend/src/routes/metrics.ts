import { Router, Request, Response } from 'express';
import { performanceMonitor } from '../services/PerformanceMonitor';
import { pool, getOptimizationStats } from '../config/database';
import { databaseOptimizer } from '../scripts/optimizeDatabase';

const router = Router();

// Get performance metrics
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const stats = performanceMonitor.getPerformanceStats();
    const health = performanceMonitor.getSystemHealth();
    
    res.json({
      success: true,
      data: {
        performance: stats,
        health,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics',
    });
  }
});

// Get system metrics
router.get('/system', async (req: Request, res: Response) => {
  try {
    const systemMetrics = performanceMonitor.getSystemMetricsHistory(10);
    const health = performanceMonitor.getSystemHealth();
    
    res.json({
      success: true,
      data: {
        systemMetrics,
        health,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error getting system metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system metrics',
    });
  }
});

// Get recent operations
router.get('/operations', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const recentMetrics = performanceMonitor.getRecentMetrics(limit);
    
    res.json({
      success: true,
      data: {
        operations: recentMetrics,
        count: recentMetrics.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error getting recent operations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent operations',
    });
  }
});

// Get database connection stats
router.get('/database', async (req: Request, res: Response) => {
  try {
    const dbStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
    
    res.json({
      success: true,
      data: {
        connections: dbStats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database stats',
    });
  }
});

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = performanceMonitor.getSystemHealth();
    const performance = performanceMonitor.getPerformanceStats();
    
    const overallHealth = {
      healthy: health.healthy && performance.errorRate < 0.1, // Less than 10% error rate
      issues: [...health.issues],
      performance: {
        averageResponseTime: performance.averageResponseTime,
        errorRate: performance.errorRate,
        uptime: performance.uptime,
      },
      timestamp: new Date().toISOString(),
    };
    
    if (performance.errorRate >= 0.1) {
      overallHealth.issues.push(`High error rate: ${(performance.errorRate * 100).toFixed(1)}%`);
    }
    
    res.json({
      success: true,
      data: overallHealth,
    });
  } catch (error) {
    console.error('❌ Error getting health status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health status',
    });
  }
});

// Database optimization endpoint
router.post('/optimize-database', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Starting database optimization...');
    const result = await databaseOptimizer.optimizeDatabase();
    
    res.json({
      success: result.success,
      data: result,
      message: result.success 
        ? 'Database optimization completed successfully'
        : 'Database optimization completed with some failures',
    });
  } catch (error) {
    console.error('❌ Error optimizing database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize database',
    });
  }
});

// Get database index status
router.get('/database-indexes', async (req: Request, res: Response) => {
  try {
    const indexStatus = await databaseOptimizer.getIndexStatus();
    
    res.json({
      success: true,
      data: indexStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error getting database index status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database index status',
    });
  }
});

// Get database optimization metrics
router.get('/database-optimization', async (req: Request, res: Response) => {
  try {
    const optimizationStats = getOptimizationStats();
    
    res.json({
      success: true,
      data: optimizationStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error getting database optimization metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database optimization metrics',
    });
  }
});

export default router;
