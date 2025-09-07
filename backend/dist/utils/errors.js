"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.createErrorResponse = exports.isOperationalError = exports.ExternalServiceError = exports.RateLimitError = exports.WebSocketError = exports.DatabaseError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true, context) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        this.context = context;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message = 'Validation failed', context) {
        super(message, 400, true, context);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed', context) {
        super(message, 401, true, context);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Access denied', context) {
        super(message, 403, true, context);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found', context) {
        super(message, 404, true, context);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict', context) {
        super(message, 409, true, context);
    }
}
exports.ConflictError = ConflictError;
class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', context) {
        super(message, 500, true, context);
    }
}
exports.DatabaseError = DatabaseError;
class WebSocketError extends AppError {
    constructor(message = 'WebSocket operation failed', context) {
        super(message, 500, true, context);
    }
}
exports.WebSocketError = WebSocketError;
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded', context) {
        super(message, 429, true, context);
    }
}
exports.RateLimitError = RateLimitError;
class ExternalServiceError extends AppError {
    constructor(service, message = 'External service error', context) {
        super(`${service}: ${message}`, 502, true, { service, ...context });
    }
}
exports.ExternalServiceError = ExternalServiceError;
const isOperationalError = (error) => {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
};
exports.isOperationalError = isOperationalError;
const createErrorResponse = (error) => {
    if (error instanceof AppError) {
        return {
            error: {
                name: error.name,
                message: error.message,
                statusCode: error.statusCode,
                timestamp: error.timestamp,
                context: error.context,
            },
        };
    }
    return {
        error: {
            name: 'InternalServerError',
            message: 'Something went wrong',
            statusCode: 500,
            timestamp: new Date().toISOString(),
        },
    };
};
exports.createErrorResponse = createErrorResponse;
const logError = (error, context) => {
    const errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        context,
    };
    if (error instanceof AppError) {
        console.error('🚨 Operational Error:', errorInfo);
    }
    else {
        console.error('💥 Non-Operational Error:', errorInfo);
    }
};
exports.logError = logError;
//# sourceMappingURL=errors.js.map