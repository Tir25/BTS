"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFileUploadError = exports.handleRateLimitError = exports.handleAuthError = exports.handleValidationError = exports.handleDatabaseError = exports.asyncHandler = exports.globalErrorHandler = exports.formatErrorResponse = exports.createServiceUnavailableError = exports.createInternalError = exports.createConflictError = exports.createForbiddenError = exports.createUnauthorizedError = exports.createNotFoundError = exports.createValidationError = exports.AppError = void 0;
const logger_1 = require("./logger");
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const createValidationError = (message) => new AppError(message, 400, 'VALIDATION_ERROR');
exports.createValidationError = createValidationError;
const createNotFoundError = (resource) => new AppError(`${resource} not found`, 404, 'NOT_FOUND');
exports.createNotFoundError = createNotFoundError;
const createUnauthorizedError = (message = 'Unauthorized access') => new AppError(message, 401, 'UNAUTHORIZED');
exports.createUnauthorizedError = createUnauthorizedError;
const createForbiddenError = (message = 'Access forbidden') => new AppError(message, 403, 'FORBIDDEN');
exports.createForbiddenError = createForbiddenError;
const createConflictError = (message) => new AppError(message, 409, 'CONFLICT');
exports.createConflictError = createConflictError;
const createInternalError = (message = 'Internal server error') => new AppError(message, 500, 'INTERNAL_ERROR');
exports.createInternalError = createInternalError;
const createServiceUnavailableError = (message = 'Service temporarily unavailable') => new AppError(message, 503, 'SERVICE_UNAVAILABLE');
exports.createServiceUnavailableError = createServiceUnavailableError;
const formatErrorResponse = (error, req) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const response = {
        success: false,
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
    };
    if (isDevelopment && error.stack) {
        response.stack = error.stack;
    }
    if (isDevelopment) {
        response.request = {
            method: req.method,
            url: req.url,
            headers: req.headers,
        };
    }
    return response;
};
exports.formatErrorResponse = formatErrorResponse;
const globalErrorHandler = (error, req, res, next) => {
    logger_1.logger.error(`Error in ${req.method} ${req.path}`, 'error-handler', {
        error: error.message,
        stack: error.stack,
        statusCode: error.statusCode,
        code: error.code,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
    });
    const statusCode = error.statusCode || 500;
    const errorResponse = (0, exports.formatErrorResponse)(error, req);
    res.status(statusCode).json(errorResponse);
};
exports.globalErrorHandler = globalErrorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const handleDatabaseError = (error) => {
    if (error instanceof AppError) {
        return error;
    }
    if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error;
        switch (pgError.code) {
            case '23505':
                return (0, exports.createConflictError)('Resource already exists');
            case '23503':
                return (0, exports.createValidationError)('Referenced resource does not exist');
            case '23502':
                return (0, exports.createValidationError)('Required field is missing');
            case '42P01':
                return (0, exports.createInternalError)('Database table not found');
            case 'ECONNREFUSED':
                return (0, exports.createServiceUnavailableError)('Database connection failed');
            default:
                return (0, exports.createInternalError)('Database operation failed');
        }
    }
    return (0, exports.createInternalError)('An unexpected error occurred');
};
exports.handleDatabaseError = handleDatabaseError;
const handleValidationError = (error) => {
    if (error instanceof AppError) {
        return error;
    }
    if (error && typeof error === 'object' && 'details' in error) {
        const joiError = error;
        const message = joiError.details?.map((detail) => detail.message).join(', ') || 'Validation failed';
        return (0, exports.createValidationError)(message);
    }
    return (0, exports.createValidationError)('Invalid input data');
};
exports.handleValidationError = handleValidationError;
const handleAuthError = (error) => {
    if (error instanceof AppError) {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        const authError = error;
        if (authError.message?.includes('Invalid JWT')) {
            return (0, exports.createUnauthorizedError)('Invalid or expired token');
        }
        if (authError.message?.includes('JWT expired')) {
            return (0, exports.createUnauthorizedError)('Token has expired');
        }
    }
    return (0, exports.createUnauthorizedError)('Authentication failed');
};
exports.handleAuthError = handleAuthError;
const handleRateLimitError = () => {
    return new AppError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED');
};
exports.handleRateLimitError = handleRateLimitError;
const handleFileUploadError = (error) => {
    if (error instanceof AppError) {
        return error;
    }
    if (error && typeof error === 'object' && 'code' in error) {
        const uploadError = error;
        switch (uploadError.code) {
            case 'LIMIT_FILE_SIZE':
                return (0, exports.createValidationError)('File size exceeds limit');
            case 'LIMIT_FILE_COUNT':
                return (0, exports.createValidationError)('Too many files uploaded');
            case 'LIMIT_UNEXPECTED_FILE':
                return (0, exports.createValidationError)('Unexpected file field');
            default:
                return (0, exports.createValidationError)('File upload failed');
        }
    }
    return (0, exports.createValidationError)('File upload failed');
};
exports.handleFileUploadError = handleFileUploadError;
//# sourceMappingURL=errorHandler.js.map