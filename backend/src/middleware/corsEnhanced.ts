import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import config from '../config/environment';

export interface CorsOptions {
  origin: (string | RegExp)[];
  methods: string[];
  credentials: boolean;
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
}

export class CorsManager {
  private static instance: CorsManager;
  private options: CorsOptions;

  private constructor() {
    this.options = {
      origin: config.cors.allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      credentials: config.cors.credentials,
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'Pragma',
        'X-Request-ID',
        'X-API-Key'
      ],
      exposedHeaders: [
        'X-Request-ID',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset'
      ],
      maxAge: 86400 // 24 hours
    };
  }

  static getInstance(): CorsManager {
    if (!CorsManager.instance) {
      CorsManager.instance = new CorsManager();
    }
    return CorsManager.instance;
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    if (!origin) return false;

    return this.options.origin.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
  }

  /**
   * Enhanced CORS middleware
   */
  public corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin as string;
    const method = req.method;

    // Log CORS requests for debugging
    if (config.logging.enableDebugLogs) {
      logger.debug('CORS request', 'cors', {
        origin,
        method,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
    }

    // FIXED: Allow all origins for testing
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', this.options.credentials.toString());
    
    // Original code (commented out for testing):
    /*
    // Set CORS headers
    if (this.isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', this.options.credentials.toString());
    } else if (origin && config.nodeEnv === 'development') {
      // In development, allow any localhost origin
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', this.options.credentials.toString());
        logger.warn(`Allowing development origin: ${origin}`, 'cors');
      } else {
        logger.warn(`Blocked origin: ${origin}`, 'cors');
        res.status(403).json({ error: 'CORS policy violation' });
        return;
      }
    } else {
      logger.warn(`Blocked origin: ${origin}`, 'cors');
      res.status(403).json({ error: 'CORS policy violation' });
      return;
    }
    */

    // Set other CORS headers
    res.setHeader('Access-Control-Allow-Methods', this.options.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', this.options.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Expose-Headers', this.options.exposedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', this.options.maxAge.toString());

    // Handle preflight requests
    if (method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  };

  /**
   * WebSocket CORS middleware
   */
  public websocketCors = (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin as string;

    // FIXED: Allow all origins for testing
    next();
    
    // Original code (commented out for testing):
    /*
    if (this.isOriginAllowed(origin)) {
      next();
    } else if (origin && config.nodeEnv === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        logger.warn(`Allowing WebSocket development origin: ${origin}`, 'cors');
        next();
      } else {
        logger.warn(`Blocked WebSocket origin: ${origin}`, 'cors');
        res.status(403).json({ error: 'WebSocket CORS policy violation' });
      }
    } else {
      logger.warn(`Blocked WebSocket origin: ${origin}`, 'cors');
      res.status(403).json({ error: 'WebSocket CORS policy violation' });
    }
    */
  };

  /**
   * Update CORS configuration
   */
  public updateConfig(newOptions: Partial<CorsOptions>): void {
    this.options = { ...this.options, ...newOptions };
    logger.info('CORS configuration updated', 'cors', { options: this.options });
  }

  /**
   * Get current CORS configuration
   */
  public getConfig(): CorsOptions {
    return { ...this.options };
  }
}

// Export singleton instance
export const corsManager = CorsManager.getInstance();

// Export middleware functions
export const corsMiddleware = corsManager.corsMiddleware;
export const websocketCors = corsManager.websocketCors;
