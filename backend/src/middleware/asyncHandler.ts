import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * AsyncHandler wrapper to catch errors in async route handlers
 * Automatically passes errors to the error handling middleware
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Async handler error', 'asyncHandler', {
        method: req.method,
        url: req.originalUrl,
        error: error.message
      }, error, req);
      next(error);
    });
  };
};

/**
 * AsyncHandler for WebSocket event handlers
 */
export const asyncWebSocketHandler = (fn: (socket: any, data: any) => Promise<any>) => {
  return (socket: any, data: any) => {
    Promise.resolve(fn(socket, data)).catch((error) => {
      logger.error('WebSocket async handler error', 'websocket', {
        socketId: socket.id,
        event: socket.event,
        error: error.message
      }, error);
      socket.emit('error', {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    });
  };
};

/**
 * AsyncHandler for database operations
 */
export const asyncDbHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Database operation error', 'database', {
        method: req.method,
        url: req.originalUrl,
        error: error.message
      }, error, req);
      next(error);
    });
  };
};

/**
 * AsyncHandler for external API calls
 */
export const asyncApiHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('External API call error', 'api', {
        method: req.method,
        url: req.originalUrl,
        error: error.message
      }, error, req);
      next(error);
    });
  };
};

/**
 * AsyncHandler for file operations
 */
export const asyncFileHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('File operation error', 'file', {
        method: req.method,
        url: req.originalUrl,
        error: error.message
      }, error, req);
      next(error);
    });
  };
};

/**
 * AsyncHandler for authentication operations
 */
export const asyncAuthHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Authentication error', 'auth', {
        method: req.method,
        url: req.originalUrl,
        error: error.message
      }, error, req);
      next(error);
    });
  };
};

/**
 * AsyncHandler for location operations
 */
export const asyncLocationHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Location operation error', 'location', {
        method: req.method,
        url: req.originalUrl,
        error: error.message
      }, error, req);
      next(error);
    });
  };
};

/**
 * AsyncHandler for bus operations
 */
export const asyncBusHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Bus operation error', 'bus', {
        method: req.method,
        url: req.originalUrl,
        error: error.message
      }, error, req);
      next(error);
    });
  };
};

/**
 * AsyncHandler for route operations
 */
export const asyncRouteHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Route operation error', 'route', {
        method: req.method,
        url: req.originalUrl,
        error: error.message
      }, error, req);
      next(error);
    });
  };
};

/**
 * AsyncHandler for admin operations
 */
export const asyncAdminHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Admin operation error', 'admin', {
        method: req.method,
        url: req.originalUrl,
        error: error.message
      }, error, req);
      next(error);
    });
  };
};
