import { Request, Response, NextFunction } from 'express';
export interface CorsOptions {
    origin: (string | RegExp)[];
    methods: string[];
    credentials: boolean;
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
}
export declare class CorsManager {
    private static instance;
    private options;
    private constructor();
    static getInstance(): CorsManager;
    private isOriginAllowed;
    corsMiddleware: (req: Request, res: Response, next: NextFunction) => void;
    websocketCors: (req: Request, res: Response, next: NextFunction) => void;
    updateConfig(newOptions: Partial<CorsOptions>): void;
    getConfig(): CorsOptions;
}
export declare const corsManager: CorsManager;
export declare const corsMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const websocketCors: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=corsEnhanced.d.ts.map