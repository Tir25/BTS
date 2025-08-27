"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAdminOrStudent = exports.requireAdminOrDriver = exports.requireStudent = exports.requireDriver = exports.requireAdmin = exports.requireRole = exports.authenticateUser = void 0;
const supabase_1 = require("../config/supabase");
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ Missing or invalid Authorization header:', authHeader ? 'Header exists but not Bearer' : 'No header');
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'Bearer token is required. Please log in again.',
                code: 'MISSING_TOKEN',
            });
            return;
        }
        const token = authHeader.substring(7);
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
        const { data: { user }, error, } = await supabase_1.supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            console.log('❌ Token validation failed:', error?.message || 'No user found');
            res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'Authentication failed. Please log in again.',
                code: 'INVALID_TOKEN',
            });
            return;
        }
        if (!user.email_confirmed_at && process.env.NODE_ENV === 'production') {
            console.log('❌ User email not verified:', user.email);
            res.status(401).json({
                success: false,
                error: 'Email not verified',
                message: 'Please verify your email address before accessing this resource.',
                code: 'EMAIL_NOT_VERIFIED',
            });
            return;
        }
        const { data: profile, error: profileError } = await supabase_1.supabaseAdmin
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', user.id)
            .single();
        if (profileError || !profile) {
            console.log('⚠️ User profile not found for:', user.email);
            res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'User profile not found. Please contact administrator.',
                code: 'PROFILE_NOT_FOUND',
            });
            return;
        }
        const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim().toLowerCase()) || [
            'siddharthmali.211@gmail.com',
        ];
        const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
        const role = isAdmin ? 'admin' : profile.role;
        console.log(`🔍 Backend Auth - User ${user.email} - Database role: ${profile.role}, Admin check: ${isAdmin}, Final role: ${role}`);
        req.user = {
            id: profile.id,
            email: user.email || '',
            role: role,
            full_name: profile.full_name,
        };
        next();
    }
    catch (error) {
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
exports.authenticateUser = authenticateUser;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
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
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)(['admin']);
exports.requireDriver = (0, exports.requireRole)(['driver']);
exports.requireStudent = (0, exports.requireRole)(['student']);
exports.requireAdminOrDriver = (0, exports.requireRole)(['admin', 'driver']);
exports.requireAdminOrStudent = (0, exports.requireRole)(['admin', 'student']);
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.substring(7);
        const { data: { user }, error, } = await supabase_1.supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            next();
            return;
        }
        const { data: profile } = await supabase_1.supabaseAdmin
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', user.id)
            .single();
        if (profile) {
            const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim().toLowerCase()) || ['siddharthmali.211@gmail.com'];
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
    }
    catch (error) {
        console.warn('⚠️ Optional auth error:', error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map