import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../config/environment';

const isRateLimitDisabled = () =>
  process.env.DISABLE_RATE_LIMIT &&
  process.env.DISABLE_RATE_LIMIT.toLowerCase() === 'true';

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

export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (isRateLimitDisabled() || !config.security.enableRateLimit) {
    return next();
  }

  if (process.env.NODE_ENV === 'production') {
    return generalLimiter(req, res, next);
  }
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
