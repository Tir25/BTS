import { Request, Response, NextFunction } from 'express';
export declare const securityMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const createRateLimit: (windowMs: number, max: number, message?: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const apiRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const authRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const ipWhitelist: (allowedIPs: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRequest: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const corsSecurity: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=security.d.ts.map