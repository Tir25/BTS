import { IMapService } from './interfaces/IMapService';
import { IWebSocketService } from './interfaces/IWebSocketService';
import { IBusService } from './interfaces/IBusService';
import { IApiService } from './interfaces/IApiService';
import { MapService } from './MapService';
import { websocketService } from './websocket';
import { busService } from './busService';
import { apiService } from './api';
import { DataManager } from './DataManager';
import { ConnectionManager } from './ConnectionManager';

export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: Map<string, unknown> = new Map();

  private constructor() {}

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  // Get or create services
  getMapService(): IMapService {
    if (!this.services.has('mapService')) {
      this.services.set('mapService', new MapService());
    }
    return this.services.get('mapService') as IMapService;
  }

  getWebSocketService(): IWebSocketService {
    if (!this.services.has('webSocketService')) {
      this.services.set('webSocketService', websocketService);
    }
    return this.services.get('webSocketService') as IWebSocketService;
  }

  getBusService(): IBusService {
    if (!this.services.has('busService')) {
      this.services.set('busService', busService);
    }
    return this.services.get('busService') as IBusService;
  }

  getApiService(): IApiService {
    if (!this.services.has('apiService')) {
      this.services.set('apiService', apiService);
    }
    return this.services.get('apiService') as IApiService;
  }

  getDataManager(): DataManager {
    if (!this.services.has('dataManager')) {
      const dataManager = new DataManager(
        this.getBusService(),
        this.getApiService()
      );
      this.services.set('dataManager', dataManager);
    }
    return this.services.get('dataManager') as DataManager;
  }

  getConnectionManager(): ConnectionManager {
    if (!this.services.has('connectionManager')) {
      const connectionManager = new ConnectionManager(
        this.getWebSocketService()
      );
      this.services.set('connectionManager', connectionManager);
    }
    return this.services.get('connectionManager') as ConnectionManager;
  }

  // Method to replace services (useful for testing)
  setService<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  // Method to clear all services (useful for cleanup)
  clearServices(): void {
    this.services.clear();
  }

  // Method to get all registered services
  getAllServices(): Map<string, unknown> {
    return new Map(this.services);
  }
}

// Export singleton instance
export const serviceFactory = ServiceFactory.getInstance();
