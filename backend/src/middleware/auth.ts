import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

// Extend Express Request interface to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        full_name?: string;
      };
    }
  }
}

// Authentication middleware
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.auth('Missing or invalid Authorization header', {
        hasHeader: !!authHeader,
        headerType: authHeader ? 'not-bearer' : 'none'
      }, undefined, req);
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Bearer token is required. Please log in again.',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token format
    if (!token || token.length < 10) {
      logger.auth('Invalid token format', { tokenLength: token?.length || 0 }, undefined, req);
      res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token format is invalid. Please log in again.',
        code: 'INVALID_TOKEN_FORMAT',
      });
      return;
    }

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      logger.auth('Token validation failed', {
        error: error?.message || 'No user found'
      }, error || undefined, req);
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Authentication failed. Please log in again.',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Check if user email is verified (optional but recommended)
    if (!user.email_confirmed_at && process.env.NODE_ENV === 'production') {
      logger.auth('User email not verified', { email: user.email }, undefined, req);
      res.status(401).json({
        success: false,
        error: 'Email not verified',
        message:
          'Please verify your email address before accessing this resource.',
        code: 'EMAIL_NOT_VERIFIED',
      });
      return;
    }

    // Get user profile from user_profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.auth('User profile not found', { email: user.email }, profileError, req);

      // SECURITY FIX: Don't automatically assign admin role
      // Users without profiles should be denied access
      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'User profile not found. Please contact administrator.',
        code: 'PROFILE_NOT_FOUND',
      });
      return;
    }

    // SECURITY FIX: Remove hardcoded admin email and use environment variables only
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(
      (email: string) => email.trim().toLowerCase()
    ) || [];

    if (adminEmails.length === 0) {
      logger.error('ADMIN_EMAILS environment variable is required', 'auth', undefined, undefined, req);
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: 'Admin configuration is missing. Please contact administrator.',
        code: 'CONFIG_ERROR',
      });
      return;
    }

    const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
    const role = isAdmin ? 'admin' : profile.role;

    logger.auth('User authentication successful', {
      email: user.email,
      databaseRole: profile.role,
      isAdmin,
      finalRole: role
    }, undefined, req);

    // Attach user data to request
    req.user = {
      id: profile.id,
      email: user.email || '',
      role: role,
      full_name: profile.full_name,
    };

    next();
  } catch (error) {
    logger.error('Authentication error', 'auth', undefined, error as Error, req);
    // SECURITY FIX: Proper error propagation for async middleware
    next(error);
  }
};

// Role-based access control middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User must be authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: `Role '${req.user.role}' is not authorized for this operation. Required roles: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    next();
  };
};

// Admin-only middleware
export const requireAdmin = requireRole(['admin']);

// Driver-only middleware
export const requireDriver = requireRole(['driver']);

// Student-only middleware
export const requireStudent = requireRole(['student']);

// Admin or driver middleware
export const requireAdminOrDriver = requireRole(['admin', 'driver']);

// Admin or student middleware
export const requireAdminOrStudent = requireRole(['admin', 'student']);

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);

    // Try to validate token but don't fail if invalid
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      // Token is invalid, continue without authentication
      next();
      return;
    }

    // Token is valid, get user profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .single();

    if (profile) {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(
        (email: string) => email.trim().toLowerCase()
      ) || [];

      const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
      const role = isAdmin ? 'admin' : profile.role;

      req.user = {
        id: profile.id,
        email: user.email || '',
        role: role,
        full_name: profile.full_name,
      };
    }

    next();
  } catch (error) {
    // Error occurred, continue without authentication
    logger.warn('Optional auth error', 'auth', { error: String(error) }, req);
    next();
  }
};
