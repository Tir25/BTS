import express from 'express';
import { checkDatabaseHealth } from '../config/database';

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: dbHealth.healthy ? 'healthy' : 'unhealthy',
          details: {
            status: dbHealth.healthy ? 'connected' : 'disconnected',
            error: dbHealth.error,
          },
        },
        api: {
          status: 'operational',
          database: dbHealth.healthy ? 'operational' : 'down',
        },
      },
    };

    const statusCode = dbHealth.healthy ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Detailed health check endpoint
router.get('/detailed', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();

    res.status(200).json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
      version: '1.0.0',
    });
  } catch (error) {
    console.error('Detailed health check failed:', error);
    res.status(503).json({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
