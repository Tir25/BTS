import { Request, Response, NextFunction } from 'express';
export interface SecurityConfig {
    enableHelmet: boolean;
    enableCors: boolean;
    enableRateLimit: boolean;
    enableRequestValidation: boolean;
    enableSecurityHeaders: boolean;
    maxRequestSize: number;
    allowedFileTypes: string[];
    maxFileSize: number;
}
export declare class SecurityManager {
    private static instance;
    private config;
    private constructor();
    static getInstance(): SecurityManager;
    getHelmetConfig(): (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
    getRateLimitConfig(): import("express-rate-limit").RateLimitRequestHandler;
    getAuthRateLimitConfig(): import("express-rate-limit").RateLimitRequestHandler;
    requestSizeValidator: (req: Request, res: Response, next: NextFunction) => void;
    requestValidator: (req: Request, res: Response, next: NextFunction) => void;
    securityHeaders: (req: Request, res: Response, next: NextFunction) => void;
    fileUploadValidator: (req: Request, res: Response, next: NextFunction) => void;
    ipWhitelist: (allowedIPs: string[]) => (req: Request, res: Response, next: NextFunction) => void;
    updateConfig(newConfig: Partial<SecurityConfig>): void;
    getConfig(): SecurityConfig;
}
export declare const securityManager: SecurityManager;
export declare const requestSizeValidator: (req: Request, res: Response, next: NextFunction) => void;
export declare const requestValidator: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityHeaders: (req: Request, res: Response, next: NextFunction) => void;
export declare const fileUploadValidator: (req: Request, res: Response, next: NextFunction) => void;
export declare const ipWhitelist: (allowedIPs: string[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=securityEnhanced.d.ts.map