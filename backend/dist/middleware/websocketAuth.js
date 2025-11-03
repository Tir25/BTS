"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketAdminAuthMiddleware = exports.websocketStudentAuthMiddleware = exports.websocketDriverAuthMiddleware = exports.websocketAuthMiddleware = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
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
        const allowAnonymous = process.env.ALLOW_ANONYMOUS_STUDENTS === 'true';
        if (!allowAnonymous && process.env.NODE_ENV === 'production') {
            logger_1.logger.websocket('Anonymous student connection rejected in production', {
                socketId: socket.id,
                clientType,
                clientIP
            });
            return next(new Error('Authentication required in production mode'));
        }
        logger_1.logger.websocket('Anonymous student connection allowed (dev mode compatible)', {
            socketId: socket.id,
            clientType,
            clientIP,
            allowAnonymous,
            nodeEnv: process.env.NODE_ENV
        });
        socket.userId = `anonymous-student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        socket.userRole = 'student';
        socket.isAuthenticated = false;
        socket.lastActivity = Date.now();
        return next();
    }
    if (!token) {
        logger_1.logger.websocket('No authentication token provided for privileged connection', {
            socketId: socket.id,
            clientType,
            clientIP,
            userAgent: userAgent?.substring(0, 100)
        });
        return next(new Error('Authentication token required'));
    }
    if (typeof token !== 'string' || token.length < 20) {
        logger_1.logger.websocket('Invalid token format', {
            socketId: socket.id,
            tokenLength: token?.length || 0,
            clientIP
        });
        return next(new Error('Invalid token format'));
    }
    const rateLimitKey = `auth_attempts_${clientIP}`;
    const maxAttempts = parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5');
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
    const authAttempts = global.authAttemptStore || (global.authAttemptStore = new Map());
    const now = Date.now();
    const attempts = authAttempts.get(rateLimitKey) || { count: 0, resetTime: now + windowMs };
    if (now > attempts.resetTime) {
        attempts.count = 0;
        attempts.resetTime = now + windowMs;
    }
    if (attempts.count >= maxAttempts) {
        logger_1.logger.websocket('Too many authentication attempts from IP', {
            socketId: socket.id,
            attempts: attempts.count,
            clientIP,
            resetTime: new Date(attempts.resetTime).toISOString()
        });
        return next(new Error('Too many authentication attempts. Please try again later.'));
    }
    attempts.count++;
    authAttempts.set(rateLimitKey, attempts);
    const authTimeout = setTimeout(() => {
        logger_1.logger.websocket('Authentication timeout', { socketId: socket.id, clientIP });
        next(new Error('Authentication timeout'));
    }, 10000);
    supabase_1.supabaseAdmin.auth.getUser(token)
        .then(({ data: { user }, error }) => {
        clearTimeout(authTimeout);
        if (error || !user) {
            logger_1.logger.websocket('Token validation failed', {
                socketId: socket.id,
                error: error?.message,
                clientIP
            });
            return next(new Error('Invalid authentication token'));
        }
        if (!user.id || !user.email) {
            logger_1.logger.websocket('Invalid user data', {
                socketId: socket.id,
                userId: user.id,
                clientIP
            });
            return next(new Error('Invalid user data'));
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
                logger_1.logger.websocket('User profile not found', {
                    socketId: socket.id,
                    email: user.email,
                    error: profileError?.message,
                    clientIP
                }, profileError);
                return next(new Error('User profile not found'));
            }
            if (profile.is_active === false) {
                logger_1.logger.websocket('Inactive user account', {
                    socketId: socket.id,
                    email: user.email,
                    clientIP
                });
                return next(new Error('Account is inactive'));
            }
            const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim().toLowerCase()) || [];
            if (adminEmails.length === 0) {
                logger_1.logger.error('ADMIN_EMAILS environment variable is required', 'websocket', {
                    socketId: socket.id,
                    clientIP
                });
                return next(new Error('Server configuration error'));
            }
            const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
            const role = isAdmin ? 'admin' : profile.role;
            if (!['admin', 'driver', 'student'].includes(role)) {
                logger_1.logger.websocket('Invalid user role', {
                    socketId: socket.id,
                    role,
                    clientIP
                });
                return next(new Error('Invalid user role'));
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
        logger_1.logger.error('WebSocket authentication error', 'websocket', {
            socketId: socket.id,
            error: error?.message,
            clientIP
        }, error);
        next(new Error('Authentication failed'));
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