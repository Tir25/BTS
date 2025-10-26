import { Pool } from 'pg';
export interface PoolMetrics {
    totalConnections: number;
    idleConnections: number;
    activeConnections: number;
    waitingClients: number;
    utilization: number;
    averageWaitTime: number;
    connectionErrors: number;
    connectionTimeouts: number;
    lastActivity: Date;
    healthScore: number;
}
export interface PoolOptimization {
    recommendedMaxConnections: number;
    recommendedIdleTimeout: number;
    recommendedConnectionTimeout: number;
    performanceScore: number;
    bottlenecks: string[];
    recommendations: string[];
}
export interface PoolAlert {
    type: 'warning' | 'critical' | 'info';
    message: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: Date;
}
export declare class ConnectionPoolMonitor {
    private pool;
    private metrics;
    private alerts;
    private monitoringInterval;
    private startTime;
    private connectionErrors;
    private connectionTimeouts;
    private totalWaitTime;
    private waitCount;
    private readonly THRESHOLDS;
    constructor(pool: Pool);
    startMonitoring(intervalMs?: number): void;
    stopMonitoring(): void;
    getMetrics(): PoolMetrics;
    getOptimization(): PoolOptimization;
    getAlerts(): PoolAlert[];
    clearAlerts(): void;
    getHealth(): {
        healthy: boolean;
        score: number;
        issues: string[];
    };
    private initializeMetrics;
    private setupEventListeners;
    private collectMetrics;
    private checkAlerts;
    private addAlert;
    private optimizePool;
    private calculateErrorRate;
    private calculateHealthScore;
    private calculateOptimalMaxConnections;
    private calculateOptimalIdleTimeout;
    private calculateOptimalConnectionTimeout;
}
export declare const connectionPoolMonitor: ConnectionPoolMonitor;
//# sourceMappingURL=ConnectionPoolMonitor.d.ts.map