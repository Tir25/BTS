import { Request, Response, NextFunction } from 'express';

// Rate limiting disabled - passthrough middleware for high-volume traffic
export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Passthrough - no rate limiting
  next();
};

// Stricter rate limiting for authentication endpoints - disabled
export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Passthrough - no rate limiting
  next();
};
