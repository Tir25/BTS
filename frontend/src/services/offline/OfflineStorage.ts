import { logger } from '../../utils/logger';
import { IndexedDBEngine } from './indexedDBEngine';
import { SyncManager } from './syncManager';

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
  private dbEngine: IndexedDBEngine;
  private syncManager: SyncManager;

  constructor(
    private config: OfflineConfig = {
      dbName: 'BusTrackingOffline',
      dbVersion: 1,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000,
      syncInterval: 30000, // 30 seconds
    }
  ) {
    this.dbEngine = new IndexedDBEngine();
    this.syncManager = new SyncManager(this.dbEngine, this.config);
    this.initialize();
  }

  // Initialize storage
  private async initialize(): Promise<void> {
    await this.dbEngine.initialize(this.config);
    this.syncManager.startSyncTimer();
  }

  // Store data offline
  async storeData(
    type: OfflineData['type'],
    id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const offlineData: OfflineData = {
      id,
      type,
      data,
      timestamp: Date.now(),
      version: 1,
      syncStatus: 'synced',
    };

    await this.dbEngine.storeData(offlineData);
  }

  // Get data from offline storage
  async getData(type: OfflineData['type'], id: string): Promise<Record<string, unknown> | null> {
    const result = await this.dbEngine.getData(id);
    if (result && result.type === type) {
      // Check if data is still fresh
      if (Date.now() - result.timestamp < this.config.maxAge) {
        return result.data;
      } else {
        // Data is stale, remove it
        await this.removeData(type, id);
        return null;
      }
    }
    return null;
  }

  // Get all data of a specific type
  async getAllData(type: OfflineData['type']): Promise<Record<string, unknown>[]> {
    const results = await this.dbEngine.getAllDataByType(type);
    const freshData = results
      .filter((item) => Date.now() - item.timestamp < this.config.maxAge)
      .map((item) => item.data);
    return freshData;
  }

  // Remove data from offline storage
  async removeData(type: OfflineData['type'], id: string): Promise<void> {
    await this.dbEngine.removeData(id);
  }

  // Add item to sync queue
  async addToSyncQueue(
    operation: SyncQueueItem['operation'],
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.syncManager.addToSyncQueue(operation, endpoint, data);
  }

  // Get sync queue items
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return await this.syncManager.getSyncQueue();
  }

  // Remove item from sync queue
  async removeFromSyncQueue(id: string): Promise<void> {
    await this.syncManager.removeFromSyncQueue(id);
  }

  // Update retry count for sync queue item
  async updateRetryCount(id: string, retryCount: number): Promise<void> {
    await this.syncManager.updateRetryCount(id, retryCount);
  }

  // Sync pending data
  async syncPendingData(): Promise<void> {
    await this.syncManager.syncPendingData();
  }

  // Clear all offline data
  async clearAll(): Promise<void> {
    await this.dbEngine.clearAllData();
    await this.syncManager.clearSyncQueue();
    logger.info('🗑️ Cleared all offline data', 'component');
  }

  // Get storage statistics
  async getStats(): Promise<{
    totalItems: number;
    dataByType: Record<string, number>;
    queueItems: number;
    totalSize: number;
  }> {
    const dataItems = await this.dbEngine.getAllDataItems();
    const queueItems = await this.syncManager.getSyncQueueItems();

    const dataByType: Record<string, number> = {};
    dataItems.forEach((item) => {
      dataByType[item.type] = (dataByType[item.type] || 0) + 1;
    });

    return {
      totalItems: dataItems.length,
      dataByType,
      queueItems: queueItems.length,
      totalSize:
        JSON.stringify(dataItems).length +
        JSON.stringify(queueItems).length,
    };
  }

  // Cleanup resources
  destroy(): void {
    this.syncManager.stopSyncTimer();
    this.syncManager.removeNetworkListeners();
    logger.info('OfflineStorage destroyed - all listeners and timers cleared', 'component');
  }
}

// Global offline storage instance
export const offlineStorage = new OfflineStorage();

export default OfflineStorage;
