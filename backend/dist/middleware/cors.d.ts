import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
export declare const corsMiddleware: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
export declare const handlePreflight: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=cors.d.ts.map