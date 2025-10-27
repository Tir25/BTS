import { BusLocation, BusInfo, Bus } from '../types';
import { IBusService } from './interfaces/IBusService';
import { apiService } from './api';
import { logger } from '../utils/logger';

/**
 * CRITICAL FIX: Refactored BusService to eliminate redundant state storage
 * 
 * Changes:
 * 1. Removed internal state storage (buses, previousLocations)
 * 2. MapStore is now the single source of truth for bus data
 * 3. BusService only handles API sync and speed calculations
 * 4. Previous locations stored in MapStore via lastBusLocations
 */
interface PreviousLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
}

class BusService implements IBusService {
  // CRITICAL FIX: Remove state storage - MapStore is now single source of truth
  // Keep only previousLocations for speed calculation (ephemeral cache)
  private previousLocations: { [busId: string]: PreviousLocation } = {};
  
  // CRITICAL FIX: Store reference to MapStore for state updates
  private mapStore: any = null;
  
  /**
   * Set MapStore reference for state updates
   * Called during initialization to enable bus info sync
   */
  setMapStore(store: any): void {
    this.mapStore = store;
    logger.info('✅ BusService: MapStore reference set', 'busService');
  }
  
  /**
   * Helper to get MapStore state and actions
   */
  private getMapStoreState() {
    if (!this.mapStore) return null;
    return this.mapStore.getState();
  }

