export interface PerformanceMetrics {
    timestamp: number;
    operation: string;
    duration: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
    metadata?: Record<string, unknown>;
}
export interface SystemMetrics {
    timestamp: number;
    memory: NodeJS.MemoryUsage;
    uptime: number;
    activeConnections: number;
    databaseConnections: {
        total: number;
        idle: number;
        waiting: number;
    };
    websocketConnections: number;
}
declare class PerformanceMonitor {
    private metrics;
    private systemMetrics;
    private maxMetricsHistory;
    private startTime;
    private lastCpuUsage;
    trackOperation<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T>;
    private recordMetric;
    recordSystemMetrics(data: {
        activeConnections: number;
        databaseConnections: {
            total: number;
            idle: number;
            waiting: number;
        };
        websocketConnections: number;
    }): void;
    getPerformanceStats(): {
        totalOperations: number;
        averageResponseTime: number;
        slowOperations: PerformanceMetrics[];
        errorRate: number;
        memoryUsage: NodeJS.MemoryUsage;
        uptime: number;
    };
    getSystemHealth(): {
        healthy: boolean;
        issues: string[];
        metrics: SystemMetrics | null;
    };
    getRecentMetrics(limit?: number): PerformanceMetrics[];
    getSystemMetricsHistory(limit?: number): SystemMetrics[];
    clearOldMetrics(): void;
}
export declare const performanceMonitor: PerformanceMonitor;
export {};
//# sourceMappingURL=PerformanceMonitor.d.ts.map