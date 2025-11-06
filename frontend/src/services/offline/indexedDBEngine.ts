import { logger } from '../../utils/logger';
import { OfflineData, OfflineConfig } from './OfflineStorage';

/**
 * IndexedDB engine
 * Handles IndexedDB initialization and operations
 */
export class IndexedDBEngine {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async initialize(config: OfflineConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(config.dbName, config.dbVersion);

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

  /**
   * Get database instance
   */
  getDatabase(): IDBDatabase | null {
    return this.db;
  }

  /**
   * Store data in offline storage
   */
  async storeData(data: OfflineData): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      const request = store.put(data);

      request.onsuccess = () => {
        logger.debug('Debug info', 'component', { data: `💾 Stored ${data.type} data offline: ${data.id}` });
        resolve();
      };

      request.onerror = () => {
        logger.error('❌ Failed to store data offline', 'component', { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Get data from offline storage
   */
  async getData(id: string): Promise<OfflineData | null> {
    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        logger.error('❌ Failed to get data from offline storage', 'component', { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Get all data of a specific type
   */
  async getAllDataByType(type: OfflineData['type']): Promise<OfflineData[]> {
    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        logger.error('❌ Failed to get all data from offline storage', 'component', { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Remove data from offline storage
   */
  async removeData(id: string): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      const request = store.delete(id);

      request.onsuccess = () => {
        logger.debug('Debug info', 'component', { data: `🗑️ Removed data from offline storage: ${id}` });
        resolve();
      };

      request.onerror = () => {
        logger.error('❌ Failed to remove data from offline storage', 'component', { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      const request = store.clear();

      request.onsuccess = () => {
        logger.info('🗑️ Cleared all offline data', 'component');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all data items
   */
  async getAllDataItems(): Promise<OfflineData[]> {
    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
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

