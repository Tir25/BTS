/**
 * Production-Grade Redis Cache Service
 * Industry-standard implementation with comprehensive error handling, monitoring, and optimization
 */

import { createClient } from 'redis';
import * as net from 'net';
import { logger } from '../utils/logger';
import config from '../config/environment';
import { inMemoryCache, InMemoryCacheService } from './InMemoryCacheService';

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

export class RedisCacheService {
  private client: any;
  private isConnected: boolean = false;
  private useFallback: boolean = false;
  private fallbackCache: InMemoryCacheService;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
    totalOperations: 0
  };
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor() {
    this.fallbackCache = inMemoryCache;
    this.initializeClient();
  }

  private initializeClient(): void {
    const redisConfig: any = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000, // Reduced timeout for faster failure
        reconnectStrategy: (retries: any) => {
          if (retries >= 2) { // Fail faster - only 2 attempts
            logger.warn('Redis connection failed, switching to in-memory cache', 'redis-cache');
            this.useFallback = true;
            return new Error('Max reconnection attempts reached');
          }
          this.reconnectAttempts = retries;
          return Math.min(retries * 1000, 2000); // Faster retry intervals
        }
      },
      retryDelayOnFailover: 500,
      enableReadyCheck: true,
      maxRetriesPerRequest: 1, // Reduced retries
    };

    this.client = createClient(redisConfig);

    // Event handlers
    this.client.on('connect', () => {
      logger.info('Redis client connecting...', 'redis-cache');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Redis client connected and ready', 'redis-cache');
    });

        this.client.on('error', (error: any) => {
      this.isConnected = false;
      this.stats.errors++;
      logger.error('Redis client error', 'redis-cache', { error: error.message });
      
      // Switch to fallback immediately on error
      if (!this.useFallback) {
        this.useFallback = true;
        logger.info('Switching to in-memory cache due to Redis error', 'redis-cache');
      }
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis client connection ended', 'redis-cache');
    });

    this.client.on('reconnecting', () => {
      logger.info(`Redis client reconnecting (attempt ${this.reconnectAttempts + 1})`, 'redis-cache');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      // Check if Redis is available first
      const testConnection = await this.testRedisConnection();
      if (!testConnection) {
        throw new Error('Redis server not available');
      }

      if (!this.client.isOpen) {
        await this.client.connect();
      }
      this.isConnected = true;
      this.useFallback = false;
      logger.info('Redis cache service connected successfully', 'redis-cache');
    } catch (error) {
      this.isConnected = false;
      this.useFallback = true;
      this.stats.errors++;
      logger.warn('Redis not available, using in-memory cache fallback', 'redis-cache', { error: String(error) });
      
      // Initialize fallback cache
      await this.fallbackCache.connect();
      logger.info('In-memory cache fallback initialized successfully', 'redis-cache');
    }
  }

  /**
   * Test Redis connection availability
   */
  private async testRedisConnection(): Promise<boolean> {
    try {
      return new Promise((resolve) => {
        const socket = net.createConnection(6379, 'localhost');
        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.on('error', () => {
          resolve(false);
        });
        socket.setTimeout(2000, () => {
          socket.destroy();
          resolve(false);
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client.isOpen) {
        await this.client.quit();
      }
      this.isConnected = false;
      this.useFallback = false;
      
      // Disconnect fallback cache
      await this.fallbackCache.disconnect();
      
      logger.info('Redis cache service disconnected', 'redis-cache');
    } catch (error) {
      logger.error('Error disconnecting from Redis', 'redis-cache', { error: String(error) });
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (this.useFallback) {
        return await this.fallbackCache.get<T>(key);
      }

      if (!this.isConnected) {
        this.stats.misses++;
        return null;
      }

      const value = await this.client.get(key);
      
      if (value === null) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      
      // Parse JSON value
      return JSON.parse(value);
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis GET error, falling back to in-memory cache', 'redis-cache', { key, error: String(error) });
      
      // Fallback to in-memory cache
      this.useFallback = true;
      return await this.fallbackCache.get<T>(key);
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      if (this.useFallback) {
        return await this.fallbackCache.set(key, value, options);
      }

      if (!this.isConnected) {
        return false;
      }

      const { ttl = 3600, tags = [], compress = false } = options;
      
      // Serialize value
      const serializedValue = JSON.stringify(value);
      
      // Set with TTL
      await this.client.setEx(key, ttl, serializedValue);
      
      // Add tags for invalidation
      if (tags.length > 0) {
        await this.client.sAdd(`tags:${key}`, tags);
        for (const tag of tags) {
          await this.client.sAdd(`tag:${tag}`, key);
        }
      }

      this.stats.sets++;
      this.updateHitRate();
      
      logger.debug('Cache SET successful', 'redis-cache', { key, ttl, tags });
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis SET error, falling back to in-memory cache', 'redis-cache', { key, error: String(error) });
      
      // Fallback to in-memory cache
      this.useFallback = true;
      return await this.fallbackCache.set(key, value, options);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (this.useFallback) {
        return await this.fallbackCache.delete(key);
      }

      if (!this.isConnected) {
        return false;
      }

      const result = await this.client.del(key);
      
      // Clean up tags
      const tags = await this.client.sMembers(`tags:${key}`);
      if (tags.length > 0) {
        for (const tag of tags) {
          await this.client.sRem(`tag:${tag}`, key);
        }
        await this.client.del(`tags:${key}`);
      }

      this.stats.deletes++;
      this.updateHitRate();
      
      return result > 0;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis DELETE error, falling back to in-memory cache', 'redis-cache', { key, error: String(error) });
      
      // Fallback to in-memory cache
      this.useFallback = true;
      return await this.fallbackCache.delete(key);
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

      const result = await this.client.del(keys);
      this.stats.deletes += result;
      this.updateHitRate();
      
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis DELETE MANY error', 'redis-cache', { keys, error: String(error) });
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
      
      for (const tag of tags) {
        const keys = await this.client.sMembers(`tag:${tag}`);
        if (keys.length > 0) {
          const result = await this.deleteMany(keys);
          deletedCount += result;
          
          // Clean up tag sets
          await this.client.del(`tag:${tag}`);
        }
      }

      logger.info('Cache invalidated by tags', 'redis-cache', { tags, deletedCount });
      return deletedCount;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis INVALIDATE BY TAGS error', 'redis-cache', { tags, error: String(error) });
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

      await this.client.flushDb();
      
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

      logger.info('Cache cleared successfully', 'redis-cache');
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis CLEAR error', 'redis-cache', { error: String(error) });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache health
   */
  async getHealth(): Promise<CacheHealth> {
    const startTime = Date.now();
    
    try {
      if (this.useFallback) {
        const fallbackHealth = await this.fallbackCache.getHealth();
        return {
          ...fallbackHealth,
          connected: true, // In-memory cache is always "connected"
          error: 'Using in-memory cache fallback'
        };
      }

      if (!this.isConnected) {
        return {
          connected: false,
          latency: 0,
          error: 'Not connected to Redis',
          stats: this.getStats()
        };
      }

      // Test connection with ping
      await this.client.ping();
      
      const latency = Date.now() - startTime;
      
      // Get memory usage if available
      let memoryUsage;
      try {
        const info = await this.client.info('memory');
        const usedMatch = info.match(/used_memory:(\d+)/);
        const peakMatch = info.match(/used_memory_peak:(\d+)/);
        
        if (usedMatch && peakMatch) {
          memoryUsage = {
            used: parseInt(usedMatch[1]),
            peak: parseInt(peakMatch[1])
          };
        }
      } catch (error) {
        // Memory info not available, continue without it
      }

      return {
        connected: true,
        latency,
        stats: {
          ...this.getStats(),
          memoryUsage
        }
      };
    } catch (error) {
      // If Redis fails, try fallback
      this.useFallback = true;
      const fallbackHealth = await this.fallbackCache.getHealth();
      return {
        ...fallbackHealth,
        connected: true,
        error: `Redis error: ${String(error)}. Using in-memory fallback.`
      };
    }
  }

  /**
   * Check if cache is connected
   */
  isCacheConnected(): boolean {
    if (this.useFallback) {
      return this.fallbackCache.isCacheConnected();
    }
    return this.isConnected && this.client.isOpen;
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
   * Get keys by pattern
   */
  async getKeysByPattern(pattern: string): Promise<string[]> {
    try {
      if (!this.isConnected) {
        return [];
      }

      return await this.client.keys(pattern);
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis KEYS error', 'redis-cache', { pattern, error: String(error) });
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

      return await this.client.ttl(key);
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis TTL error', 'redis-cache', { key, error: String(error) });
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

      const result = await this.client.expire(key, ttl);
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis EXPIRE error', 'redis-cache', { key, ttl, error: String(error) });
      return false;
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCacheService();
