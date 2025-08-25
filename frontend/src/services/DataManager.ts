import { IBusService, BusInfo } from './interfaces/IBusService';
import { IApiService } from './interfaces/IApiService';
import { BusLocation } from './interfaces/IWebSocketService';

export interface Route {
  id: string;
  name: string;
  description: string;
  stops: GeoJSON.LineString;
  distance_km: number;
  estimated_duration_minutes: number;
  is_active: boolean;
}

export class DataManager {
  private busService: IBusService;
  private apiService: IApiService;
  private routes: Route[] = [];
  private isLoading = false;

  constructor(busService: IBusService, apiService: IApiService) {
    this.busService = busService;
    this.apiService = apiService;
  }

  // Route management
  async loadRoutes(): Promise<Route[]> {
    if (this.isLoading) {
      return this.routes;
    }

    this.isLoading = true;
    try {
      const response = await this.apiService.getRoutes();
      if (response.success && response.data) {
        this.routes = response.data as Route[];
        console.log('✅ Routes loaded:', this.routes.length);
      }
    } catch (error) {
      console.error('❌ Error loading routes:', error);
    } finally {
      this.isLoading = false;
    }

    return this.routes;
  }

  getRoutes(): Route[] {
    return this.routes;
  }

  // Bus management
  async loadInitialBuses(): Promise<BusInfo[]> {
    try {
      const response = await this.apiService.getAllBuses();
      if (response.success && response.data) {
        console.log('📊 Initial bus data from API:', response.data.length);

        // Sync each bus with the bus service
        response.data.forEach((apiBus: any) => {
          const busId = apiBus.bus_id || apiBus.id;
          if (busId) {
            const existingBus = this.busService.getBus(busId);
            if (existingBus) {
              this.busService.syncBusFromAPI(busId, apiBus);
            } else {
              // Create new bus entry if it doesn't exist
              this.busService.updateBusLocation({
                busId,
                driverId: apiBus.driver_id || '',
                latitude: 0,
                longitude: 0,
                timestamp: new Date().toISOString(),
              });
              this.busService.syncBusFromAPI(busId, apiBus);
            }
          }
        });

        const updatedBuses = this.busService.getAllBuses();
        console.log('✅ Initial buses loaded and synced:', updatedBuses.length);
        return updatedBuses;
      }
    } catch (error) {
      console.error('❌ Error loading initial buses:', error);
    }

    return [];
  }

  async syncBusData(busId: string): Promise<void> {
    try {
      const response = await this.apiService.getBusInfo(busId);
      if (response.success && response.data) {
        this.busService.syncBusFromAPI(busId, response.data);
        console.log(`🔄 Synced bus ${busId} with API data:`, response.data);
      }
    } catch (error) {
      console.error(`❌ Failed to sync bus ${busId} data:`, error);
    }
  }

  updateBusLocation(location: BusLocation): void {
    this.busService.updateBusLocation(location);
  }

  getBuses(): BusInfo[] {
    return this.busService.getAllBuses();
  }

  getBusesByRoute(routeName: string): BusInfo[] {
    return this.busService.getBusesByRoute(routeName);
  }

  getBus(busId: string): BusInfo | null {
    return this.busService.getBus(busId);
  }

  // Filtering and querying
  getFilteredBuses(selectedRoute: string): BusInfo[] {
    if (selectedRoute === 'all') {
      return this.getBuses();
    }
    return this.getBusesByRoute(selectedRoute);
  }

  getAvailableRoutes(): string[] {
    const routes = [
      ...new Set(this.getBuses().map((bus: BusInfo) => bus.routeName)),
    ];
    return routes.filter((route: string) => route !== 'Route TBD');
  }

  // Data validation
  validateBusData(bus: BusInfo): boolean {
    return !!(bus.busId && bus.busNumber && bus.routeName);
  }

  // Cleanup
  clearData(): void {
    this.busService.clearBuses();
    this.routes = [];
  }
}
