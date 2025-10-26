import rateLimit from 'express-rate-limit';

export const rateLimitMiddleware = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // Increased to 1000 requests per windowMs for development
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(
      parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000 / 60
    ), // minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  // More lenient for development
  skip: (req) => {
    // Skip rate limiting for health checks
    if (req.path.startsWith('/health')) return true;
    // Skip rate limiting in development for admin endpoints
    if (process.env.NODE_ENV === 'development' && req.path.startsWith('/admin'))
      return true;
    // Skip rate limiting for analytics in development
    if (process.env.NODE_ENV === 'development' && req.path.includes('/analytics'))
      return true;
    return false;
  },
});

// Stricter rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: 15, // minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false,
});
