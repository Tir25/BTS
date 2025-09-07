import { Pool, PoolClient } from 'pg';
export declare const pool: Pool;
export declare const checkDatabaseHealth: () => Promise<{
    healthy: boolean;
    error?: string;
}>;
export declare const closeDatabasePool: () => Promise<void>;
export declare const queryWithRetry: (text: string, params?: unknown[], maxRetries?: number) => Promise<unknown>;
export declare const initializeDatabase: () => Promise<void>;
export declare const executeOptimizedQuery: <T>(query: string, params?: any[], client?: PoolClient) => Promise<T>;
export declare const executePreparedStatement: <T>(statementName: string, params?: any[], client?: PoolClient) => Promise<T>;
export declare const analyzeQuery: (query: string, params?: any[]) => Promise<import("../services/QueryOptimizer").QueryPlan>;
export declare const getOptimizationStats: () => {
    queryOptimizer: {
        totalQueries: number;
        cachedQueries: number;
        preparedStatements: number;
        averageExecutionTime: number;
        cacheHitRate: number;
    };
    connectionPool: import("../services/ConnectionPoolOptimizer").PoolMetrics;
    queryCache: {
        totalQueries: number;
        cachedQueries: number;
        preparedStatements: number;
        averageExecutionTime: number;
        cacheHitRate: number;
    };
};
export declare const shutdownDatabase: () => Promise<void>;
export default pool;
//# sourceMappingURL=database.d.ts.map