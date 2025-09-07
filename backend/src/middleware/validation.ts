/**
 * Validation Middleware for Express Routes
 * Following the Coding Standards & Best Practices Guide
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Generic validation middleware factory
 */
export const validate = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query) as any;
      }

      // Validate route parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params) as any;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          'Request validation failed',
          {
            errors: error.issues.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
              received: err.received,
            })),
            receivedData: {
              body: req.body,
              query: req.query,
              params: req.params,
            },
          }
        );
        return next(validationError);
      }
      next(error);
    }
  };
};

/**
 * Validate request body only
 */
export const validateBody = (schema: ZodSchema) => {
  return validate({ body: schema });
};

/**
 * Validate query parameters only
 */
export const validateQuery = (schema: ZodSchema) => {
  return validate({ query: schema });
};

/**
 * Validate route parameters only
 */
export const validateParams = (schema: ZodSchema) => {
  return validate({ params: schema });
};

/**
 * Sanitize input data to prevent XSS and other attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: string): string => {
    return str
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize route parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Rate limiting validation for specific endpoints
 */
export const validateRateLimit = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();

    // Clean up old entries
    for (const [id, data] of requests.entries()) {
      if (data.resetTime < now) {
        requests.delete(id);
      }
    }

    // Get or create client data
    let clientData = requests.get(clientId);
    if (!clientData || clientData.resetTime < now) {
      clientData = { count: 0, resetTime: now + windowMs };
      requests.set(clientId, clientData);
    }

    // Check rate limit
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: {
          name: 'RateLimitError',
          message: 'Too many requests',
          statusCode: 429,
          timestamp: new Date().toISOString(),
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        },
      });
    }

    // Increment counter
    clientData.count++;
    return next();
  };
};

/**
 * Validate file uploads
 */
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/gif'], required = false } = options;

    if (required && (!req.file && !req.files)) {
      return res.status(400).json({
        error: {
          name: 'ValidationError',
          message: 'File upload is required',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : (req.file ? [req.file] : []);

    for (const file of files) {
      // Check file size
      if ((file as any).size > maxSize) {
        return res.status(400).json({
          error: {
            name: 'ValidationError',
            message: `File size exceeds maximum allowed size of ${maxSize} bytes`,
            statusCode: 400,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Check file type
      if (!allowedTypes.includes((file as any).mimetype)) {
        return res.status(400).json({
          error: {
            name: 'ValidationError',
            message: `File type ${(file as any).mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
            statusCode: 400,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    return next();
  };
};
