"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitErrorHandler = exports.notFoundErrorHandler = exports.authorizationErrorHandler = exports.authErrorHandler = exports.validationErrorHandler = exports.createErrorResponse = exports.databaseErrorHandler = exports.uncaughtExceptionHandler = exports.unhandledRejectionHandler = exports.notFoundHandler = exports.asyncHandler = exports.globalErrorHandler = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const globalErrorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let isOperational = false;
    let errorCode = 'INTERNAL_ERROR';
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
        isOperational = error.isOperational;
        errorCode = 'APP_ERROR';
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        errorCode = 'VALIDATION_ERROR';
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
        errorCode = 'CAST_ERROR';
    }
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        errorCode = 'JWT_ERROR';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        errorCode = 'JWT_EXPIRED';
    }
    else if (error.name === 'MulterError') {
        statusCode = 400;
        message = 'File upload error';
        errorCode = 'UPLOAD_ERROR';
    }
    else if (error.name === 'SyntaxError') {
        statusCode = 400;
        message = 'Invalid JSON syntax';
        errorCode = 'SYNTAX_ERROR';
    }
    else if (error.name === 'TypeError') {
        statusCode = 400;
        message = 'Type error';
        errorCode = 'TYPE_ERROR';
    }
    else if (error.name === 'ReferenceError') {
        statusCode = 500;
        message = 'Reference error';
        errorCode = 'REFERENCE_ERROR';
    }
    else if (error.message?.includes('ECONNREFUSED')) {
        statusCode = 503;
        message = 'Database connection failed';
        errorCode = 'DB_CONNECTION_ERROR';
    }
    else if (error.message?.includes('timeout')) {
        statusCode = 408;
        message = 'Request timeout';
        errorCode = 'TIMEOUT_ERROR';
    }
    else if (error.message?.includes('ENOTFOUND')) {
        statusCode = 503;
        message = 'Service unavailable';
        errorCode = 'SERVICE_UNAVAILABLE';
    }
    const requestId = req.headers['x-request-id'] || 'unknown';
    logger_1.logger.error('Error occurred', 'error', {
        requestId,
        message: error.message,
        stack: error.stack,
        statusCode,
        errorCode,
        isOperational,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        query: req.query,
        params: req.params,
        timestamp: new Date().toISOString()
    });
    const errorResponse = {
        error: message,
        status: statusCode,
        code: errorCode,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        requestId
    };
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
        errorResponse.details = {
            name: error.name,
            message: error.message
        };
    }
    res.status(statusCode).json(errorResponse);
};
exports.globalErrorHandler = globalErrorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
const unhandledRejectionHandler = (reason, promise) => {
    logger_1.logger.error('Unhandled Promise Rejection', 'error', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString()
    });
    process.exit(1);
};
exports.unhandledRejectionHandler = unhandledRejectionHandler;
const uncaughtExceptionHandler = (error) => {
    logger_1.logger.error('Uncaught Exception', 'error', {
        message: error.message,
        stack: error.stack
    });
    process.exit(1);
};
exports.uncaughtExceptionHandler = uncaughtExceptionHandler;
const databaseErrorHandler = (error) => {
    if (error.code === '23505') {
        return new AppError('Duplicate entry', 409);
    }
    if (error.code === '23503') {
        return new AppError('Referenced record not found', 400);
    }
    if (error.code === '23502') {
        return new AppError('Required field missing', 400);
    }
    if (error.code === '42P01') {
        return new AppError('Database table not found', 500);
    }
    if (error.code === 'ECONNREFUSED') {
        return new AppError('Database connection failed', 503);
    }
    if (error.code === '23514') {
        return new AppError('Data validation failed', 400);
    }
    if (error.code === '23506') {
        return new AppError('Data conflict', 409);
    }
    if (error.code === '42P07') {
        return new AppError('Resource already exists', 409);
    }
    if (error.code === '42P16') {
        return new AppError('Invalid data reference', 400);
    }
    return new AppError('Database error', 500);
};
exports.databaseErrorHandler = databaseErrorHandler;
const createErrorResponse = (message, statusCode = 500, code = 'ERROR', details) => {
    return {
        error: message,
        status: statusCode,
        code,
        timestamp: new Date().toISOString(),
        ...(details && { details })
    };
};
exports.createErrorResponse = createErrorResponse;
const validationErrorHandler = (errors) => {
    const message = 'Validation failed';
    const details = errors.map(error => ({
        field: error.path || error.field,
        message: error.message,
        value: error.value
    }));
    return new AppError(message, 400, true);
};
exports.validationErrorHandler = validationErrorHandler;
const authErrorHandler = (message = 'Authentication failed') => {
    return new AppError(message, 401, true);
};
exports.authErrorHandler = authErrorHandler;
const authorizationErrorHandler = (message = 'Insufficient permissions') => {
    return new AppError(message, 403, true);
};
exports.authorizationErrorHandler = authorizationErrorHandler;
const notFoundErrorHandler = (resource = 'Resource') => {
    return new AppError(`${resource} not found`, 404, true);
};
exports.notFoundErrorHandler = notFoundErrorHandler;
const rateLimitErrorHandler = (message = 'Too many requests') => {
    return new AppError(message, 429, true);
};
exports.rateLimitErrorHandler = rateLimitErrorHandler;
//# sourceMappingURL=errorHandler.js.map