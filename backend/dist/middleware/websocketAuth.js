"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketAdminAuthMiddleware = exports.websocketStudentAuthMiddleware = exports.websocketDriverAuthMiddleware = exports.websocketAuthMiddleware = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const authUtils_1 = require("./authUtils");
const websocketAuthMiddleware = (socket, next) => {
    const token = socket.handshake.auth.token;
    const clientType = socket.handshake.auth.clientType || 'student';
    const clientIP = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'];
    logger_1.logger.websocket('WebSocket connection attempt', {
        socketId: socket.id,
        clientType,
        clientIP,
        userAgent: userAgent?.substring(0, 100)
    });
    if (!token && clientType === 'student') {
        const isProduction = process.env.NODE_ENV === 'production';
        const allowAnonymous = process.env.ALLOW_ANONYMOUS_STUDENTS === 'true';
        if (isProduction && !allowAnonymous) {
            logger_1.logger.websocket('Anonymous student connection rejected by default policy (production)', {
                socketId: socket.id,
                clientType,
                clientIP
            });
            return next(new Error('Authentication required for student connections'));
        }
        logger_1.logger.websocket('Anonymous student connection allowed (read-only map access)', {
            socketId: socket.id,
            clientType,
            clientIP,
            nodeEnv: process.env.NODE_ENV,
            note: 'Anonymous students can view bus locations but cannot send updates'
        });
        socket.userId = `anonymous-student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        socket.userRole = 'student';
        socket.isAuthenticated = false;
        socket.lastActivity = Date.now();
        return next();
    }
    if (!token) {
        const errorMsg = 'Authentication token required';
        logger_1.logger.websocket('No authentication token provided for privileged connection', {
            socketId: socket.id,
            clientType,
            clientIP,
            userAgent: userAgent?.substring(0, 100),
            authProvided: !!socket.handshake.auth.token,
            authKeys: Object.keys(socket.handshake.auth || {}),
        });
        const error = new Error(errorMsg);
        error.code = 'AUTH_TOKEN_REQUIRED';
        error.clientType = clientType;
        return next(error);
    }
    if (typeof token !== 'string' || token.length < 20) {
        const errorMsg = 'Invalid token format';
        logger_1.logger.websocket('Invalid token format', {
            socketId: socket.id,
            tokenLength: token?.length || 0,
            tokenType: typeof token,
            clientIP,
            clientType,
        });
        const error = new Error(errorMsg);
        error.code = 'AUTH_TOKEN_INVALID';
        error.clientType = clientType;
        error.reason = 'Token format invalid or too short';
        return next(error);
    }
    const authTimeout = setTimeout(() => {
        logger_1.logger.websocket('Authentication timeout', { socketId: socket.id, clientIP });
        next(new Error('Authentication timeout'));
    }, 10000);
    supabase_1.supabaseAdmin.auth.getUser(token)
        .then(({ data: { user }, error }) => {
        clearTimeout(authTimeout);
        if (error || !user) {
            const errorMsg = error?.message || 'Invalid authentication token';
            logger_1.logger.websocket('Token validation failed', {
                socketId: socket.id,
                error: errorMsg,
                errorCode: error?.status,
                clientIP,
                clientType,
                tokenLength: token?.length || 0,
            });
            const authError = new Error(errorMsg);
            authError.code = 'AUTH_TOKEN_INVALID';
            authError.originalError = error?.message;
            return next(authError);
        }
        if (!user.id || !user.email) {
            const errorMsg = 'Invalid user data';
            logger_1.logger.websocket('Invalid user data', {
                socketId: socket.id,
                userId: user.id,
                userEmail: user.email,
                clientIP,
                clientType,
            });
            const error = new Error(errorMsg);
            error.code = 'AUTH_USER_INVALID';
            error.clientType = clientType;
            return next(error);
        }
        if (!user.email_confirmed_at && process.env.NODE_ENV === 'production') {
            logger_1.logger.websocket('User email not verified', {
                socketId: socket.id,
                email: user.email,
                clientIP
            });
            return next(new Error('Email not verified'));
        }
        return supabase_1.supabaseAdmin
            .from('user_profiles')
            .select('id, full_name, role, is_active, last_login')
            .eq('id', user.id)
            .single()
            .then(({ data: profile, error: profileError }) => {
            if (profileError || !profile) {
                const errorMsg = 'User profile not found';
                logger_1.logger.websocket('User profile not found', {
                    socketId: socket.id,
                    email: user.email,
                    userId: user.id,
                    error: profileError?.message,
                    errorCode: profileError?.code,
                    clientIP,
                    clientType,
                }, profileError);
                const error = new Error(errorMsg);
                error.code = 'AUTH_PROFILE_NOT_FOUND';
                error.clientType = clientType;
                error.originalError = profileError?.message;
                return next(error);
            }
            if (profile.is_active === false) {
                const errorMsg = 'Account is inactive';
                logger_1.logger.websocket('Inactive user account', {
                    socketId: socket.id,
                    email: user.email,
                    userId: user.id,
                    clientIP,
                    clientType,
                });
                const error = new Error(errorMsg);
                error.code = 'AUTH_ACCOUNT_INACTIVE';
                error.clientType = clientType;
                return next(error);
            }
            const adminEmails = (0, authUtils_1.getAdminEmails)();
            if (adminEmails.length === 0) {
                const errorMsg = 'Server configuration error';
                logger_1.logger.error('Admin emails configuration missing', 'websocket', {
                    socketId: socket.id,
                    clientIP,
                    clientType,
                });
                const error = new Error(errorMsg);
                error.code = 'SERVER_CONFIG_ERROR';
                error.clientType = clientType;
                return next(error);
            }
            const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
            const role = isAdmin ? 'admin' : profile.role;
            if (!['admin', 'driver', 'student'].includes(role)) {
                const errorMsg = `Invalid user role: ${role}`;
                logger_1.logger.websocket('Invalid user role', {
                    socketId: socket.id,
                    role,
                    email: user.email,
                    userId: user.id,
                    clientIP,
                    clientType,
                });
                const error = new Error(errorMsg);
                error.code = 'AUTH_INVALID_ROLE';
                error.clientType = clientType;
                error.role = role;
                return next(error);
            }
            socket.userId = profile.id;
            socket.userRole = role;
            socket.isAuthenticated = true;
            socket.lastActivity = Date.now();
            (async () => {
                try {
                    await supabase_1.supabaseAdmin
                        .from('user_profiles')
                        .update({ last_login: new Date().toISOString() })
                        .eq('id', user.id);
                    logger_1.logger.debug('Last login updated', 'websocket', { userId: user.id });
                }
                catch (updateError) {
                    logger_1.logger.warn('Failed to update last login', 'websocket', {
                        userId: user.id,
                        error: updateError?.message
                    });
                }
            })();
            logger_1.logger.websocket('User authenticated successfully', {
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
        logger_1.logger.error('WebSocket authentication error', 'websocket', {
            socketId: socket.id,
            error: errorMsg,
            errorStack: error?.stack,
            clientIP,
            clientType,
            tokenProvided: !!token,
            tokenLength: token?.length || 0,
        }, error);
        const authError = new Error(errorMsg);
        authError.code = 'AUTH_FAILED';
        authError.originalError = error?.message;
        next(authError);
    });
};
exports.websocketAuthMiddleware = websocketAuthMiddleware;
const websocketDriverAuthMiddleware = (socket, next) => {
    if (!socket.isAuthenticated || !socket.userRole) {
        logger_1.logger.websocket('Driver authentication required', { socketId: socket.id });
        return next(new Error('Driver authentication required'));
    }
    if (socket.userRole !== 'driver' && socket.userRole !== 'admin') {
        logger_1.logger.websocket('Driver role required', { socketId: socket.id, actualRole: socket.userRole });
        return next(new Error('Driver role required'));
    }
    next();
};
exports.websocketDriverAuthMiddleware = websocketDriverAuthMiddleware;
const websocketStudentAuthMiddleware = (socket, next) => {
    if (!socket.isAuthenticated || !socket.userRole) {
        logger_1.logger.websocket('Student authentication required', { socketId: socket.id });
        return next(new Error('Student authentication required'));
    }
    if (socket.userRole !== 'student' && socket.userRole !== 'admin') {
        logger_1.logger.websocket('Student role required', { socketId: socket.id, actualRole: socket.userRole });
        return next(new Error('Student role required'));
    }
    next();
};
exports.websocketStudentAuthMiddleware = websocketStudentAuthMiddleware;
const websocketAdminAuthMiddleware = (socket, next) => {
    if (!socket.isAuthenticated || !socket.userRole) {
        logger_1.logger.websocket('Admin authentication required', { socketId: socket.id });
        return next(new Error('Admin authentication required'));
    }
    if (socket.userRole !== 'admin') {
        logger_1.logger.websocket('Admin role required', { socketId: socket.id, actualRole: socket.userRole });
        return next(new Error('Admin role required'));
    }
    next();
};
exports.websocketAdminAuthMiddleware = websocketAdminAuthMiddleware;
//# sourceMappingURL=websocketAuth.js.map