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
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Bearer token is required',
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
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Authentication failed',
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
      console.log(
        '⚠️ User profile not found, creating default admin profile for:',
        user.email
      );

      try {
        // Create a default admin profile for testing
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name:
              user.user_metadata?.full_name ||
              user.email?.split('@')[0] ||
              'Admin User',
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id, full_name, role')
          .single();

        if (createError) {
          console.error('❌ Failed to create default profile:', createError);
          // Continue with temporary profile instead of failing
          req.user = {
            id: user.id,
            email: user.email || '',
            role: 'admin',
            full_name:
              user.user_metadata?.full_name ||
              user.email?.split('@')[0] ||
              'Admin User',
          };
        } else {
          // Use the newly created profile
          req.user = {
            id: newProfile.id,
            email: user.email || '',
            role: newProfile.role,
            full_name: newProfile.full_name,
          };
        }
      } catch (error) {
        console.error('❌ Error creating profile:', error);
        // Continue with temporary profile instead of failing
        req.user = {
          id: user.id,
          email: user.email || '',
          role: 'admin',
          full_name:
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'Admin User',
        };
      }
    } else {
      // Attach user data to request
      req.user = {
        id: profile.id,
        email: user.email || '',
        role: profile.role,
        full_name: profile.full_name,
      };
    }

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
