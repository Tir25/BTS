import { Pool } from 'pg';
export declare const pool: Pool;
export declare const checkDatabaseHealth: () => Promise<{
    healthy: boolean;
    error?: string;
    metrics?: {
        poolStats: {
            totalCount: number;
            idleCount: number;
            waitingCount: number;
        };
        responseTime: number;
        version: string;
        uptime: string;
    };
}>;
export declare const closeDatabasePool: () => Promise<void>;
export declare const queryWithRetry: (text: string, params?: unknown[], maxRetries?: number) => Promise<unknown>;
export declare const initializeDatabase: () => Promise<void>;
export declare const startDatabaseMonitoring: () => void;
export declare const stopDatabaseMonitoring: () => void;
export declare const getPoolMetrics: () => {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
    utilization: number;
};
export default pool;
//# sourceMappingURL=database.d.ts.map