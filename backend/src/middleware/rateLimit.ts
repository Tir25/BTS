import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../config/environment';
import { logger } from '../utils/logger';

// PRODUCTION FIX: Enhanced rate limit configuration check
const isRateLimitDisabled = () => {
  const disabled = process.env.DISABLE_RATE_LIMIT &&
    process.env.DISABLE_RATE_LIMIT.toLowerCase() === 'true';
  
  if (disabled) {
    logger.debug('Rate limiting is disabled via environment variable', 'rate-limit');
  }
  
  return disabled;
};

// General rate limiter (enabled in production unless disabled)
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests',
    code: 'RATE_LIMITED'
  }
});

// Stricter rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts',
    code: 'AUTH_RATE_LIMITED'
  },
  keyGenerator: (req: Request) => {
    // Prefer user identifier if available, otherwise IP
    const authHeader = req.headers.authorization || '';
    return authHeader ? `auth:${authHeader.slice(0, 24)}` : `ip:${req.ip}`;
  }
});

// PRODUCTION FIX: Enhanced rate limiting with better logging
export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (isRateLimitDisabled() || !config.security.enableRateLimit) {
    return next();
  }

  // PRODUCTION FIX: Apply rate limiting in production, log in development
  if (process.env.NODE_ENV === 'production') {
    return generalLimiter(req, res, next);
  }
  
  // In development, log but don't enforce (for easier testing)
  logger.debug('Rate limiting would apply in production', 'rate-limit', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  next();
};

export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
  if (isRateLimitDisabled() || !config.security.enableRateLimit) {
    return next();
  }

  if (process.env.NODE_ENV === 'production') {
    return authLimiter(req, res, next);
  }
  next();
};
