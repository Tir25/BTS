/**
 * Unified Data Service
 * Centralized data management with real-time synchronization
 * Production-ready with comprehensive error handling and caching
 */

import { logger } from '../utils/logger';

export interface DataCache<T> {
  data: T | null;
  timestamp: number;
  ttl: number;
  version: number;
}

export interface DataServiceConfig {
  defaultTTL: number;
  maxRetries: number;
  retryDelay: number;
  enableRealTime: boolean;
}

export class UnifiedDataService {
  private static instance: UnifiedDataService;
  private cache: Map<string, DataCache<any>> = new Map();
  private config: DataServiceConfig;
  private realTimeSubscriptions: Map<string, () => void> = new Map();

  private constructor(config: Partial<DataServiceConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxRetries: 3,
      retryDelay: 1000,
      enableRealTime: true,
      ...config
    };
  }

  public static getInstance(config?: Partial<DataServiceConfig>): UnifiedDataService {
    if (!UnifiedDataService.instance) {
      UnifiedDataService.instance = new UnifiedDataService(config);
    }
    return UnifiedDataService.instance;
  }

  /**
   * Get data with caching and error handling
   */
  async getData<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      forceRefresh?: boolean;
      retryOnError?: boolean;
    } = {}
  ): Promise<T | null> {
    const { ttl = this.config.defaultTTL, forceRefresh = false, retryOnError = true } = options;
    const now = Date.now();

    // Check cache first
    if (!forceRefresh) {
      const cached = this.cache.get(key);
      if (cached && (now - cached.timestamp) < cached.ttl) {
        logger.debug(`📦 Cache hit for ${key}`, 'data-service');
        return cached.data;
      }
    }

    // Fetch data with retry logic
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        logger.debug(`🔄 Fetching data for ${key} (attempt ${attempt})`, 'data-service');
        const data = await fetcher();
        
        // Cache the result
        this.cache.set(key, {
          data,
          timestamp: now,
          ttl,
          version: (this.cache.get(key)?.version || 0) + 1
        });

        logger.info(`✅ Data fetched successfully for ${key}`, 'data-service');
        return data;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`⚠️ Fetch attempt ${attempt} failed for ${key}`, 'data-service', { 
          error: lastError.message,
          attempt,
          maxRetries: this.config.maxRetries
        });

        if (attempt < this.config.maxRetries && retryOnError) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    // All retries failed
    logger.error(`❌ Failed to fetch data for ${key} after ${this.config.maxRetries} attempts`, 'data-service', { 
      error: lastError?.message 
    });

    // Return cached data if available (stale but better than nothing)
    const cached = this.cache.get(key);
    if (cached) {
      logger.warn(`⚠️ Returning stale data for ${key}`, 'data-service');
      return cached.data;
    }

    return null;
  }

  /**
   * Set data in cache
   */
  setData<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      version: (this.cache.get(key)?.version || 0) + 1
    });
    logger.debug(`💾 Data cached for ${key}`, 'data-service');
  }

  /**
   * Invalidate cache for a key
   */
  invalidateCache(key: string): void {
    this.cache.delete(key);
    logger.debug(`🗑️ Cache invalidated for ${key}`, 'data-service');
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('🗑️ All cache cleared', 'data-service');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalKeys: number;
    memoryUsage: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const keys = Array.from(this.cache.keys());
    const now = Date.now();
    
    let memoryUsage = 0;
    let oldestEntry = now;
    let newestEntry = 0;

    for (const [key, cache] of this.cache.entries()) {
      memoryUsage += JSON.stringify(cache.data).length;
      oldestEntry = Math.min(oldestEntry, cache.timestamp);
      newestEntry = Math.max(newestEntry, cache.timestamp);
    }

    return {
      totalKeys: keys.length,
      memoryUsage,
      hitRate: 0, // Would need to track hits/misses
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cache] of this.cache.entries()) {
      if ((now - cache.timestamp) >= cache.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 Cleaned up ${cleaned} expired cache entries`, 'data-service');
    }
  }

  /**
   * Start real-time updates for a key
   */
  startRealTimeUpdates<T>(
    key: string,
    updater: (data: T) => void,
    fetcher: () => Promise<T>,
    interval: number = 30000
  ): void {
    if (!this.config.enableRealTime) {
      logger.warn('Real-time updates disabled', 'data-service');
      return;
    }

    // Stop existing subscription if any
    this.stopRealTimeUpdates(key);

    const intervalId = setInterval(async () => {
      try {
        const data = await this.getData(key, fetcher, { forceRefresh: true });
        if (data) {
          updater(data);
        }
      } catch (error) {
        logger.error(`Real-time update failed for ${key}`, 'data-service', { error: String(error) });
      }
    }, interval);

    this.realTimeSubscriptions.set(key, () => clearInterval(intervalId));
    logger.info(`🔄 Real-time updates started for ${key}`, 'data-service');
  }

  /**
   * Stop real-time updates for a key
   */
  stopRealTimeUpdates(key: string): void {
    const unsubscribe = this.realTimeSubscriptions.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.realTimeSubscriptions.delete(key);
      logger.info(`⏹️ Real-time updates stopped for ${key}`, 'data-service');
    }
  }

  /**
   * Stop all real-time updates
   */
  stopAllRealTimeUpdates(): void {
    for (const [key, unsubscribe] of this.realTimeSubscriptions.entries()) {
      unsubscribe();
    }
    this.realTimeSubscriptions.clear();
    logger.info('⏹️ All real-time updates stopped', 'data-service');
  }

  /**
   * Batch multiple data requests
   */
  async batchGet<T>(
    requests: Array<{
      key: string;
      fetcher: () => Promise<T>;
      ttl?: number;
    }>
  ): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    // Execute all requests in parallel
    const promises = requests.map(async ({ key, fetcher, ttl }) => {
      const data = await this.getData(key, fetcher, { ttl });
      results.set(key, data);
    });

    await Promise.allSettled(promises);
    logger.info(`📦 Batch request completed for ${requests.length} items`, 'data-service');
    
    return results;
  }

  /**
   * Utility method for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAllRealTimeUpdates();
    this.clearCache();
    logger.info('🧹 UnifiedDataService destroyed', 'data-service');
  }
}

// Export singleton instance
export const unifiedDataService = UnifiedDataService.getInstance();
export default unifiedDataService;
