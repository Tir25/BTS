import { Router } from 'express';
import { getDatabaseHealth } from '../models/database';

const router = Router();

// Health check endpoint with enhanced database health monitoring
router.get('/', async (req, res) => {
  try {
    // Get comprehensive database health information
    const dbHealth = await getDatabaseHealth();

    const response = {
      status: dbHealth.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbHealth.healthy ? 'connected' : 'disconnected',
        details: dbHealth.details,
      },
      services: {
        database: dbHealth.healthy ? 'operational' : 'down',
        supabase: 'configured', // Will be tested in future
        websocket: 'ready', // Will be tested in future
      },
      version: '1.0.0',
    };

    const statusCode = dbHealth.healthy ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      services: {
        database: 'error',
        supabase: 'unknown',
        websocket: 'unknown',
      },
      version: '1.0.0',
    });
  }
});

// Detailed health check endpoint
router.get('/detailed', async (req, res) => {
  try {
    const dbHealth = await getDatabaseHealth();

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
