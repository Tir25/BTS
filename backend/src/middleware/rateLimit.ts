import rateLimit from 'express-rate-limit';

// Validate rate limit configuration
const validateRateLimitConfig = () => {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
  const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  
  if (isNaN(windowMs) || windowMs < 60000) {
    throw new Error('Invalid RATE_LIMIT_WINDOW_MS: must be at least 60000ms (1 minute)');
  }
  if (isNaN(max) || max < 1) {
    throw new Error('Invalid RATE_LIMIT_MAX_REQUESTS: must be at least 1');
  }
  
  return { windowMs, max };
};

const { windowMs, max } = validateRateLimitConfig();

export const rateLimitMiddleware = rateLimit({
  windowMs, // 15 minutes
  max, // limit each IP to 100 requests per windowMs
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
    // Skip rate limiting in development for certain paths
    if (process.env.NODE_ENV === 'development' && req.path.startsWith('/admin'))
      return false;
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
