import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import initializeEnvironment from '../config/environment';

// Initialize environment to get CORS configuration
const environment = initializeEnvironment();

// Secure CORS configuration with proper origin validation
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Get allowed origins from environment configuration
    const allowedOrigins = environment.cors.allowedOrigins;
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS: Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 204,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'User-Agent',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page',
  ],
};

export const corsMiddleware = cors(corsOptions);

// Enhanced preflight handler with proper origin validation
export const handlePreflight = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    console.log('🔄 CORS: Handling preflight request from:', origin);

    // Validate origin using the same logic as corsOptions
    const allowedOrigins = environment.cors.allowedOrigins;
    let isOriginAllowed = false;
    let allowedOrigin = null;

    if (!origin) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      isOriginAllowed = true;
    } else {
      // Check if origin is allowed
      for (const allowed of allowedOrigins) {
        if (typeof allowed === 'string' && allowed === origin) {
          isOriginAllowed = true;
          allowedOrigin = origin;
          break;
        } else if (allowed instanceof RegExp && allowed.test(origin)) {
          isOriginAllowed = true;
          allowedOrigin = origin;
          break;
        }
      }
    }

    if (isOriginAllowed) {
      // Set secure CORS headers
      res.header('Access-Control-Allow-Origin', allowedOrigin || '*');
      res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS, PATCH'
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent, Cache-Control, Pragma'
      );
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-XSS-Protection', '1; mode=block');

      res.status(200).end();
      return;
    } else {
      console.warn(`🚫 CORS: Blocked preflight request from origin: ${origin}`);
      res.status(403).json({
        error: 'CORS policy violation',
        message: 'Origin not allowed',
        origin: origin
      });
      return;
    }
  }
  next();
};
