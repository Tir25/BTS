/**
 * Bus Sync Service
 * 
 * Prevents race conditions when syncing bus data from API.
 * Implements per-bus mutex/lock mechanism with debouncing.
 */

import { logger } from '../utils/logger';
import { Bus } from '../types';

interface BusSyncLock {
  isSyncing: boolean;
  promise: Promise<Bus | null> | null;
  lastSyncTime: number;
  debounceTimeout: NodeJS.Timeout | null;
}

class BusSyncService {
  // Per-bus sync locks to prevent race conditions
  private syncLocks: Map<string | number, BusSyncLock> = new Map();
  
  // Debounce delay in milliseconds
  private readonly DEBOUNCE_MS = 500;
  
  // Minimum time between syncs for the same bus (in milliseconds)
  private readonly MIN_SYNC_INTERVAL = 2000; // 2 seconds

  /**
   * Sync bus data with mutex protection
   * If a sync is already in progress for this bus, returns the existing promise
   * If multiple sync requests arrive quickly, debounces them
   * 
   * @param busId - The bus ID to sync
   * @param syncFn - Function that performs the actual sync operation
   * @returns Promise resolving to the synced bus data or null
   */
  async syncBus(
    busId: string | number,
    syncFn: () => Promise<Bus | null>
  ): Promise<Bus | null> {
    const busIdStr = String(busId);
    const lock = this.getOrCreateLock(busIdStr);
    
    // If sync is already in progress, return the existing promise
    if (lock.isSyncing && lock.promise) {
      logger.debug(`🔄 Sync for bus ${busIdStr} already in progress, waiting...`, 'busSync');
      return lock.promise;
    }

    // Check if we should debounce this request
    const timeSinceLastSync = Date.now() - lock.lastSyncTime;
    if (timeSinceLastSync < this.MIN_SYNC_INTERVAL) {
      logger.debug(`⏱️ Debouncing sync for bus ${busIdStr} (${timeSinceLastSync}ms since last sync)`, 'busSync');
      
      // Clear existing debounce timeout
      if (lock.debounceTimeout) {
        clearTimeout(lock.debounceTimeout);
      }

      // Return a promise that resolves after debounce period
      return new Promise<Bus | null>((resolve) => {
        lock.debounceTimeout = setTimeout(async () => {
          try {
            const result = await this.performSync(busIdStr, syncFn);
            resolve(result);
          } catch (error) {
            logger.error(`❌ Debounced sync failed for bus ${busIdStr}`, 'busSync', { error });
            resolve(null);
          }
        }, this.DEBOUNCE_MS);
      });
    }

    // Perform sync immediately
    return this.performSync(busIdStr, syncFn);
  }

  /**
   * Internal method to perform the actual sync operation
   */
  private async performSync(
    busIdStr: string,
    syncFn: () => Promise<Bus | null>
  ): Promise<Bus | null> {
    const lock = this.getOrCreateLock(busIdStr);
    
    // Set sync lock
    lock.isSyncing = true;
    lock.lastSyncTime = Date.now();
    
    logger.info(`🔄 Starting sync for bus ${busIdStr}`, 'busSync');
    
    // Create sync promise
    const syncPromise = syncFn()
      .then((result) => {
        logger.info(`✅ Sync completed for bus ${busIdStr}`, 'busSync');
        return result;
      })
      .catch((error) => {
        logger.error(`❌ Sync failed for bus ${busIdStr}`, 'busSync', { error });
        return null;
      })
      .finally(() => {
        // Release lock
        lock.isSyncing = false;
        lock.promise = null;
        
        // Clean up debounce timeout if exists
        if (lock.debounceTimeout) {
          clearTimeout(lock.debounceTimeout);
          lock.debounceTimeout = null;
        }
      });

    lock.promise = syncPromise;
    return syncPromise;
  }

  /**
   * Get or create a sync lock for a bus
   */
  private getOrCreateLock(busIdStr: string): BusSyncLock {
    if (!this.syncLocks.has(busIdStr)) {
      this.syncLocks.set(busIdStr, {
        isSyncing: false,
        promise: null,
        lastSyncTime: 0,
        debounceTimeout: null,
      });
    }
    return this.syncLocks.get(busIdStr)!;
  }

  /**
   * Check if a bus is currently syncing
   */
  isBusSyncing(busId: string | number): boolean {
    const busIdStr = String(busId);
    const lock = this.syncLocks.get(busIdStr);
    return lock?.isSyncing ?? false;
  }

  /**
   * Cancel any pending sync for a bus
   */
  cancelSync(busId: string | number): void {
    const busIdStr = String(busId);
    const lock = this.syncLocks.get(busIdStr);
    
    if (lock) {
      if (lock.debounceTimeout) {
        clearTimeout(lock.debounceTimeout);
        lock.debounceTimeout = null;
      }
      lock.isSyncing = false;
      lock.promise = null;
      logger.debug(`🚫 Cancelled sync for bus ${busIdStr}`, 'busSync');
    }
  }

  /**
   * Clear all sync locks (useful for cleanup)
   */
  clearAllLocks(): void {
    // Cancel all pending timeouts
    this.syncLocks.forEach((lock) => {
      if (lock.debounceTimeout) {
        clearTimeout(lock.debounceTimeout);
      }
    });
    
    this.syncLocks.clear();
    logger.info('🧹 Cleared all bus sync locks', 'busSync');
  }

  /**
   * Get sync statistics
   */
  getStats(): {
    totalLocks: number;
    activeSyncs: number;
    busesWithLocks: string[];
  } {
    const busesWithLocks: string[] = [];
    let activeSyncs = 0;

    this.syncLocks.forEach((lock, busId) => {
      busesWithLocks.push(String(busId));
      if (lock.isSyncing) {
        activeSyncs++;
      }
    });

    return {
      totalLocks: this.syncLocks.size,
      activeSyncs,
      busesWithLocks,
    };
  }
}

// Export singleton instance
export const busSyncService = new BusSyncService();
export default busSyncService;

