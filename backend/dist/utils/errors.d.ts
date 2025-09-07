export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly timestamp: string;
    readonly context?: Record<string, unknown>;
    constructor(message: string, statusCode?: number, isOperational?: boolean, context?: Record<string, unknown>);
}
export declare class ValidationError extends AppError {
    constructor(message?: string, context?: Record<string, unknown>);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string, context?: Record<string, unknown>);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string, context?: Record<string, unknown>);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string, context?: Record<string, unknown>);
}
export declare class ConflictError extends AppError {
    constructor(message?: string, context?: Record<string, unknown>);
}
export declare class DatabaseError extends AppError {
    constructor(message?: string, context?: Record<string, unknown>);
}
export declare class WebSocketError extends AppError {
    constructor(message?: string, context?: Record<string, unknown>);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string, context?: Record<string, unknown>);
}
export declare class ExternalServiceError extends AppError {
    constructor(service: string, message?: string, context?: Record<string, unknown>);
}
export declare const isOperationalError: (error: Error) => boolean;
export declare const createErrorResponse: (error: Error) => {
    error: {
        name: string;
        message: string;
        statusCode: number;
        timestamp: string;
        context: Record<string, unknown> | undefined;
    };
} | {
    error: {
        name: string;
        message: string;
        statusCode: number;
        timestamp: string;
        context?: undefined;
    };
};
export declare const logError: (error: Error, context?: Record<string, unknown>) => void;
//# sourceMappingURL=errors.d.ts.map