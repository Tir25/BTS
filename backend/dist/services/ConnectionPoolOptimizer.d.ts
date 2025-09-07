import { Pool, PoolClient } from 'pg';
export interface PoolConfig {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    acquireTimeoutMillis: number;
    createTimeoutMillis: number;
    destroyTimeoutMillis: number;
    reapIntervalMillis: number;
    createRetryIntervalMillis: number;
}
export interface PoolMetrics {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
    activeConnections: number;
    averageWaitTime: number;
    averageQueryTime: number;
    connectionUtilization: number;
    errorRate: number;
}
export interface QueryStats {
    query: string;
    count: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    errorCount: number;
}
declare class ConnectionPoolOptimizer {
    private pool;
    private metrics;
    private queryStats;
    private monitoringInterval;
    private isMonitoring;
    constructor(poolInstance?: Pool);
    startMonitoring(intervalMs?: number): void;
    stopMonitoring(): void;
    private updateMetrics;
    private calculateAverageWaitTime;
    private calculateAverageQueryTime;
    private calculateConnectionUtilization;
    private calculateErrorRate;
    private optimizePool;
    private suggestPoolSizeIncrease;
    private suggestPoolSizeDecrease;
    private suggestTimeoutIncrease;
    private logOptimizationSuggestions;
    trackQuery(query: string, startTime: number, endTime: number, error?: Error): void;
    private normalizeQuery;
    getMetrics(): PoolMetrics;
    getQueryStats(): QueryStats[];
    getSlowQueries(threshold?: number): QueryStats[];
    getMostFrequentQueries(limit?: number): QueryStats[];
    getQueriesWithErrors(): QueryStats[];
    executeQuery<T>(query: string, params?: any[], client?: PoolClient): Promise<T>;
    getConnection(timeoutMs?: number): Promise<PoolClient>;
    healthCheck(): Promise<{
        healthy: boolean;
        metrics: PoolMetrics;
        issues: string[];
    }>;
    resetStats(): void;
    destroy(): void;
}
export declare const connectionPoolOptimizer: ConnectionPoolOptimizer;
export {};
//# sourceMappingURL=ConnectionPoolOptimizer.d.ts.map