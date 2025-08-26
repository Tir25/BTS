import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
                full_name?: string;
            };
        }
    }
}
export declare const authenticateUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireDriver: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireStudent: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdminOrDriver: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdminOrStudent: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map