import { PoolClient } from 'pg';
export interface QueryPlan {
    query: string;
    estimatedCost: number;
    executionTime: number;
    rowsReturned: number;
    indexesUsed: string[];
    optimizationSuggestions: string[];
}
export interface OptimizedQuery {
    originalQuery: string;
    optimizedQuery: string;
    improvements: string[];
    estimatedImprovement: number;
}
export interface QueryOptimizationConfig {
    enableCaching: boolean;
    enablePreparedStatements: boolean;
    enableQueryAnalysis: boolean;
    cacheTtl: number;
    maxCacheSize: number;
}
declare class QueryOptimizer {
    private config;
    private preparedStatements;
    private queryPlans;
    constructor(config?: Partial<QueryOptimizationConfig>);
    executeOptimizedQuery<T>(query: string, params?: any[], client?: PoolClient, cacheKey?: string): Promise<T>;
    private optimizeQuery;
    private optimizeSelectQuery;
    private optimizeInsertQuery;
    private optimizeUpdateQuery;
    private optimizeDeleteQuery;
    private mightReturnManyRows;
    private optimizeOrderBy;
    private optimizeWhereClause;
    analyzeQuery(query: string, params?: any[]): Promise<QueryPlan>;
    private extractIndexesUsed;
    private generateOptimizationSuggestions;
    getQueryPlan(query: string): QueryPlan | null;
    getAllQueryPlans(): QueryPlan[];
    getSlowQueries(threshold?: number): QueryPlan[];
    getExpensiveQueries(threshold?: number): QueryPlan[];
    prepareStatement(name: string, query: string): void;
    executePreparedStatement<T>(name: string, params?: any[], client?: PoolClient): Promise<T>;
    getPreparedStatements(): {
        name: string;
        query: string;
    }[];
    clearPreparedStatements(): void;
    getOptimizationStats(): {
        totalQueries: number;
        cachedQueries: number;
        preparedStatements: number;
        averageExecutionTime: number;
        cacheHitRate: number;
    };
    updateConfig(newConfig: Partial<QueryOptimizationConfig>): void;
    clear(): void;
    destroy(): void;
}
export declare const queryOptimizer: QueryOptimizer;
export {};
//# sourceMappingURL=QueryOptimizer.d.ts.map