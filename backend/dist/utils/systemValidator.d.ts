export interface ValidationResult {
    component: string;
    status: 'healthy' | 'degraded' | 'critical';
    score: number;
    issues: string[];
    recommendations: string[];
    lastChecked: Date;
}
export interface SystemValidation {
    overall: 'healthy' | 'degraded' | 'critical';
    score: number;
    components: ValidationResult[];
    criticalIssues: number;
    warnings: number;
    timestamp: Date;
}
export declare class SystemValidator {
    private validationInterval;
    private isRunning;
    startValidation(intervalMs?: number): void;
    stopValidation(): void;
    validateSystem(): Promise<SystemValidation>;
    private validateRedis;
    private validateDatabase;
    private validateWebSocket;
    private validateMemory;
    private validatePerformance;
    private calculateOverallStatus;
    private calculateOverallScore;
    getStatus(): {
        running: boolean;
        lastValidation?: Date;
    };
}
export declare const systemValidator: SystemValidator;
//# sourceMappingURL=systemValidator.d.ts.map