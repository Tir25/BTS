export interface CacheConfig {
    maxSize: number;
    ttl: number;
    cleanupInterval: number;
    enableMetrics: boolean;
}
export interface CacheEntry<T = any> {
    key: string;
    data: T;
    timestamp: number;
    ttl: number;
    hits: number;
    lastAccessed: number;
}
export interface CacheMetrics {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
    hitRate: number;
    averageAccessTime: number;
}
export interface PreparedStatement {
    id: string;
    query: string;
    params: any[];
    compiled: boolean;
    lastUsed: number;
    useCount: number;
}
declare class QueryCache {
    private cache;
    private preparedStatements;
    private config;
    private metrics;
    private cleanupTimer;
    private accessTimes;
    constructor(config?: Partial<CacheConfig>);
    private generateKey;
    get<T>(query: string, params?: any[]): T | null;
    set<T>(query: string, params: any[] | undefined, data: T, customTtl?: number): void;
    private evictLeastRecentlyUsed;
    invalidate(pattern: string | RegExp): void;
    clear(): void;
    private updateMetrics;
    getMetrics(): CacheMetrics;
    private startCleanupTimer;
    private cleanup;
    prepareStatement(id: string, query: string, params?: any[]): PreparedStatement;
    getPreparedStatement(id: string): PreparedStatement | null;
    executePreparedStatement<T>(id: string, params: any[] | undefined, executor: (query: string, params: any[]) => Promise<T>, cacheKey?: string): Promise<T>;
    getPreparedStatementStats(): {
        id: string;
        useCount: number;
        lastUsed: number;
    }[];
    clearPreparedStatements(): void;
    getCacheStats(): {
        totalEntries: number;
        totalHits: number;
        totalMisses: number;
        hitRate: number;
        averageAccessTime: number;
        topQueries: {
            key: string;
            hits: number;
        }[];
    };
    destroy(): void;
}
export declare const queryCache: QueryCache;
export {};
//# sourceMappingURL=QueryCache.d.ts.map