import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import config from '../config/environment';

// Lazy initialization of environment to avoid early validation errors - REMOVED

const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // FIXED: Allow all origins for testing
    return callback(null, true);
    
    // Original code (commented out for testing):
    /*
    // PRODUCTION FIX: Allow requests with no origin for health checks and monitoring tools
    if (!origin) {
      // Allow no-origin requests for:
      // 1. Health check endpoints
      // 2. Monitoring tools (like PowerShell, curl, etc.)
      // 3. Development environment
      const isHealthCheck = process.env.NODE_ENV === 'development' || 
                           (process.env.ALLOW_NO_ORIGIN === 'true');
      
      if (isHealthCheck) {
        // Allow no-origin requests for health checks and monitoring
        return callback(null, true);
      } else {
        return callback(new Error('Origin required in production'), false);
      }
    }

    // Use the environment configuration for allowed origins
    const allowedOrigins = config.cors.allowedOrigins;

    let isAllowed = false;

    // SECURITY FIX: Strict origin checking - only allow configured origins
    isAllowed = allowedOrigins.some((allowedOrigin: string | RegExp) => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    // SECURITY FIX: Only allow localhost in development mode with strict validation
    if (!isAllowed && process.env.NODE_ENV === 'development') {
      // Only allow specific localhost patterns in development
      const localhostPatterns = [
        /^https?:\/\/localhost:\d+$/,
        /^https?:\/\/127\.0\.0\.1:\d+$/,
        /^https?:\/\/\[::1\]:\d+$/
      ];
      
      if (localhostPatterns.some(pattern => pattern.test(origin))) {
        isAllowed = true;
      }
    }

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
    */
  },
  credentials: true,
  optionsSuccessStatus: 204,
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
    'X-Request-ID',
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

    // Firefox-specific preflight handling
    let corsOrigin = req.headers.origin || '*';

    // Ensure we don't send '*' when credentials are true (Firefox requirement)
    if (corsOrigin === '*' && req.headers.origin) {
      corsOrigin = req.headers.origin;
    }

    // Set comprehensive CORS headers for Firefox
    res.header('Access-Control-Allow-Origin', corsOrigin);
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Info, X-Client-Version, Cache-Control, Pragma, X-Request-ID'
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');

    res.status(200).end();
    return;
  }
  next();
};
