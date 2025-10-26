export interface PerformanceThresholds {
    memoryUsage: number;
    responseTime: number;
    errorRate: number;
    cacheHitRate: number;
    databaseConnections: number;
}
export interface PreventiveAction {
    type: 'cache_clear' | 'gc_trigger' | 'connection_reset' | 'alert_threshold';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    autoExecute: boolean;
}
export declare class PerformanceGuard {
    private thresholds;
    private isMonitoring;
    private monitoringInterval;
    private lastGcTime;
    private gcCooldown;
    constructor();
    startMonitoring(): void;
    stopMonitoring(): void;
    private checkPerformance;
    private executePreventiveAction;
    private triggerGarbageCollection;
    private clearCache;
    private resetConnections;
    private sendAlert;
    updateThresholds(newThresholds: Partial<PerformanceThresholds>): void;
    getThresholds(): PerformanceThresholds;
    getStatus(): {
        monitoring: boolean;
        thresholds: PerformanceThresholds;
        lastGcTime: number;
        gcCooldown: number;
    };
}
export declare const performanceGuard: PerformanceGuard;
//# sourceMappingURL=performanceGuard.d.ts.map