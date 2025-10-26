import { Request, Response, NextFunction } from 'express';
export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
    isOperational?: boolean;
}
export declare class AppError extends Error implements ApiError {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare const createValidationError: (message: string) => AppError;
export declare const createNotFoundError: (resource: string) => AppError;
export declare const createUnauthorizedError: (message?: string) => AppError;
export declare const createForbiddenError: (message?: string) => AppError;
export declare const createConflictError: (message: string) => AppError;
export declare const createInternalError: (message?: string) => AppError;
export declare const createServiceUnavailableError: (message?: string) => AppError;
export declare const formatErrorResponse: (error: ApiError, req: Request) => Record<string, unknown>;
export declare const globalErrorHandler: (error: ApiError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => void;
export declare const handleDatabaseError: (error: unknown) => AppError;
export declare const handleValidationError: (error: unknown) => AppError;
export declare const handleAuthError: (error: unknown) => AppError;
export declare const handleRateLimitError: () => AppError;
export declare const handleFileUploadError: (error: unknown) => AppError;
//# sourceMappingURL=errorHandler.d.ts.map