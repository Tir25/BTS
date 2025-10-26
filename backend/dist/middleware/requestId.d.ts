import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}
export declare const requestIdMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const addRequestIdToError: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requestId.d.ts.map