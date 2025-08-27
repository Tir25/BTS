import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

// Extend Express Request interface to include user
declare global {
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
      console.log(
        '❌ Missing or invalid Authorization header:',
        authHeader ? 'Header exists but not Bearer' : 'No header'
      );
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
      console.log('❌ Invalid token format');
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
      console.log(
        '❌ Token validation failed:',
        error?.message || 'No user found'
      );
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
      console.log('❌ User email not verified:', user.email);
      res.status(401).json({
        success: false,
        error: 'Email not verified',
        message:
          'Please verify your email address before accessing this resource.',
        code: 'EMAIL_NOT_VERIFIED',
      });
      return;
    }

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.log('⚠️ User profile not found for:', user.email);

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

    // Check if this is a known admin user - prioritize admin email over database role
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(
      (email: string) => email.trim().toLowerCase()
    ) || [
      'siddharthmali.211@gmail.com', // Keep this as fallback for development
    ];

    const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
    const role = isAdmin ? 'admin' : profile.role;

    console.log(
      `🔍 Backend Auth - User ${user.email} - Database role: ${profile.role}, Admin check: ${isAdmin}, Final role: ${role}`
    );

    // Attach user data to request
    req.user = {
      id: profile.id,
      email: user.email || '',
      role: role,
      full_name: profile.full_name,
    };

    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Internal server error during authentication',
      code: 'AUTH_ERROR',
    });
    return;
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
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .single();

    if (profile) {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(
        (email: string) => email.trim().toLowerCase()
      ) || ['siddharthmali.211@gmail.com'];

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
    console.warn('⚠️ Optional auth error:', error);
    next();
  }
};
