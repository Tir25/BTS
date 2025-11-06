import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { logger } from '../utils/logger';
import config from '../config/environment';

export interface SecurityConfig {
  enableHelmet: boolean;
  enableCors: boolean;
  enableRateLimit: boolean;
  enableRequestValidation: boolean;
  enableSecurityHeaders: boolean;
  maxRequestSize: number;
  allowedFileTypes: string[];
  maxFileSize: number;
}

export class SecurityManager {
  private static instance: SecurityManager;
  private config: SecurityConfig;

  private constructor() {
    this.config = {
      enableHelmet: config.security.enableHelmet,
      enableCors: config.security.enableCors,
      enableRateLimit: config.security.enableRateLimit,
      enableRequestValidation: true,
      enableSecurityHeaders: true,
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxFileSize: 5 * 1024 * 1024 // 5MB
    };
  }

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Enhanced Helmet configuration
   */
  public getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "ws:", "wss:", "https:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: []
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    });
  }

  /**
   * Enhanced rate limiting - DISABLED for high-volume traffic
   */
  public getRateLimitConfig() {
    // Return passthrough middleware - no rate limiting
    return (req: Request, res: Response, next: NextFunction) => {
      next();
    };
  }

  /**
   * Authentication rate limiting - DISABLED for high-volume traffic
   */
  public getAuthRateLimitConfig() {
    // Return passthrough middleware - no rate limiting
    return (req: Request, res: Response, next: NextFunction) => {
      next();
    };
  }

  /**
   * Request size validation
   */
  public requestSizeValidator = (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > this.config.maxRequestSize) {
      logger.warn('Request size exceeded', 'security', {
        contentLength,
        maxSize: this.config.maxRequestSize,
        ip: req.ip,
        path: req.path
      });
      
      res.status(413).json({
        error: 'Request entity too large',
        maxSize: this.config.maxRequestSize
      });
      return;
    }

    next();
  };

  /**
   * Request validation middleware
   */
  public requestValidator = (req: Request, res: Response, next: NextFunction): void => {
    // Validate request method
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    if (!allowedMethods.includes(req.method)) {
      logger.warn('Invalid request method', 'security', {
        method: req.method,
        ip: req.ip,
        path: req.path
      });
      
      res.status(405).json({
        error: 'Method not allowed',
        allowedMethods
      });
      return;
    }

    // Validate content type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'];
      const allowedContentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data'
      ];

      if (contentType && !allowedContentTypes.some(type => contentType.includes(type))) {
        logger.warn('Invalid content type', 'security', {
          contentType,
          ip: req.ip,
          path: req.path
        });
        
        res.status(415).json({
          error: 'Unsupported media type',
          allowedContentTypes
        });
        return;
      }
    }

    next();
  };

  /**
   * Security headers middleware
   */
  public securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
    // Remove server header
    res.removeHeader('X-Powered-By');
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Add request ID for tracking
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', requestId);
    
    next();
  };

  /**
   * File upload validation
   */
  public fileUploadValidator = (req: Request, res: Response, next: NextFunction): void => {
    if (req.file) {
      // Validate file type
      if (!this.config.allowedFileTypes.includes(req.file.mimetype)) {
        logger.warn('Invalid file type uploaded', 'security', {
          mimetype: req.file.mimetype,
          allowedTypes: this.config.allowedFileTypes,
          ip: req.ip
        });
        
        res.status(400).json({
          error: 'Invalid file type',
          allowedTypes: this.config.allowedFileTypes
        });
        return;
      }

      // Validate file size
      if (req.file.size > this.config.maxFileSize) {
        logger.warn('File size exceeded', 'security', {
          fileSize: req.file.size,
          maxSize: this.config.maxFileSize,
          ip: req.ip
        });
        
        res.status(400).json({
          error: 'File too large',
          maxSize: this.config.maxFileSize
        });
        return;
      }
    }

    next();
  };

  /**
   * IP whitelist middleware (for admin endpoints)
   */
  public ipWhitelist = (allowedIPs: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (!allowedIPs.includes(clientIP || '')) {
        logger.warn('IP not in whitelist', 'security', {
          ip: clientIP,
          allowedIPs,
          path: req.path
        });
        
        res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is not authorized'
        });
        return;
      }

      next();
    };
  };

  /**
   * Update security configuration
   */
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Security configuration updated', 'security', { config: this.config });
  }

  /**
   * Get current security configuration
   */
  public getConfig(): SecurityConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance();

// Export middleware functions
export const requestSizeValidator = securityManager.requestSizeValidator;
export const requestValidator = securityManager.requestValidator;
export const securityHeaders = securityManager.securityHeaders;
export const fileUploadValidator = securityManager.fileUploadValidator;
export const ipWhitelist = securityManager.ipWhitelist;
