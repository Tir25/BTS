"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGlobalErrorHandlers = exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const environment_1 = require("../config/environment");
const config = (0, environment_1.initializeEnvironment)();
const errorHandler = (error, req, res, next) => {
    (0, errors_1.logError)(error, {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        body: req.body,
        query: req.query,
        params: req.params,
    });
    if (error instanceof errors_1.AppError) {
        const errorResponse = (0, errors_1.createErrorResponse)(error);
        if (config.nodeEnv === 'production') {
            delete errorResponse.error.context;
        }
        res.status(error.statusCode).json(errorResponse);
        return;
    }
    if (error.name === 'ValidationError') {
        res.status(400).json({
            error: {
                name: 'ValidationError',
                message: 'Request validation failed',
                statusCode: 400,
                timestamp: new Date().toISOString(),
                details: error.message,
            },
        });
        return;
    }
    if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
            error: {
                name: 'AuthenticationError',
                message: 'Invalid token',
                statusCode: 401,
                timestamp: new Date().toISOString(),
            },
        });
        return;
    }
    if (error.name === 'TokenExpiredError') {
        res.status(401).json({
            error: {
                name: 'AuthenticationError',
                message: 'Token expired',
                statusCode: 401,
                timestamp: new Date().toISOString(),
            },
        });
        return;
    }
    if (error.name === 'DatabaseConnectionError') {
        res.status(503).json({
            error: {
                name: 'ServiceUnavailableError',
                message: 'Database service unavailable',
                statusCode: 503,
                timestamp: new Date().toISOString(),
            },
        });
        return;
    }
    if (error.name === 'TooManyRequestsError') {
        res.status(429).json({
            error: {
                name: 'RateLimitError',
                message: 'Too many requests',
                statusCode: 429,
                timestamp: new Date().toISOString(),
            },
        });
        return;
    }
    if (error.message.includes('CORS')) {
        res.status(403).json({
            error: {
                name: 'CORSError',
                message: 'CORS policy violation',
                statusCode: 403,
                timestamp: new Date().toISOString(),
            },
        });
        return;
    }
    const statusCode = 500;
    const message = config.nodeEnv === 'production'
        ? 'Internal server error'
        : error.message;
    res.status(statusCode).json({
        error: {
            name: 'InternalServerError',
            message,
            statusCode,
            timestamp: new Date().toISOString(),
            ...(config.nodeEnv === 'development' && { stack: error.stack }),
        },
    });
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: {
            name: 'NotFoundError',
            message: `Route ${req.method} ${req.originalUrl} not found`,
            statusCode: 404,
            timestamp: new Date().toISOString(),
            availableEndpoints: [
                '/',
                '/health',
                '/health/detailed',
                '/buses',
                '/routes',
                '/admin',
                '/storage',
                '/locations',
                '/sse',
            ],
        },
    });
};
exports.notFoundHandler = notFoundHandler;
const setupGlobalErrorHandlers = () => {
    process.on('uncaughtException', (error) => {
        (0, errors_1.logError)(error, { type: 'uncaughtException' });
        console.error('💥 Uncaught Exception! Shutting down...');
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        (0, errors_1.logError)(new Error(`Unhandled Rejection: ${reason}`), {
            type: 'unhandledRejection',
            promise: promise.toString(),
        });
        console.error('💥 Unhandled Rejection! Shutting down...');
        process.exit(1);
    });
    process.on('SIGTERM', () => {
        console.log('🛑 SIGTERM received. Shutting down gracefully...');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        console.log('🛑 SIGINT received. Shutting down gracefully...');
        process.exit(0);
    });
};
exports.setupGlobalErrorHandlers = setupGlobalErrorHandlers;
//# sourceMappingURL=errorHandler.js.map