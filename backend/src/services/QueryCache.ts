// In-Memory Query Result Cache for Database Optimization

export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
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

class QueryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private preparedStatements: Map<string, PreparedStatement> = new Map();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private accessTimes: number[] = [];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      ttl: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      enableMetrics: true,
      ...config,
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      hitRate: 0,
      averageAccessTime: 0,
    };

    this.startCleanupTimer();
  }

  // Generate cache key from query and parameters
  private generateKey(query: string, params: any[] = []): string {
    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    const paramsString = JSON.stringify(params);
    return `${normalizedQuery}:${paramsString}`;
  }

  // Get cached result
  get<T>(query: string, params: any[] = []): T | null {
    const startTime = Date.now();
    const key = this.generateKey(query, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      this.updateMetrics();
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateMetrics();
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.metrics.hits++;
    this.accessTimes.push(Date.now() - startTime);
    
    // Keep only last 100 access times for average calculation
    if (this.accessTimes.length > 100) {
      this.accessTimes.shift();
    }

    this.updateMetrics();
    return entry.data as T;
  }

  // Set cached result
  set<T>(query: string, params: any[] = [], data: T, customTtl?: number): void {
    const key = this.generateKey(query, params);
    const ttl = customTtl || this.config.ttl;

    // Check if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.updateMetrics();
  }

  // Evict least recently used entry
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  // Invalidate cache entries matching pattern
  invalidate(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.metrics.evictions++;
    });

    this.updateMetrics();
  }

  // Clear all cache entries
  clear(): void {
    this.cache.clear();
    this.metrics.evictions += this.metrics.size;
    this.updateMetrics();
  }

  // Update metrics
  private updateMetrics(): void {
    this.metrics.size = this.cache.size;
    this.metrics.hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
    this.metrics.averageAccessTime = this.accessTimes.length > 0 
      ? this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length 
      : 0;
  }

  // Get cache metrics
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  // Start cleanup timer
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.metrics.evictions++;
    });

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
      this.updateMetrics();
    }
  }

  // Prepared statement management
  prepareStatement(id: string, query: string, params: any[] = []): PreparedStatement {
    const statement: PreparedStatement = {
      id,
      query,
      params,
      compiled: false,
      lastUsed: Date.now(),
      useCount: 0,
    };

    this.preparedStatements.set(id, statement);
    return statement;
  }

  // Get prepared statement
  getPreparedStatement(id: string): PreparedStatement | null {
    const statement = this.preparedStatements.get(id);
    if (statement) {
      statement.lastUsed = Date.now();
      statement.useCount++;
    }
    return statement || null;
  }

  // Execute prepared statement with caching
  async executePreparedStatement<T>(
    id: string,
    params: any[] = [],
    executor: (query: string, params: any[]) => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    const statement = this.getPreparedStatement(id);
    if (!statement) {
      throw new Error(`Prepared statement '${id}' not found`);
    }

    // Check cache first
    const cacheKeyToUse = cacheKey || this.generateKey(statement.query, params);
    const cached = this.get<T>(statement.query, params);
    if (cached !== null) {
      return cached;
    }

    // Execute query
    const result = await executor(statement.query, params);
    
    // Cache result
    this.set(statement.query, params, result);
    
    return result;
  }

  // Get prepared statement statistics
  getPreparedStatementStats(): { id: string; useCount: number; lastUsed: number }[] {
    return Array.from(this.preparedStatements.values()).map(stmt => ({
      id: stmt.id,
      useCount: stmt.useCount,
      lastUsed: stmt.lastUsed,
    }));
  }

  // Clear prepared statements
  clearPreparedStatements(): void {
    this.preparedStatements.clear();
  }

  // Get cache statistics
  getCacheStats(): {
    totalEntries: number;
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    averageAccessTime: number;
    topQueries: { key: string; hits: number }[];
  } {
    const entries = Array.from(this.cache.values());
    const topQueries = entries
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10)
      .map(entry => ({ key: entry.key, hits: entry.hits }));

    return {
      totalEntries: this.cache.size,
      totalHits: this.metrics.hits,
      totalMisses: this.metrics.misses,
      hitRate: this.metrics.hitRate,
      averageAccessTime: this.metrics.averageAccessTime,
      topQueries,
    };
  }

  // Destroy cache
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.cache.clear();
    this.preparedStatements.clear();
    this.accessTimes = [];
  }
}

export const queryCache = new QueryCache();

