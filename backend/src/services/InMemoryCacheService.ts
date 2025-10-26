/**
 * In-Memory Cache Service for Development
 * Fallback when Redis is not available
 */

import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  compress?: boolean; // Enable compression for large values
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

interface CacheItem {
  value: any;
  expiresAt: number;
  tags: string[];
}

export class InMemoryCacheService {
  private cache: Map<string, CacheItem> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
    totalOperations: 0
  };
  private isConnected: boolean = true;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryUsage: { used: number; peak: number } = { used: 0, peak: 0 };

  constructor() {
    this.startCleanupInterval();
    logger.info('In-memory cache service initialized', 'in-memory-cache');
  }

  /**
   * Connect to cache (always successful for in-memory)
   */
  async connect(): Promise<void> {
    this.isConnected = true;
    logger.info('In-memory cache service connected', 'in-memory-cache');
  }

  /**
   * Disconnect from cache
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    logger.info('In-memory cache service disconnected', 'in-memory-cache');
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        this.stats.misses++;
        return null;
      }

      const item = this.cache.get(key);
      
      if (!item) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // Check if expired
      if (Date.now() > item.expiresAt) {
        this.cache.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      
      return item.value;
    } catch (error) {
      this.stats.errors++;
      logger.error('In-memory cache GET error', 'in-memory-cache', { key, error: String(error) });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const { ttl = 3600, tags = [] } = options;
      const expiresAt = Date.now() + (ttl * 1000);
      
      this.cache.set(key, {
        value,
        expiresAt,
        tags
      });

      this.stats.sets++;
      this.updateHitRate();
      this.updateMemoryUsage();
      
      logger.debug('In-memory cache SET successful', 'in-memory-cache', { key, ttl, tags });
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('In-memory cache SET error', 'in-memory-cache', { key, error: String(error) });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = this.cache.delete(key);
      
      this.stats.deletes++;
      this.updateHitRate();
      this.updateMemoryUsage();
      
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('In-memory cache DELETE error', 'in-memory-cache', { key, error: String(error) });
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<number> {
    try {
      if (!this.isConnected || keys.length === 0) {
        return 0;
      }

      let deletedCount = 0;
      for (const key of keys) {
        if (this.cache.delete(key)) {
          deletedCount++;
        }
      }
      
      this.stats.deletes += deletedCount;
      this.updateHitRate();
      this.updateMemoryUsage();
      
      return deletedCount;
    } catch (error) {
      this.stats.errors++;
      logger.error('In-memory cache DELETE MANY error', 'in-memory-cache', { keys, error: String(error) });
      return 0;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      if (!this.isConnected || tags.length === 0) {
        return 0;
      }

      let deletedCount = 0;
      const keysToDelete: string[] = [];
      
      for (const [key, item] of this.cache.entries()) {
        if (item.tags.some(tag => tags.includes(tag))) {
          keysToDelete.push(key);
        }
      }
      
      deletedCount = await this.deleteMany(keysToDelete);
      
      logger.info('Cache invalidated by tags', 'in-memory-cache', { tags, deletedCount });
      return deletedCount;
    } catch (error) {
      this.stats.errors++;
      logger.error('In-memory cache INVALIDATE BY TAGS error', 'in-memory-cache', { tags, error: String(error) });
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      this.cache.clear();
      
      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        hitRate: 0,
        totalOperations: 0
      };

      this.memoryUsage = { used: 0, peak: 0 };
      
      logger.info('Cache cleared successfully', 'in-memory-cache');
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('In-memory cache CLEAR error', 'in-memory-cache', { error: String(error) });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats, memoryUsage: this.memoryUsage };
  }

  /**
   * Get cache health
   */
  async getHealth(): Promise<CacheHealth> {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected) {
        return {
          connected: false,
          latency: 0,
          error: 'Not connected to cache',
          stats: this.getStats()
        };
      }

      // Test with a simple operation
      await this.set('health-check', 'ok', { ttl: 1 });
      await this.get('health-check');
      await this.delete('health-check');
      
      const latency = Date.now() - startTime;
      
      return {
        connected: true,
        latency,
        stats: this.getStats()
      };
    } catch (error) {
      return {
        connected: false,
        latency: Date.now() - startTime,
        error: String(error),
        stats: this.getStats()
      };
    }
  }

  /**
   * Check if cache is connected
   */
  isCacheConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get keys by pattern
   */
  async getKeysByPattern(pattern: string): Promise<string[]> {
    try {
      if (!this.isConnected) {
        return [];
      }

      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return Array.from(this.cache.keys()).filter(key => regex.test(key));
    } catch (error) {
      this.stats.errors++;
      logger.error('In-memory cache KEYS error', 'in-memory-cache', { pattern, error: String(error) });
      return [];
    }
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        return -1;
      }

      const item = this.cache.get(key);
      if (!item) {
        return -1;
      }

      const remaining = Math.max(0, Math.floor((item.expiresAt - Date.now()) / 1000));
      return remaining;
    } catch (error) {
      this.stats.errors++;
      logger.error('In-memory cache TTL error', 'in-memory-cache', { key, error: String(error) });
      return -1;
    }
  }

  /**
   * Set TTL for a key
   */
  async setTTL(key: string, ttl: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const item = this.cache.get(key);
      if (!item) {
        return false;
      }

      item.expiresAt = Date.now() + (ttl * 1000);
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('In-memory cache EXPIRE error', 'in-memory-cache', { key, ttl, error: String(error) });
      return false;
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    this.stats.totalOperations = this.stats.hits + this.stats.misses + this.stats.sets + this.stats.deletes;
    this.stats.hitRate = this.stats.totalOperations > 0 ? 
      Math.round((this.stats.hits / this.stats.totalOperations) * 100) : 0;
  }

  /**
   * Update memory usage tracking
   */
  private updateMemoryUsage(): void {
    const used = this.cache.size;
    this.memoryUsage.used = used;
    this.memoryUsage.peak = Math.max(this.memoryUsage.peak, used);
  }

  /**
   * Start cleanup interval for expired items
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.debug('Cleaned expired cache items', 'in-memory-cache', { count: cleanedCount });
        this.updateMemoryUsage();
      }
    }, 60000); // Clean every minute
  }
}

// Export singleton instance
export const inMemoryCache = new InMemoryCacheService();
