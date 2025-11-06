import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { logger } from '../utils/logger';

// Enhanced security middleware
export const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

// Advanced rate limiting - DISABLED for high-volume traffic
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  // Return passthrough middleware - no rate limiting
  return (req: Request, res: Response, next: NextFunction) => {
    next();
  };
};

// API rate limiting - DISABLED
export const apiRateLimit = (req: Request, res: Response, next: NextFunction) => {
  next();
};
export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
  next();
};
export const uploadRateLimit = (req: Request, res: Response, next: NextFunction) => {
  next();
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.includes(clientIP || '')) {
      next();
    } else {
      logger.warn('IP not whitelisted', 'security', { ip: clientIP });
      res.status(403).json({ error: 'Access denied' });
    }
  };
};

// Request validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i
  ];
  
  const requestBody = JSON.stringify(req.body);
  const requestQuery = JSON.stringify(req.query);
  const requestParams = JSON.stringify(req.params);
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestBody) || pattern.test(requestQuery) || pattern.test(requestParams)) {
      logger.warn('Suspicious request detected', 'security', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query
      });
      return res.status(400).json({ error: 'Invalid request' });
    }
  }
  
  next();
};

// CORS security enhancement
export const corsSecurity = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin');
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  next();
};
