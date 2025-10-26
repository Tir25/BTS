"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAdminOrStudent = exports.requireAdminOrDriver = exports.requireStudent = exports.requireDriver = exports.requireAdmin = exports.requireRole = exports.authenticateUser = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger_1.logger.auth('Missing or invalid Authorization header', {
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
        const token = authHeader.substring(7);
        if (!token || token.length < 10) {
            logger_1.logger.auth('Invalid token format', { tokenLength: token?.length || 0 }, undefined, req);
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
            logger_1.logger.auth('Token validation failed', {
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
        if (!user.email_confirmed_at && process.env.NODE_ENV === 'production') {
            logger_1.logger.auth('User email not verified', { email: user.email }, undefined, req);
            res.status(401).json({
                success: false,
                error: 'Email not verified',
                message: 'Please verify your email address before accessing this resource.',
                code: 'EMAIL_NOT_VERIFIED',
            });
            return;
        }
        const { data: profile, error: profileError } = await supabase_1.supabaseAdmin
            .from('user_profiles')
            .select('id, full_name, role')
            .eq('id', user.id)
            .single();
        if (profileError || !profile) {
            logger_1.logger.auth('User profile not found', { email: user.email }, profileError, req);
            res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'User profile not found. Please contact administrator.',
                code: 'PROFILE_NOT_FOUND',
            });
            return;
        }
        const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim().toLowerCase()) || [];
        if (adminEmails.length === 0) {
            logger_1.logger.error('ADMIN_EMAILS environment variable is required', 'auth', undefined, undefined, req);
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
        logger_1.logger.auth('User authentication successful', {
            email: user.email,
            databaseRole: profile.role,
            isAdmin,
            finalRole: role
        }, undefined, req);
        req.user = {
            id: profile.id,
            email: user.email || '',
            role: role,
            full_name: profile.full_name,
        };
        next();
    }
    catch (error) {
        logger_1.logger.error('Authentication error', 'auth', undefined, error, req);
        next(error);
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
            .from('user_profiles')
            .select('id, full_name, role')
            .eq('id', user.id)
            .single();
        if (profile) {
            const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim().toLowerCase()) || [];
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
        logger_1.logger.warn('Optional auth error', 'auth', { error: String(error) }, req);
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map