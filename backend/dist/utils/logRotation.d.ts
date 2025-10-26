import { Request, Response, NextFunction } from 'express';
interface LogRotationConfig {
    maxSize: number;
    maxFiles: number;
    compress: boolean;
    rotateOnStart: boolean;
    datePattern: string;
    logDirectory: string;
}
declare class LogRotator {
    private config;
    private rotationTimer;
    private isRotating;
    constructor(config?: Partial<LogRotationConfig>);
    private ensureLogDirectory;
    private setupRotation;
    private checkAndRotate;
    private shouldRotate;
    private getLogFiles;
    private rotateLogs;
    private rotateFile;
    private compressFile;
    private cleanupOldLogs;
    private cleanupFile;
    getRotationStats(): any;
    forceRotation(): void;
    stop(): void;
}
declare const logRotator: LogRotator;
export declare const logRotationMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const getLogRotationStats: (req: any, res: any) => void;
export declare const forceLogRotation: (req: any, res: any) => void;
export { logRotator };
//# sourceMappingURL=logRotation.d.ts.map