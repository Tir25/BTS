export interface CacheOptions {
    ttl?: number;
    tags?: string[];
    compress?: boolean;
}
export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
    hitRate: number;
    totalOperations: number;
    memoryUsage?: {
        used: number;
        peak: number;
    };
}
export interface CacheHealth {
    connected: boolean;
    latency: number;
    error?: string;
    stats: CacheStats;
}
export declare class InMemoryCacheService {
    private cache;
    private stats;
    private isConnected;
    private cleanupInterval;
    private memoryUsage;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get<T = any>(key: string): Promise<T | null>;
    set(key: string, value: any, options?: CacheOptions): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    deleteMany(keys: string[]): Promise<number>;
    invalidateByTags(tags: string[]): Promise<number>;
    clear(): Promise<boolean>;
    getStats(): CacheStats;
    getHealth(): Promise<CacheHealth>;
    isCacheConnected(): boolean;
    getKeysByPattern(pattern: string): Promise<string[]>;
    getTTL(key: string): Promise<number>;
    setTTL(key: string, ttl: number): Promise<boolean>;
    private updateHitRate;
    private updateMemoryUsage;
    private startCleanupInterval;
}
export declare const inMemoryCache: InMemoryCacheService;
//# sourceMappingURL=InMemoryCacheService.d.ts.map