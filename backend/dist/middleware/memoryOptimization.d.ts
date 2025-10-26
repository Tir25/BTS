import { Request, Response, NextFunction } from 'express';
interface MemoryConfig {
    warningThreshold: number;
    criticalThreshold: number;
    emergencyThreshold: number;
    gcInterval: number;
    cleanupInterval: number;
}
declare class MemoryOptimizer {
    private config;
    private gcTimer;
    private cleanupTimer;
    private memoryHistory;
    private maxHistorySize;
    constructor(config?: MemoryConfig);
    private startMonitoring;
    private performGarbageCollection;
    private performCleanup;
    private recordMemoryUsage;
    private cleanupCaches;
    private logMemoryStatistics;
    getMemoryStats(): any;
    stop(): void;
}
declare const memoryOptimizer: MemoryOptimizer;
export declare const memoryOptimizationMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const memoryLeakDetection: (req: Request, res: Response, next: NextFunction) => void;
export declare const getMemoryStats: (req: any, res: any) => void;
export declare const forceGarbageCollection: (req: any, res: any) => void;
export { memoryOptimizer };
//# sourceMappingURL=memoryOptimization.d.ts.map