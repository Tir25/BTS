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

    // Enhanced logging for debugging
    console.log(`🔍 CORS: Checking origin: ${origin}`);
    console.log(`🔍 CORS: Allowed origins count: ${allowedOrigins.length}`);

    // Check if origin matches any allowed origin (string or regex)
    const isAllowed = allowedOrigins.some((allowedOrigin: string | RegExp) => {
      if (typeof allowedOrigin === 'string') {
        const matches = allowedOrigin === origin;
        if (matches) {
          console.log(`✅ CORS: String match found for: ${origin}`);
        }
        return matches;
      } else if (allowedOrigin instanceof RegExp) {
        const matches = allowedOrigin.test(origin);
        if (matches) {
          console.log(`✅ CORS: Regex match found for: ${origin} with pattern: ${allowedOrigin}`);
        }
        return matches;
      }
      return false;
    });

    if (isAllowed) {
      console.log(`✅ CORS: Allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.error(`❌ CORS blocked origin: ${origin}`);
      console.log('🔍 Allowed origins:', allowedOrigins);
      console.log('🔍 Environment:', process.env.NODE_ENV);
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
    'Cache-Control',
    'Pragma',
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
    console.log('🔄 CORS: Handling preflight request from:', req.headers.origin);
    
    // Set CORS headers for preflight
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Info, X-Client-Version, Cache-Control, Pragma');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    res.status(200).end();
    return;
  }
  next();
};
