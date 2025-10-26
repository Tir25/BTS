import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
export declare const globalErrorHandler: (error: Error | AppError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
export declare const unhandledRejectionHandler: (reason: any, promise: Promise<any>) => never;
export declare const uncaughtExceptionHandler: (error: Error) => never;
export declare const databaseErrorHandler: (error: any) => AppError;
export declare const createErrorResponse: (message: string, statusCode?: number, code?: string, details?: any) => any;
export declare const validationErrorHandler: (errors: any[]) => AppError;
export declare const authErrorHandler: (message?: string) => AppError;
export declare const authorizationErrorHandler: (message?: string) => AppError;
export declare const notFoundErrorHandler: (resource?: string) => AppError;
export declare const rateLimitErrorHandler: (message?: string) => AppError;
//# sourceMappingURL=errorHandler.d.ts.map