export interface SystemMetrics {
    timestamp: Date;
    uptime: number;
    memory: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
        arrayBuffers: number;
    };
    cpu: {
        user: number;
        system: number;
        usage: number;
    };
    eventLoop: {
        lag: number;
        utilization: number;
    };
    database: {
        poolMetrics: any;
        health: any;
    };
    redis: {
        health: any;
        stats: any;
    };
    websocket: {
        health: any;
        stats: any;
    };
    performance: {
        responseTime: number;
        throughput: number;
        errorRate: number;
    };
}
export interface Alert {
    id: string;
    type: 'critical' | 'warning' | 'info';
    category: 'memory' | 'cpu' | 'database' | 'redis' | 'websocket' | 'performance';
    title: string;
    message: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;
}
export interface AlertRule {
    id: string;
    name: string;
    category: string;
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    severity: 'critical' | 'warning' | 'info';
    enabled: boolean;
    cooldown: number;
}
export interface MonitoringConfig {
    collectionInterval: number;
    retentionPeriod: number;
    alertCooldown: number;
    maxAlerts: number;
    enableAlerts: boolean;
    enableMetrics: boolean;
}
export declare class MonitoringService {
    private metrics;
    private alerts;
    private alertRules;
    private config;
    private monitoringInterval;
    private startTime;
    private requestCount;
    private errorCount;
    private totalResponseTime;
    constructor();
    start(): void;
    stop(): void;
    getMetrics(): SystemMetrics | null;
    getMetricsHistory(limit?: number): SystemMetrics[];
    getActiveAlerts(): Alert[];
    getAllAlerts(limit?: number): Alert[];
    getAlertRules(): AlertRule[];
    addAlertRule(rule: Omit<AlertRule, 'id'>): string;
    updateAlertRule(id: string, updates: Partial<AlertRule>): boolean;
    deleteAlertRule(id: string): boolean;
    resolveAlert(id: string): boolean;
    recordRequest(responseTime: number, isError?: boolean): void;
    getSystemHealth(): Promise<{
        overall: 'healthy' | 'degraded' | 'critical';
        services: Record<string, 'healthy' | 'degraded' | 'critical'>;
        alerts: number;
        uptime: number;
        performance: {
            responseTime: number;
            throughput: number;
            errorRate: number;
        };
    }>;
    private collectMetrics;
    private checkAlerts;
    private createAlert;
    private getMetricValue;
    private evaluateRule;
    private measureEventLoopLag;
    private calculateCpuUsage;
    private calculateEventLoopUtilization;
    private cleanupOldData;
    private initializeAlertRules;
}
export declare const monitoringService: MonitoringService;
//# sourceMappingURL=MonitoringService.d.ts.map