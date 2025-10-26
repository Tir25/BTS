import { Request, Response } from 'express';
export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    DEBUG = "debug"
}
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    service: string;
    requestId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}
declare class Logger {
    private isDevelopment;
    private isProduction;
    private formatLogEntry;
    private log;
    error(message: string, service: string, metadata?: Record<string, any>, error?: Error, req?: Request): void;
    warn(message: string, service: string, metadata?: Record<string, any>, req?: Request): void;
    info(message: string, service: string, metadata?: Record<string, any>, req?: Request): void;
    debug(message: string, service: string, metadata?: Record<string, any>, req?: Request): void;
    auth(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void;
    cors(message: string, metadata?: Record<string, any>, req?: Request): void;
    websocket(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void;
    database(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void;
    location(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void;
    bus(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void;
    route(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void;
    admin(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void;
    security(message: string, metadata?: Record<string, any>, error?: Error, req?: Request): void;
    performance(message: string, metadata?: Record<string, any>, req?: Request): void;
    httpRequest(req: Request, res: Response, responseTime?: number): void;
    dbQuery(query: string, duration?: number, metadata?: Record<string, any>, req?: Request): void;
    wsConnection(socketId: string, userId?: string, metadata?: Record<string, any>): void;
    wsDisconnection(socketId: string, reason: string, userId?: string): void;
    securityEvent(event: string, metadata?: Record<string, any>, req?: Request): void;
    performanceMetric(metric: string, value: number, unit: string, metadata?: Record<string, any>, req?: Request): void;
    serverStart(port: number, environment: string): void;
    serverReady(port: number): void;
    databaseConnected(): void;
    databaseError(error: Error): void;
}
export declare const logger: Logger;
export declare const logError: (message: string, service: string, metadata?: Record<string, any>, error?: Error, req?: Request) => void;
export declare const logWarn: (message: string, service: string, metadata?: Record<string, any>, req?: Request) => void;
export declare const logInfo: (message: string, service: string, metadata?: Record<string, any>, req?: Request) => void;
export declare const logDebug: (message: string, service: string, metadata?: Record<string, any>, req?: Request) => void;
export {};
//# sourceMappingURL=logger.d.ts.map