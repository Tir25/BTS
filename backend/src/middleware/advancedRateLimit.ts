import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Enhanced rate limiting configuration based on usage patterns
export const createAdvancedRateLimit = (options: {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  message?: any;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}) => {
  return rateLimit({
    ...options,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', 'rate-limit', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        limit: options.max,
        windowMs: options.windowMs
      });
      
      res.status(429).json({
        error: 'Too many requests',
        message: options.message || 'Rate limit exceeded',
        retryAfter: Math.ceil(options.windowMs / 1000),
        limit: options.max,
        windowMs: options.windowMs
      });
    }
  });
};

// API endpoint specific rate limits based on usage patterns
export const apiRateLimits = {
  // General API rate limiting
  general: createAdvancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      if (req.path.startsWith('/health')) return true;
      // Skip for monitoring endpoints
      if (req.path.startsWith('/monitoring')) return true;
      // IMPORTANT: Do not rate limit admin or assignment control-plane endpoints here
      if (req.path.startsWith('/admin')) return true;
      if (req.path.startsWith('/production-assignments')) return true;
      if (req.path.startsWith('/assignments')) return true;
      return false;
    }
  }),

  // Authentication endpoints - stricter limits
  auth: createAdvancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful logins
    skipFailedRequests: false,
    message: 'Too many authentication attempts. Please try again later.'
  }),

  // Assignment endpoints - moderate limits
  assignments: createAdvancedRateLimit({
    // Permanently relax assignment rate limiting (we'll effectively disable it)
    windowMs: 1 * 60 * 1000, // window kept small but irrelevant since we skip
    max: 1000000,
    skipSuccessfulRequests: true,
    skipFailedRequests: true,
    skip: (req) => {
      // Disable rate limiting for assignment endpoints across environments
      // Assignments are control-plane actions and should not be throttled
      return true;
    },
    message: 'Too many assignment requests. Please slow down.'
  }),

  // Location endpoints - higher limits for real-time data
  locations: createAdvancedRateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    message: 'Too many location requests. Please reduce frequency.'
  }),

  // Admin endpoints - more lenient limits for development
  admin: createAdvancedRateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'development' ? 2000 : 500, // 2000 in development, 500 in production
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: (req) => {
      // Prefer authenticated user id so multiple admin tabs don't share one IP bucket
      const userId = (req as any).user?.id;
      return userId ? `admin:${userId}` : `ip:${req.ip}`;
    },
    skip: (req) => {
      // Skip rate limiting for admin endpoints in development
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      return false;
    },
    message: 'Too many admin requests. Please slow down.'
  }),

  // File upload endpoints - very strict limits
  upload: createAdvancedRateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // 10 uploads per 10 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    message: 'Too many file uploads. Please wait before uploading again.'
  }),

  // WebSocket connection limits
  websocket: createAdvancedRateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 connection attempts per minute
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    message: 'Too many WebSocket connection attempts.'
  }),

  // Analytics and reporting - moderate limits
  analytics: createAdvancedRateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30, // 30 requests per 10 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    message: 'Too many analytics requests. Please reduce frequency.'
  }),

  // Development endpoints - more lenient
  development: createAdvancedRateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute in development
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    skip: (req) => {
      return process.env.NODE_ENV !== 'development';
    }
  })
};

// Dynamic rate limiting based on user behavior
export const createDynamicRateLimit = (baseLimit: number) => {
  return createAdvancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: baseLimit,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      const userId = (req as any).user?.id;
      return userId ? `user:${userId}` : `ip:${req.ip}`;
    },
    skip: (req: Request) => {
      // Skip for health checks and monitoring
      if (req.path.startsWith('/health') || req.path.startsWith('/monitoring')) {
        return true;
      }
      return false;
    }
  });
};

// Rate limiting middleware for different user tiers
export const userTierRateLimits = {
  // Free tier users
  free: createAdvancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id;
      return userId ? `free:${userId}` : `free:${req.ip}`;
    }
  }),

  // Premium tier users
  premium: createAdvancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 minutes
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id;
      return userId ? `premium:${userId}` : `premium:${req.ip}`;
    }
  }),

  // Enterprise tier users
  enterprise: createAdvancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id;
      return userId ? `enterprise:${userId}` : `enterprise:${req.ip}`;
    }
  })
};

// Rate limiting for specific operations
export const operationRateLimits = {
  // Bus assignment operations
  busAssignment: createAdvancedRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 assignments per 5 minutes
    message: 'Too many bus assignment operations. Please slow down.'
  }),

  // Route creation operations
  routeCreation: createAdvancedRateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // 10 route creations per 10 minutes
    message: 'Too many route creation operations. Please slow down.'
  }),

  // Driver registration operations
  driverRegistration: createAdvancedRateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 5, // 5 driver registrations per 30 minutes
    message: 'Too many driver registration attempts. Please wait.'
  }),

  // Location updates
  locationUpdate: createAdvancedRateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 location updates per minute
    message: 'Too many location updates. Please reduce frequency.'
  })
};

// Export default rate limiting configuration
export const defaultRateLimit = apiRateLimits.general;

// Rate limiting statistics and monitoring
export const getRateLimitStats = () => {
  return {
    limits: {
      general: { windowMs: 15 * 60 * 1000, max: 1000 },
      auth: { windowMs: 15 * 60 * 1000, max: 5 },
      assignments: { windowMs: 5 * 60 * 1000, max: 50 },
      locations: { windowMs: 1 * 60 * 1000, max: 100 },
      admin: { windowMs: 5 * 60 * 1000, max: 20 },
      upload: { windowMs: 10 * 60 * 1000, max: 10 }
    },
    userTiers: {
      free: { windowMs: 15 * 60 * 1000, max: 100 },
      premium: { windowMs: 15 * 60 * 1000, max: 500 },
      enterprise: { windowMs: 15 * 60 * 1000, max: 1000 }
    }
  };
};
