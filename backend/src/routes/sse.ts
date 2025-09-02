import express from 'express';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Handle preflight OPTIONS request for SSE
router.options('/', (req, res) => {
  const origin = req.headers.origin;
  
  // Ultra-permissive CORS for Firefox development
  let corsOrigin = '*'; // Allow all origins for Firefox compatibility
  
  // Only restrict in production
  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'https://bts-frontend-navy.vercel.app',
      'https://bts-frontend-navy.vercel.com'
    ];
    
    if (origin && allowedOrigins.includes(origin)) {
      corsOrigin = origin;
    } else if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      corsOrigin = origin;
    }
  }
  
  // Set ultra-permissive CORS headers for Firefox
  res.header('Access-Control-Allow-Origin', corsOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.status(200).end();
});

// SSE endpoint for real-time updates
router.get('/', (req, res) => {
  // Set SSE headers with ultra-permissive CORS for Firefox
  const origin = req.headers.origin;
  
  // Ultra-permissive CORS for Firefox development
  let corsOrigin = '*'; // Allow all origins for Firefox compatibility
  
  // Only restrict in production
  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'https://bts-frontend-navy.vercel.app',
      'https://bts-frontend-navy.vercel.com'
    ];
    
    if (origin && allowedOrigins.includes(origin)) {
      corsOrigin = origin;
    } else if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      corsOrigin = origin;
    }
  }
  
  // Set ultra-permissive CORS headers for Firefox
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Embedder-Policy': 'unsafe-none',
    'Cross-Origin-Opener-Policy': 'unsafe-none',
    'Cross-Origin-Resource-Policy': 'cross-origin',
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
