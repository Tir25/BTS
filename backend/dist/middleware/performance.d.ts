import { Request, Response, NextFunction } from 'express';
export declare const performanceMonitor: (req: Request, res: Response, next: NextFunction) => void;
export declare const memoryMonitor: (req: Request, res: Response, next: NextFunction) => void;
export declare const requestSizeLimit: (maxSize: number) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const compressionMonitor: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=performance.d.ts.map