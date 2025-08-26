import { Response } from 'express';
interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: string;
    details?: Record<string, unknown>;
}
interface ErrorDetails {
    field?: string;
    code?: string;
    [key: string]: unknown;
}
export declare const createErrorResponse: (_statusCode: number, error: string, message: string, details?: ErrorDetails) => ApiResponse;
export declare const createSuccessResponse: <T = unknown>(data: T, message?: string, _statusCode?: number) => ApiResponse<T>;
export declare const sendErrorResponse: (res: Response, statusCode: number, error: string, message: string, details?: ErrorDetails) => Response<any, Record<string, any>>;
export declare const sendSuccessResponse: <T = unknown>(res: Response, data: T, message?: string, statusCode?: number) => Response<any, Record<string, any>>;
export declare const sendValidationError: (res: Response, field: string, message: string) => Response<any, Record<string, any>>;
export declare const sendNotFoundError: (res: Response, resource: string, id: string) => Response<any, Record<string, any>>;
export declare const sendUnauthorizedError: (res: Response, message?: string) => Response<any, Record<string, any>>;
export declare const sendForbiddenError: (res: Response, message?: string) => Response<any, Record<string, any>>;
export declare const sendInternalServerError: (res: Response, error?: Error) => Response<any, Record<string, any>>;
export {};
//# sourceMappingURL=responseHelpers.d.ts.map