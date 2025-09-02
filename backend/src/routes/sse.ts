import express from 'express';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Handle preflight OPTIONS request for SSE using global CORS middleware
router.options('/', (_req, res) => {
  return res.sendStatus(204);
});

// SSE endpoint for real-time updates
router.get('/', (req, res) => {
  // Set SSE headers (CORS handled by global middleware)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Connection': 'keep-alive',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    message: 'SSE connection established',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000); // Send heartbeat every 30 seconds

  // Handle client disconnect
  req.on('close', () => {
    console.log('🔌 SSE client disconnected');
    clearInterval(heartbeat);
  });

  req.on('error', (error) => {
    console.error('❌ SSE connection error:', error);
    clearInterval(heartbeat);
  });
});

// Send event to all connected SSE clients
export const sendSSEEvent = (eventType: string, data: any) => {
  // This would be implemented with a proper SSE client management system
  // For now, we'll just log the event
  console.log(`📡 SSE Event: ${eventType}`, data);
};

export default router;
