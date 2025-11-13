/**
 * Health Routes
 * Routes for health check endpoints
 * Delegates to HealthController
 */

import { Router } from 'express';
import { HealthController } from '../controllers/healthController';

const router = Router();

// Basic health check
router.get('/', HealthController.getHealth);

// Detailed health check
router.get('/detailed', HealthController.getDetailedHealth);

// Readiness check
router.get('/ready', HealthController.getReadiness);

// Liveness check
router.get('/live', HealthController.getLiveness);

// WebSocket health endpoint
router.get('/websocket', HealthController.getWebSocketHealth);

// Connection pool health endpoint
router.get('/pool', HealthController.getConnectionPoolHealth);

// Metrics endpoint
router.get('/metrics', HealthController.getMetrics);

export default router;