import { Response } from 'express';
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    code?: string;
    timestamp: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface PaginationParams {
    page: number;
    limit: number;
    total: number;
}
export declare class ResponseHelper {
    static success<T>(res: Response, data: T, message?: string, statusCode?: number): Response;
    static successWithPagination<T>(res: Response, data: T[], pagination: PaginationParams, message?: string, statusCode?: number): Response;
    static error(res: Response, error: string, statusCode?: number, code?: string): Response;
    static validationError(res: Response, error: string, code?: string): Response;
    static notFound(res: Response, resource?: string): Response;
    static unauthorized(res: Response, message?: string): Response;
    static forbidden(res: Response, message?: string): Response;
    static conflict(res: Response, message?: string): Response;
    static serviceUnavailable(res: Response, message?: string): Response;
    static created<T>(res: Response, data: T, message?: string): Response;
    static noContent(res: Response): Response;
    static badRequest(res: Response, message?: string): Response;
    static methodNotAllowed(res: Response, method: string): Response;
    static tooManyRequests(res: Response, message?: string): Response;
    static internalError(res: Response, message?: string): Response;
}
export declare const sendSuccess: <T>(res: Response, data: T, message?: string, statusCode?: number) => Response<any, Record<string, any>>;
export declare const sendError: (res: Response, error: string, statusCode?: number, code?: string) => Response<any, Record<string, any>>;
export declare const sendValidationError: (res: Response, error: string, code?: string) => Response<any, Record<string, any>>;
export declare const sendNotFound: (res: Response, resource?: string) => Response<any, Record<string, any>>;
export declare const sendUnauthorized: (res: Response, message?: string) => Response<any, Record<string, any>>;
export declare const sendForbidden: (res: Response, message?: string) => Response<any, Record<string, any>>;
export declare const sendConflict: (res: Response, message?: string) => Response<any, Record<string, any>>;
export declare const sendCreated: <T>(res: Response, data: T, message?: string) => Response<any, Record<string, any>>;
export declare const sendNoContent: (res: Response) => Response<any, Record<string, any>>;
export declare const sendBadRequest: (res: Response, message?: string) => Response<any, Record<string, any>>;
export declare const sendInternalError: (res: Response, message?: string) => Response<any, Record<string, any>>;
//# sourceMappingURL=responseHelpers.d.ts.map