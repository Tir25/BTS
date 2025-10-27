import { logger } from '../../utils/logger';

// Offline-First Architecture with IndexedDB
export interface OfflineData {
  id: string;
  type: 'bus' | 'route' | 'location' | 'driver' | 'user';
  data: Record<string, unknown>;
  timestamp: number;
  version: number;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  endpoint: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

export interface OfflineConfig {
  dbName: string;
  dbVersion: number;
  maxAge: number; // Max age of cached data in ms
  maxSize: number; // Max number of items to store
  syncInterval: number; // Sync interval in ms
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor(
    private config: OfflineConfig = {
      dbName: 'BusTrackingOffline',
      dbVersion: 1,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000,
      syncInterval: 30000, // 30 seconds
    }
  ) {
    this.initializeDB();
    this.setupNetworkListeners();
    this.startSyncTimer();
  }

  // Initialize IndexedDB
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = () => {
        logger.error('❌ Failed to open IndexedDB', 'component', { error: request.error });
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('✅ IndexedDB initialized successfully', 'component');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('offlineData')) {
          const dataStore = db.createObjectStore('offlineData', {
            keyPath: 'id',
          });
          dataStore.createIndex('type', 'type', { unique: false });
          dataStore.createIndex('timestamp', 'timestamp', { unique: false });
          dataStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
          });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('retryCount', 'retryCount', { unique: false });
        }

        logger.info('✅ IndexedDB schema upgraded', 'component');
      };
    });
  }

  // Setup network status listeners with proper cleanup tracking
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;
  
  private setupNetworkListeners(): void {
    // Create named handlers for proper cleanup
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
  
  // Remove network listeners
  private removeNetworkListeners(): void {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
      this.offlineHandler = null;
    }
  }

  // Start sync timer
  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingData();
      }
    }, this.config.syncInterval);
  }

  // Store data offline
  async storeData(
    type: OfflineData['type'],
    id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const offlineData: OfflineData = {
      id,
      type,
      data,
      timestamp: Date.now(),
      version: 1,
      syncStatus: 'synced',
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      const request = store.put(offlineData);

      request.onsuccess = () => {
        logger.debug('Debug info', 'component', { data: `💾 Stored ${type} data offline: ${id}` });
        resolve();
      };

      request.onerror = () => {
        logger.error('❌ Failed to store data offline', 'component', { error: request.error });
        reject(request.error);
      };
    });
  }

  // Get data from offline storage
  async getData(type: OfflineData['type'], id: string): Promise<Record<string, unknown> | null> {
    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.type === type) {
          // Check if data is still fresh
          if (Date.now() - result.timestamp < this.config.maxAge) {
            resolve(result.data);
          } else {
            // Data is stale, remove it
            this.removeData(type, id);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        logger.error('❌ Failed to get data from offline storage', 'component', { error: request.error });
        reject(request.error);
      };
    });
  }

  // Get all data of a specific type
  async getAllData(type: OfflineData['type']): Promise<Record<string, unknown>[]> {
    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => {
        const results = request.result;
        const freshData = results
          .filter((item) => Date.now() - item.timestamp < this.config.maxAge)
          .map((item) => item.data);
        resolve(freshData);
      };

      request.onerror = () => {
        logger.error('❌ Failed to get all data from offline storage', 'component', { error: request.error });
        reject(request.error);
      };
    });
  }

  // Remove data from offline storage
  async removeData(type: OfflineData['type'], id: string): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      const request = store.delete(id);

      request.onsuccess = () => {
        logger.debug('Debug info', 'component', { data: `🗑️ Removed ${type} data from offline storage: ${id}` });
        resolve();
      };

      request.onerror = () => {
        logger.error('❌ Failed to remove data from offline storage', 'component', { error: request.error });
        reject(request.error);
      };
    });
  }

  // Add item to sync queue
  async addToSyncQueue(
    operation: SyncQueueItem['operation'],
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<void> {
    if (!this.db) {
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
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
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

  // Get sync queue items
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
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

  // Remove item from sync queue
  async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
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

  // Update retry count for sync queue item
  async updateRetryCount(id: string, retryCount: number): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
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

  // Sync pending data
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

  // Clear all offline data
  async clearAll(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['offlineData', 'syncQueue'],
        'readwrite'
      );
      const dataStore = transaction.objectStore('offlineData');
      const queueStore = transaction.objectStore('syncQueue');

      const dataRequest = dataStore.clear();
      const queueRequest = queueStore.clear();

      dataRequest.onsuccess = () => {
        queueRequest.onsuccess = () => {
          logger.info('🗑️ Cleared all offline data', 'component');
          resolve();
        };
        queueRequest.onerror = () => reject(queueRequest.error);
      };
      dataRequest.onerror = () => reject(dataRequest.error);
    });
  }

  // Get storage statistics
  async getStats(): Promise<{
    totalItems: number;
    dataByType: Record<string, number>;
    queueItems: number;
    totalSize: number;
  }> {
    if (!this.db) {
      return { totalItems: 0, dataByType: {}, queueItems: 0, totalSize: 0 };
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['offlineData', 'syncQueue'],
        'readonly'
      );
      const dataStore = transaction.objectStore('offlineData');
      const queueStore = transaction.objectStore('syncQueue');

      const dataRequest = dataStore.getAll();
      const queueRequest = queueStore.getAll();

      dataRequest.onsuccess = () => {
        queueRequest.onsuccess = () => {
          const dataItems = dataRequest.result;
          const queueItems = queueRequest.result;

          const dataByType: Record<string, number> = {};
          dataItems.forEach((item) => {
            dataByType[item.type] = (dataByType[item.type] || 0) + 1;
          });

          resolve({
            totalItems: dataItems.length,
            dataByType,
            queueItems: queueItems.length,
            totalSize:
              JSON.stringify(dataItems).length +
              JSON.stringify(queueItems).length,
          });
        };
        queueRequest.onerror = () => reject(queueRequest.error);
      };
      dataRequest.onerror = () => reject(dataRequest.error);
    });
  }

  // Cleanup resources
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    // Remove network listeners
    this.removeNetworkListeners();
    
    logger.info('OfflineStorage destroyed - all listeners and timers cleared', 'component');
  }
}

// Global offline storage instance
export const offlineStorage = new OfflineStorage();

export default OfflineStorage;