  // Calculate speed between two points using Haversine formula
  private calculateSpeed(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    timeDiffMs: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    const timeDiffHours = timeDiffMs / (1000 * 60 * 60); // Convert to hours
    const speed = distance / timeDiffHours; // Speed in km/h

    return Math.round(speed * 10) / 10; // Round to 1 decimal place
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * CRITICAL FIX: Calculate speed from location update
   * Now returns calculated speed instead of updating internal state
   * MapStore handles state updates via updateBusLocation action
   */
  calculateSpeedFromLocation(location: BusLocation, previousLocation?: PreviousLocation): number | undefined {
    if (!previousLocation) return undefined;
    
    const { latitude, longitude, timestamp } = location;
    const timeDiff = new Date(timestamp).getTime() - new Date(previousLocation.timestamp).getTime();
    
    if (timeDiff > 0) {
      return this.calculateSpeed(
        previousLocation.latitude,
        previousLocation.longitude,
        latitude,
        longitude,
        timeDiff
      );
    }
    
    return undefined;
  }

  /**
   * CRITICAL FIX: Update bus location with speed calculation
   * Now updates MapStore instead of internal state
   * Returns location with calculated speed for MapStore update
   */
  updateBusLocation(location: BusLocation): BusLocation {
    const { busId, latitude, longitude, timestamp } = location;

    // Get previous location for speed calculation
    const previousLocation = this.previousLocations[busId];

    // Calculate speed if we have previous location
    const calculatedSpeed = this.calculateSpeedFromLocation(location, previousLocation);
    
    // Store current location as previous for next calculation
    this.previousLocations[busId] = {
      latitude,
      longitude,
      timestamp,
    };

    // CRITICAL FIX: Return location with calculated speed
    // MapStore's updateBusLocation will handle state update
    return {
      ...location,
      speed: calculatedSpeed || location.speed,
    };
  }

  /**
   * CRITICAL FIX: Get bus info from MapStore instead of internal state
   * If MapStore not available, return null (should not happen in production)
   */
  getBus(busId: string): BusInfo | null {
    if (!this.mapStore) {
      logger.warn('⚠️ BusService: MapStore not available', 'busService', { busId });
      return null;
    }
    
    const state = this.mapStore.getState();
    return state.buses.find((bus: BusInfo) => bus.busId === busId) || null;
  }

  /**
   * CRITICAL FIX: Get all buses from MapStore
   */
  getAllBuses(): BusInfo[] {
    if (!this.mapStore) {
      logger.warn('⚠️ BusService: MapStore not available', 'busService');
      return [];
    }
    
    return this.mapStore.getState().buses;
  }

  /**
   * CRITICAL FIX: Get buses by route from MapStore
   */
  getBusesByRoute(routeName: string): BusInfo[] {
    if (!this.mapStore) {
      logger.warn('⚠️ BusService: MapStore not available', 'busService', { routeName });
      return [];
    }
    
    const state = this.mapStore.getState();
    return state.buses.filter((bus: BusInfo) => bus.routeName === routeName);
  }

  /**
   * CRITICAL FIX: Sync bus data from API to MapStore
   * Updates MapStore with bus metadata (number, route, driver)
   */
  async syncBusFromAPI(busId: string, apiData?: Bus): Promise<BusInfo | null> {
    try {
      // If no API data provided, fetch it from the backend
      if (!apiData) {
        const response = await apiService.getBusInfo(busId);
        if (response.success && response.data) {
          apiData = response.data;
        } else {
          logger.error('❌ Failed to fetch bus data from API', 'busService', { busId });
          return null;
        }
      }

      // CRITICAL FIX: Create BusInfo from API data
      const busInfo: BusInfo = {
        busId,
        busNumber: apiData.bus_number || apiData.code || `Bus ${busId}`,
        routeName: apiData.route_name || 'Route TBD',
        driverName: apiData.driver_full_name || 'Driver TBD',
        driverId: apiData.assigned_driver_profile_id || '',
        routeId: apiData.route_id || '',
        currentLocation: {
          busId,
          driverId: apiData.assigned_driver_profile_id || '',
          latitude: 0,
          longitude: 0,
          timestamp: new Date().toISOString(),
        },
      };

      // CRITICAL FIX: Update MapStore with bus info
      if (this.mapStore) {
        const storeState = this.mapStore.getState();
        const existingBus = storeState.buses.find((b: BusInfo) => b.busId === busId);
        
        if (existingBus) {
          // Update existing bus with API data, preserve current location
          const updatedBuses = storeState.buses.map((bus: BusInfo) =>
            bus.busId === busId
              ? {
                  ...bus,
                  ...busInfo,
                  currentLocation: bus.currentLocation || busInfo.currentLocation,
                }
              : bus
          );
          // CRITICAL FIX: Zustand actions are available on getState() result
          storeState.setBuses(updatedBuses);
        } else {
          // Add new bus to MapStore
          // CRITICAL FIX: Zustand actions are available on getState() result
          storeState.setBuses([...storeState.buses, busInfo]);
        }
        
        logger.info('✅ Bus info synced to MapStore', 'busService', {
          busId,
          busNumber: busInfo.busNumber,
          routeName: busInfo.routeName,
        });
      } else {
        logger.warn('⚠️ MapStore not available, cannot sync bus info', 'busService', { busId });
      }

      return busInfo;
    } catch (error) {
      logger.error('❌ Error syncing bus from API', 'busService', { error, busId });
      return null;
    }
  }

  /**
   * CRITICAL FIX: Sync all buses from API to MapStore
   */
  async syncAllBusesFromAPI(): Promise<BusInfo[]> {
    try {
      const response = await apiService.getAllBuses();
      if (response.success && response.data) {
        const busInfos: BusInfo[] = [];
        
        // Sync each bus to MapStore
        for (const bus of response.data) {
          const busInfo = await this.syncBusFromAPI(bus.id, bus);
          if (busInfo) {
            busInfos.push(busInfo);
          }
        }
        
        logger.info('✅ All buses synced to MapStore', 'busService', {
          count: busInfos.length,
        });
        
        return busInfos;
      }
      
      return [];
    } catch (error) {
      logger.error('❌ Error syncing all buses from API', 'busService', { error });
      return [];
    }
  }

  /**
   * CRITICAL FIX: Clear previous locations cache (MapStore manages bus state)
   */
  clearBuses(): void {
    this.previousLocations = {};
    logger.info('✅ BusService: Previous locations cache cleared', 'busService');
  }

  /**
   * CRITICAL FIX: Get bus statistics from MapStore
   */
  getBusStats(): {
    totalBuses: number;
    activeBuses: number;
    busesByRoute: { [routeName: string]: number };
  } {
    if (!this.mapStore) {
      return { totalBuses: 0, activeBuses: 0, busesByRoute: {} };
    }
    
    const state = this.mapStore.getState();
    const buses = state.buses;
    const busesByRoute: { [routeName: string]: number } = {};

    buses.forEach((bus: BusInfo) => {
      const routeName = bus.routeName;
      busesByRoute[routeName] = (busesByRoute[routeName] || 0) + 1;
    });

    return {
      totalBuses: buses.length,
      activeBuses: buses.filter((bus: BusInfo) => bus.currentLocation).length,
      busesByRoute,
    };
  }

  /**
   * CRITICAL FIX: Get active buses from MapStore
   */
  getActiveBuses(): BusInfo[] {
    if (!this.mapStore) return [];
    
    const state = this.mapStore.getState();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return state.buses.filter((bus: BusInfo) => {
      if (!bus.currentLocation) return false;
      const lastUpdate = new Date(bus.currentLocation.timestamp);
      return lastUpdate > fiveMinutesAgo;
    });
  }

  /**
   * CRITICAL FIX: Get bus location history from MapStore
   */
  getBusLocationHistory(busId: string): BusLocation[] {
    if (!this.mapStore) return [];
    
    const state = this.mapStore.getState();
    const location = state.lastBusLocations[busId];
    
    return location ? [location] : [];
  }

  /**
   * CRITICAL FIX: Update bus ETA in MapStore
   */
  updateBusETA(busId: string, eta: number): void {
    if (!this.mapStore) return;
    
    const storeState = this.mapStore.getState();
    const updatedBuses = storeState.buses.map((bus: BusInfo) =>
      bus.busId === busId ? { ...bus, eta } : bus
    );
    
    // CRITICAL FIX: Zustand actions are available on getState() result
    storeState.setBuses(updatedBuses);
  }

  /**
   * CRITICAL FIX: Get buses near location from MapStore
   */
  getBusesNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): BusInfo[] {
    if (!this.mapStore) return [];
    
    const state = this.mapStore.getState();
    
    return state.buses.filter((bus: BusInfo) => {
      if (!bus.currentLocation) return false;
      
      const busLat = bus.currentLocation.latitude;
      const busLng = bus.currentLocation.longitude;

      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in kilometers
      const dLat = this.toRadians(busLat - latitude);
      const dLon = this.toRadians(busLng - longitude);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRadians(latitude)) *
          Math.cos(this.toRadians(busLat)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return distance <= radiusKm;
    });
  }
}

// Export singleton instance
export const busService = new BusService();
export default busService;
export type { BusInfo } from '../types';
