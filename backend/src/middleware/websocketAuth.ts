import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { getAdminEmails } from './authUtils';
import { AuthenticatedSocket } from '../websocket/socketTypes';

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
  
  // Anonymous student access policy
  // In production: disallowed by default unless ALLOW_ANONYMOUS_STUDENTS=true
  // In development: allowed by default for convenience
  if (!token && clientType === 'student') {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowAnonymous = process.env.ALLOW_ANONYMOUS_STUDENTS === 'true';

    if (isProduction && !allowAnonymous) {
      logger.websocket('Anonymous student connection rejected by default policy (production)', { 
        socketId: socket.id, 
        clientType,
        clientIP
      });
      return next(new Error('Authentication required for student connections'));
    }
    
    logger.websocket('Anonymous student connection allowed (read-only map access)', { 
      socketId: socket.id, 
      clientType,
      clientIP,
      nodeEnv: process.env.NODE_ENV,
      note: 'Anonymous students can view bus locations but cannot send updates'
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
    const errorMsg = 'Authentication token required';
    logger.websocket('No authentication token provided for privileged connection', { 
      socketId: socket.id, 
      clientType,
      clientIP,
      userAgent: userAgent?.substring(0, 100),
      authProvided: !!socket.handshake.auth.token,
      authKeys: Object.keys(socket.handshake.auth || {}),
    });
    // PRODUCTION FIX: Send detailed error to client
    const error = new Error(errorMsg);
    (error as any).code = 'AUTH_TOKEN_REQUIRED';
    (error as any).clientType = clientType;
    return next(error);
  }

  // Enhanced token format validation
  if (typeof token !== 'string' || token.length < 20) {
    const errorMsg = 'Invalid token format';
    logger.websocket('Invalid token format', { 
      socketId: socket.id, 
      tokenLength: token?.length || 0,
      tokenType: typeof token,
      clientIP,
      clientType,
    });
    // PRODUCTION FIX: Send detailed error to client
    const error = new Error(errorMsg);
    (error as any).code = 'AUTH_TOKEN_INVALID';
    (error as any).clientType = clientType;
    (error as any).reason = 'Token format invalid or too short';
    return next(error);
  }

  // Rate limiting disabled - system configured for high-volume traffic
  // Authentication attempts are no longer rate limited

  // Validate token with Supabase with timeout
  const authTimeout = setTimeout(() => {
    logger.websocket('Authentication timeout', { socketId: socket.id, clientIP });
    next(new Error('Authentication timeout'));
  }, 10000); // 10 second timeout

  supabaseAdmin.auth.getUser(token)
    .then(({ data: { user }, error }) => {
      clearTimeout(authTimeout);
      
      if (error || !user) {
        const errorMsg = error?.message || 'Invalid authentication token';
        logger.websocket('Token validation failed', { 
          socketId: socket.id, 
          error: errorMsg,
          errorCode: error?.status,
          clientIP,
          clientType,
          tokenLength: token?.length || 0,
        });
        // PRODUCTION FIX: Send detailed error to client
        const authError = new Error(errorMsg);
        (authError as any).code = 'AUTH_TOKEN_INVALID';
        (authError as any).originalError = error?.message;
        return next(authError);
      }

      // Enhanced user validation
      if (!user.id || !user.email) {
        const errorMsg = 'Invalid user data';
        logger.websocket('Invalid user data', { 
          socketId: socket.id, 
          userId: user.id,
          userEmail: user.email,
          clientIP,
          clientType,
        });
        // PRODUCTION FIX: Send detailed error to client
        const error = new Error(errorMsg);
        (error as any).code = 'AUTH_USER_INVALID';
        (error as any).clientType = clientType;
        return next(error);
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
            const errorMsg = 'User profile not found';
            logger.websocket('User profile not found', { 
              socketId: socket.id, 
              email: user.email,
              userId: user.id,
              error: profileError?.message,
              errorCode: profileError?.code,
              clientIP,
              clientType,
            }, profileError);
            // PRODUCTION FIX: Send detailed error to client
            const error = new Error(errorMsg);
            (error as any).code = 'AUTH_PROFILE_NOT_FOUND';
            (error as any).clientType = clientType;
            (error as any).originalError = profileError?.message;
            return next(error);
          }

          // Check if user account is active
          if (profile.is_active === false) {
            const errorMsg = 'Account is inactive';
            logger.websocket('Inactive user account', { 
              socketId: socket.id, 
              email: user.email,
              userId: user.id,
              clientIP,
              clientType,
            });
            // PRODUCTION FIX: Send detailed error to client
            const error = new Error(errorMsg);
            (error as any).code = 'AUTH_ACCOUNT_INACTIVE';
            (error as any).clientType = clientType;
            return next(error);
          }

      // Enhanced admin email validation
      const adminEmails = getAdminEmails();
      if (adminEmails.length === 0) {
        const errorMsg = 'Server configuration error';
        logger.error('Admin emails configuration missing', 'websocket', {
          socketId: socket.id,
          clientIP,
          clientType,
        });
        const error = new Error(errorMsg);
        (error as any).code = 'SERVER_CONFIG_ERROR';
        (error as any).clientType = clientType;
        return next(error);
      }

          const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
          const role = isAdmin ? 'admin' : profile.role;

          // Validate role
          if (!['admin', 'driver', 'student'].includes(role)) {
            const errorMsg = `Invalid user role: ${role}`;
            logger.websocket('Invalid user role', { 
              socketId: socket.id, 
              role,
              email: user.email,
              userId: user.id,
              clientIP,
              clientType,
            });
            // PRODUCTION FIX: Send detailed error to client
            const error = new Error(errorMsg);
            (error as any).code = 'AUTH_INVALID_ROLE';
            (error as any).clientType = clientType;
            (error as any).role = role;
            return next(error);
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
      const errorMsg = error?.message || 'Authentication failed';
      logger.error('WebSocket authentication error', 'websocket', { 
        socketId: socket.id, 
        error: errorMsg,
        errorStack: error?.stack,
        clientIP,
        clientType,
        tokenProvided: !!token,
        tokenLength: token?.length || 0,
      }, error);
      // PRODUCTION FIX: Send detailed error to client
      const authError = new Error(errorMsg);
      (authError as any).code = 'AUTH_FAILED';
      (authError as any).originalError = error?.message;
      next(authError);
    });
};

/**
 * WebSocket driver authentication middleware
 * Validates that the authenticated user has driver role
 * 
 * NOTE: Currently unused but kept for potential future use if granular per-event authentication is needed
 * The main websocketAuthMiddleware handles all authentication at connection time
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
 * 
 * NOTE: Currently unused but kept for potential future use if granular per-event authentication is needed
 * The main websocketAuthMiddleware handles all authentication at connection time
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
 * 
 * NOTE: Currently unused but kept for potential future use if granular per-event authentication is needed
 * The main websocketAuthMiddleware handles all authentication at connection time
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
