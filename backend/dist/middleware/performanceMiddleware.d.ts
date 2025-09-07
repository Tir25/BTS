import { Request, Response, NextFunction } from 'express';
export declare const performanceMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const databasePerformanceMiddleware: (operation: string) => <T>(queryFn: () => Promise<T>) => Promise<T>;
export declare const websocketPerformanceMiddleware: (event: string) => <T>(handlerFn: () => Promise<T>) => Promise<T>;
//# sourceMappingURL=performanceMiddleware.d.ts.map