import rateLimit from 'express-rate-limit';

export const rateLimitMiddleware = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5000'), // limit each IP to 5000 requests per windowMs
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
  skip: req => {
    // Skip rate limiting for health checks
    if (req.path.startsWith('/health')) return true;
    // Skip rate limiting in development for certain paths
    if (process.env.NODE_ENV === 'development' && req.path.startsWith('/admin'))
      return false;
    return false;
  },
});
