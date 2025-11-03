import { Socket } from 'socket.io';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

// Extend global type to include authAttemptStore
declare global {
  // eslint-disable-next-line no-var
  var authAttemptStore: Map<string, { count: number; resetTime: number }> | undefined;
}

interface AuthenticatedSocket extends Socket {
  driverId?: string;
  busId?: string;
  userId?: string;
  userRole?: string;
  isAuthenticated?: boolean;
  lastActivity?: number;
}

/**
 * Enhanced WebSocket authentication middleware with comprehensive security
 * Validates JWT token and attaches user information to socket
 */
export const websocketAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token;
  const clientType = socket.handshake.auth.clientType || 'student';
  const clientIP = socket.handshake.address;
  const userAgent = socket.handshake.headers['user-agent'];
  
  // Enhanced logging for security monitoring
  logger.websocket('WebSocket connection attempt', { 
    socketId: socket.id, 
    clientType,
    clientIP, 
    userAgent: userAgent?.substring(0, 100) // Truncate for security
  });
  
  // 🚨 SECURITY FIX: Controlled anonymous access with enhanced monitoring
  if (!token && clientType === 'student') {
    // Check if anonymous access is allowed (dev mode compatible)
    const allowAnonymous = process.env.ALLOW_ANONYMOUS_STUDENTS === 'true';
    
    if (!allowAnonymous && process.env.NODE_ENV === 'production') {
      logger.websocket('Anonymous student connection rejected in production', { 
        socketId: socket.id, 
        clientType,
        clientIP
      });
      return next(new Error('Authentication required in production mode'));
    }
    
    logger.websocket('Anonymous student connection allowed (dev mode compatible)', { 
      socketId: socket.id, 
      clientType,
      clientIP,
      allowAnonymous,
      nodeEnv: process.env.NODE_ENV
    });
    
    // Set basic info for student connections with enhanced security
    socket.userId = `anonymous-student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    socket.userRole = 'student';
    socket.isAuthenticated = false;
    socket.lastActivity = Date.now();
    
    return next();
  }
  
  // Require authentication for drivers and admin
  if (!token) {
    logger.websocket('No authentication token provided for privileged connection', { 
      socketId: socket.id, 
      clientType,
      clientIP,
      userAgent: userAgent?.substring(0, 100)
    });
    return next(new Error('Authentication token required'));
  }

  // Enhanced token format validation
  if (typeof token !== 'string' || token.length < 20) {
    logger.websocket('Invalid token format', { 
      socketId: socket.id, 
      tokenLength: token?.length || 0,
      clientIP
    });
    return next(new Error('Invalid token format'));
  }

  // 🚨 SECURITY FIX: Server-side rate limiting for authentication attempts
  const rateLimitKey = `auth_attempts_${clientIP}`;
  const maxAttempts = parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5');
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
  
  // In a production environment, this would use Redis or another distributed cache
  // For now, using a simple in-memory store (should be replaced with Redis)
  const authAttempts = global.authAttemptStore || (global.authAttemptStore = new Map<string, { count: number; resetTime: number }>());
  const now = Date.now();
  const attempts = authAttempts.get(rateLimitKey) || { count: 0, resetTime: now + windowMs };
  
  if (now > attempts.resetTime) {
    // Reset the counter if the window has expired
    attempts.count = 0;
    attempts.resetTime = now + windowMs;
  }
  
  if (attempts.count >= maxAttempts) {
    logger.websocket('Too many authentication attempts from IP', { 
      socketId: socket.id, 
      attempts: attempts.count,
      clientIP,
      resetTime: new Date(attempts.resetTime).toISOString()
    });
    return next(new Error('Too many authentication attempts. Please try again later.'));
  }
  
  // Increment attempt counter
  attempts.count++;
  authAttempts.set(rateLimitKey, attempts);

  // Validate token with Supabase with timeout
  const authTimeout = setTimeout(() => {
    logger.websocket('Authentication timeout', { socketId: socket.id, clientIP });
    next(new Error('Authentication timeout'));
  }, 10000); // 10 second timeout

  supabaseAdmin.auth.getUser(token)
    .then(({ data: { user }, error }) => {
      clearTimeout(authTimeout);
      
      if (error || !user) {
        logger.websocket('Token validation failed', { 
          socketId: socket.id, 
          error: error?.message,
          clientIP
        });
        return next(new Error('Invalid authentication token'));
      }

      // Enhanced user validation
      if (!user.id || !user.email) {
        logger.websocket('Invalid user data', { 
          socketId: socket.id, 
          userId: user.id,
          clientIP
        });
        return next(new Error('Invalid user data'));
      }

      // Check if user email is verified in production
      if (!user.email_confirmed_at && process.env.NODE_ENV === 'production') {
        logger.websocket('User email not verified', { 
          socketId: socket.id, 
          email: user.email,
          clientIP
        });
        return next(new Error('Email not verified'));
      }

      // Get user profile from user_profiles table with enhanced error handling
      return supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, role, is_active, last_login')
        .eq('id', user.id)
        .single()
        .then(({ data: profile, error: profileError }) => {
          if (profileError || !profile) {
            logger.websocket('User profile not found', { 
              socketId: socket.id, 
              email: user.email,
              error: profileError?.message,
              clientIP
            }, profileError);
            return next(new Error('User profile not found'));
          }

          // Check if user account is active
          if (profile.is_active === false) {
            logger.websocket('Inactive user account', { 
              socketId: socket.id, 
              email: user.email,
              clientIP
            });
            return next(new Error('Account is inactive'));
          }

          // Enhanced admin email validation
          const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(
            (email: string) => email.trim().toLowerCase()
          ) || [];

          if (adminEmails.length === 0) {
            logger.error('ADMIN_EMAILS environment variable is required', 'websocket', { 
              socketId: socket.id,
              clientIP
            });
            return next(new Error('Server configuration error'));
          }

          const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
          const role = isAdmin ? 'admin' : profile.role;

          // Validate role
          if (!['admin', 'driver', 'student'].includes(role)) {
            logger.websocket('Invalid user role', { 
              socketId: socket.id, 
              role,
              clientIP
            });
            return next(new Error('Invalid user role'));
          }

          // Attach user data to socket with enhanced security
          socket.userId = profile.id;
          socket.userRole = role;
          socket.isAuthenticated = true;
          socket.lastActivity = Date.now();

          // Update last login time (fire and forget)
          (async () => {
            try {
              await supabaseAdmin
                .from('user_profiles')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id);
              logger.debug('Last login updated', 'websocket', { userId: user.id });
            } catch (updateError: any) {
              logger.warn('Failed to update last login', 'websocket', { 
                userId: user.id, 
                error: updateError?.message 
              });
            }
          })();

          logger.websocket('User authenticated successfully', { 
            socketId: socket.id, 
            email: user.email, 
            role,
            clientIP,
            fullName: profile.full_name
          });
          next();
        });
    })
    .catch((error) => {
      clearTimeout(authTimeout);
      logger.error('WebSocket authentication error', 'websocket', { 
        socketId: socket.id, 
        error: error?.message,
        clientIP
      }, error);
      next(new Error('Authentication failed'));
    });
};

/**
 * WebSocket driver authentication middleware
 * Validates that the authenticated user has driver role
 */
export const websocketDriverAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  if (!socket.isAuthenticated || !socket.userRole) {
    logger.websocket('Driver authentication required', { socketId: socket.id });
    return next(new Error('Driver authentication required'));
  }

  if (socket.userRole !== 'driver' && socket.userRole !== 'admin') {
    logger.websocket('Driver role required', { socketId: socket.id, actualRole: socket.userRole });
    return next(new Error('Driver role required'));
  }

  next();
};

/**
 * WebSocket student authentication middleware
 * Validates that the authenticated user has student role
 */
export const websocketStudentAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  if (!socket.isAuthenticated || !socket.userRole) {
    logger.websocket('Student authentication required', { socketId: socket.id });
    return next(new Error('Student authentication required'));
  }

  if (socket.userRole !== 'student' && socket.userRole !== 'admin') {
    logger.websocket('Student role required', { socketId: socket.id, actualRole: socket.userRole });
    return next(new Error('Student role required'));
  }

  next();
};

/**
 * WebSocket admin authentication middleware
 * Validates that the authenticated user has admin role
 */
export const websocketAdminAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  if (!socket.isAuthenticated || !socket.userRole) {
    logger.websocket('Admin authentication required', { socketId: socket.id });
    return next(new Error('Admin authentication required'));
  }

  if (socket.userRole !== 'admin') {
    logger.websocket('Admin role required', { socketId: socket.id, actualRole: socket.userRole });
    return next(new Error('Admin role required'));
  }

  next();
};
