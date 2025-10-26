import { Request, Response, NextFunction } from 'express';
export declare const requestMonitoring: (req: Request, res: Response, next: NextFunction) => void;
export declare const errorMonitoring: (error: Error, req: Request, res: Response, next: NextFunction) => void;
export declare const memoryMonitoring: (req: Request, res: Response, next: NextFunction) => void;
export declare const performanceMonitoring: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=monitoring.d.ts.map