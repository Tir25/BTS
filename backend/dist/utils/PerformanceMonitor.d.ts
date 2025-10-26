export interface PerformanceMetrics {
    requestCount: number;
    averageResponseTime: number;
    slowRequests: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
}
export interface RequestMetrics {
    method: string;
    path: string;
    responseTime: number;
    statusCode: number;
    timestamp: number;
}
declare class PerformanceMonitor {
    private static instance;
    private metrics;
    private requestMetrics;
    private startTime;
    private constructor();
    static getInstance(): PerformanceMonitor;
    recordRequest(method: string, path: string, responseTime: number, statusCode: number): void;
    private updateMetrics;
    getMetrics(): PerformanceMetrics;
    getRequestMetrics(startTime?: number, endTime?: number): RequestMetrics[];
    getPerformanceReport(): {
        metrics: PerformanceMetrics;
        recommendations: string[];
        healthScore: number;
    };
    reset(): void;
    getTopSlowEndpoints(limit?: number): Array<{
        method: string;
        path: string;
        averageResponseTime: number;
        requestCount: number;
    }>;
}
export declare const performanceMonitor: PerformanceMonitor;
export declare const performanceMiddleware: (req: any, res: any, next: any) => void;
export {};
//# sourceMappingURL=PerformanceMonitor.d.ts.map