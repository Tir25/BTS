import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Passthrough middleware - rate limiting disabled for high-volume traffic
const passthroughMiddleware = (req: Request, res: Response, next: NextFunction) => {
  next();
};

// Enhanced rate limiting configuration - all disabled
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
  // Return passthrough middleware - rate limiting disabled
  return passthroughMiddleware;
};

// API endpoint specific rate limits - all disabled
export const apiRateLimits = {
  // General API rate limiting - disabled
  general: passthroughMiddleware,

  // Authentication endpoints - disabled
  auth: passthroughMiddleware,

  // Assignment endpoints - disabled
  assignments: passthroughMiddleware,

  // Location endpoints - disabled
  locations: passthroughMiddleware,

  // Admin endpoints - disabled
  admin: passthroughMiddleware,

  // File upload endpoints - disabled
  upload: passthroughMiddleware,

  // WebSocket connection limits - disabled
  websocket: passthroughMiddleware,

  // Analytics and reporting - disabled
  analytics: passthroughMiddleware,

  // Development endpoints - disabled
  development: passthroughMiddleware
};

// Dynamic rate limiting - disabled
export const createDynamicRateLimit = (baseLimit: number) => {
  return passthroughMiddleware;
};

// Rate limiting middleware for different user tiers - all disabled
export const userTierRateLimits = {
  // Free tier users - disabled
  free: passthroughMiddleware,

  // Premium tier users - disabled
  premium: passthroughMiddleware,

  // Enterprise tier users - disabled
  enterprise: passthroughMiddleware
};

// Rate limiting for specific operations - all disabled
export const operationRateLimits = {
  // Bus assignment operations - disabled
  busAssignment: passthroughMiddleware,

  // Route creation operations - disabled
  routeCreation: passthroughMiddleware,

  // Driver registration operations - disabled
  driverRegistration: passthroughMiddleware,

  // Location updates - disabled
  locationUpdate: passthroughMiddleware
};

// Export default rate limiting configuration - disabled
export const defaultRateLimit = passthroughMiddleware;

// Rate limiting statistics and monitoring - returns empty stats
export const getRateLimitStats = () => {
  return {
    limits: {
      general: { windowMs: 0, max: 0 },
      auth: { windowMs: 0, max: 0 },
      assignments: { windowMs: 0, max: 0 },
      locations: { windowMs: 0, max: 0 },
      admin: { windowMs: 0, max: 0 },
      upload: { windowMs: 0, max: 0 }
    },
    userTiers: {
      free: { windowMs: 0, max: 0 },
      premium: { windowMs: 0, max: 0 },
      enterprise: { windowMs: 0, max: 0 }
    },
    note: 'Rate limiting is disabled - system configured for high-volume traffic'
  };
};
