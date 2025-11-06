import { logger } from '../../utils/logger';
import { SyncQueueItem, OfflineConfig } from './OfflineStorage';
import { IndexedDBEngine } from './indexedDBEngine';

/**
 * Sync manager
 * Handles sync queue management and data synchronization
 */
export class SyncManager {
  private syncTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  constructor(
    private dbEngine: IndexedDBEngine,
    private config: OfflineConfig
  ) {
    this.setupNetworkListeners();
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    this.onlineHandler = () => {
      this.isOnline = true;
      logger.info('🌐 Network connection restored', 'component');
      this.syncPendingData();
    };

    this.offlineHandler = () => {
      this.isOnline = false;
      logger.info('📴 Network connection lost', 'component');
    };

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  /**
   * Remove network listeners
   */
  removeNetworkListeners(): void {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
      this.offlineHandler = null;
    }
  }

  /**
   * Start sync timer
   */
  startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingData();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop sync timer
   */
  stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(
    operation: SyncQueueItem['operation'],
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const db = this.dbEngine.getDatabase();
    if (!db) {
      throw new Error('IndexedDB not initialized');
    }

    const queueItem: SyncQueueItem = {
      id: `${operation}_${Date.now()}_${Math.random()}`,
      operation,
      endpoint,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.put(queueItem);

      request.onsuccess = () => {
        logger.debug('Debug info', 'component', { data: `📋 Added to sync queue: ${queueItem.id}` });
        resolve();
      };

      request.onerror = () => {
        logger.error('❌ Failed to add to sync queue', 'component', { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Get sync queue items
   */
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = this.dbEngine.getDatabase();
    if (!db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        logger.error('❌ Failed to get sync queue', 'component', { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Remove item from sync queue
   */
  async removeFromSyncQueue(id: string): Promise<void> {
    const db = this.dbEngine.getDatabase();
    if (!db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => {
        logger.debug('Debug info', 'component', { data: `✅ Removed from sync queue:`, id });
        resolve();
      };

      request.onerror = () => {
        logger.error('❌ Failed to remove from sync queue', 'component', { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Update retry count for sync queue item
   */
  async updateRetryCount(id: string, retryCount: number): Promise<void> {
    const db = this.dbEngine.getDatabase();
    if (!db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.retryCount = retryCount;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Sync pending data
   */
  async syncPendingData(): Promise<void> {
    if (!this.isOnline) {
      logger.info('📴 Skipping sync - offline', 'component');
      return;
    }

    const queueItems = await this.getSyncQueue();
    if (queueItems.length === 0) {
      return;
    }

    logger.info('🔄 Syncing pending items', 'component', { data: `${queueItems.length} items` });

    for (const item of queueItems) {
      try {
        // Attempt to sync the item
        const response = await fetch(item.endpoint, {
          method: item.operation === 'delete' ? 'DELETE' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body:
            item.operation !== 'delete' ? JSON.stringify(item.data) : null,
        });

        if (response.ok) {
          await this.removeFromSyncQueue(item.id);
          logger.debug('Debug info', 'component', { data: `✅ Synced item: ${item.id}` });
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        logger.error('❌ Failed to sync item', 'component', { error: error instanceof Error ? error.message : String(error), itemId: item.id });

        // Increment retry count
        const newRetryCount = item.retryCount + 1;
        await this.updateRetryCount(item.id, newRetryCount);

        // Remove item if max retries exceeded
        if (newRetryCount >= 5) {
          await this.removeFromSyncQueue(item.id);
          logger.info('🗑️ Removed item after max retries', 'component', { data: item.id });
        }
      }
    }
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue(): Promise<void> {
    const db = this.dbEngine.getDatabase();
    if (!db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get sync queue items for statistics
   */
  async getSyncQueueItems(): Promise<SyncQueueItem[]> {
    const db = this.dbEngine.getDatabase();
    if (!db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

