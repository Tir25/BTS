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
    console.log(`🔐 Auth attempt - ${req.method} ${req.path} - IP: ${req.ip}`);
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
      });
      return;
    }

    // Check if this is a known admin user - prioritize admin email over database role
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(
      (email: string) => email.trim().toLowerCase()
    ) || [];

    if (adminEmails.length === 0) {
      console.error('❌ No admin emails configured');
      throw new Error('ADMIN_EMAILS environment variable is required');
    }

    const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
    const role = isAdmin ? 'admin' : profile.role;

    console.log(
      `✅ Auth success - User: ${user.email} - Role: ${role} - IP: ${req.ip}`
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
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: `Role '${req.user.role}' is not authorized for this operation`,
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
