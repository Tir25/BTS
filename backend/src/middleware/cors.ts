import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import initializeEnvironment from '../config/environment';

// Initialize environment to get CORS configuration
const environment = initializeEnvironment();

const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('🔄 CORS: Request with no origin (mobile app, curl, etc.)');
      return callback(null, true);
    }

    // Use the environment configuration for allowed origins
    const allowedOrigins = environment.cors.allowedOrigins;

    // Check if origin matches any allowed origin (string or regex)
    const isAllowed = allowedOrigins.some((allowedOrigin: string | RegExp) => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      console.log(`✅ CORS: Allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.error(`❌ CORS blocked origin: ${origin}`);
      console.log('🔍 Allowed origins:', allowedOrigins);
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Client-Info',
    'X-Client-Version',
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page',
  ],
};

export const corsMiddleware = cors(corsOptions);

// Preflight handler for complex requests
export const handlePreflight = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS: Handling preflight request');
    res.status(200).end();
    return;
  }
  next();
};
