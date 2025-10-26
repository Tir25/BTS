import { BusLocation, BusInfo, Bus } from '../types';
import { apiService } from './api';

import { logger } from '../utils/logger';

interface BusData {
  [busId: string]: BusInfo;
}

interface PreviousLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class OptimizedBusService {
  private buses: BusData = {};
  private previousLocations: { [busId: string]: PreviousLocation } = {};
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

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

  // Cache management
  private setCache(key: string, data: any, ttl: number = this.cacheTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private getCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private clearCache(): void {
    this.cache.clear();
  }

  // Update bus location and calculate speed
  updateBusLocation(location: BusLocation): void {
    const { busId, latitude, longitude, timestamp } = location;

    // Get previous location for speed calculation
    const previousLocation = this.previousLocations[busId];

    let speed: number | undefined;
    if (previousLocation) {
      const timeDiff =
        new Date(timestamp).getTime() -
        new Date(previousLocation.timestamp).getTime();
      if (timeDiff > 0) {
        speed = this.calculateSpeed(
          previousLocation.latitude,
          previousLocation.longitude,
          latitude,
          longitude,
          timeDiff
        );
      }
    }

    // Update or create bus info
    if (!this.buses[busId]) {
      this.buses[busId] = {
        busId,
        busNumber: `Bus ${busId}`,
        routeName: 'Route TBD',
        driverName: 'Driver TBD',
        currentLocation: {
          ...location,
          speed: speed || location.speed,
        },
        eta: location.eta?.estimated_arrival_minutes,
      };
    } else {
      this.buses[busId].currentLocation = {
        ...location,
        speed: speed || location.speed,
      };
      this.buses[busId].eta = location.eta?.estimated_arrival_minutes;
    }

    // Store current location as previous for next calculation
    this.previousLocations[busId] = {
      latitude,
      longitude,
      timestamp,
    };
  }

  // Get bus by ID
  getBus(busId: string): BusInfo | null {
    return this.buses[busId] || null;
  }

  // Get all buses
  getAllBuses(): BusInfo[] {
    return Object.values(this.buses);
  }

  // Get buses by route
  getBusesByRoute(routeName: string): BusInfo[] {
    return Object.values(this.buses).filter(
      (bus) => bus.routeName === routeName
    );
  }

  // Get active buses (with recent activity)
  getActiveBuses(): BusInfo[] {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return Object.values(this.buses).filter((bus) => {
      if (!bus.currentLocation) return false;
      const lastUpdate = new Date(bus.currentLocation.timestamp);
      return lastUpdate > fiveMinutesAgo;
    });
  }

  // Sync bus from API with caching
  async syncBusFromAPI(busId: string, apiData?: any): Promise<BusInfo | null> {
    const cacheKey = `bus_${busId}`;
    const cachedData = this.getCache(cacheKey);

    if (cachedData) {
      logger.debug('Debug info', 'component', { data: '📦 Using cached bus data for:', busId });
      return cachedData;
    }

    try {
      let busData = apiData;
      if (!busData) {
        const response = await apiService.getBusInfo(busId);
        if (response.success && response.data) {
          busData = response.data;
        }
      }

      if (busData) {
        const busInfo: BusInfo = {
          busId,
          busNumber: busData.bus_number || busData.number_plate || `Bus ${busId}`,
          routeName: busData.route_name || 'Unknown Route',
          driverName: busData.driver_name || 'Unknown Driver',
          currentLocation: this.buses[busId]?.currentLocation,
          eta: this.buses[busId]?.eta,
        };

        this.buses[busId] = busInfo;
        this.setCache(cacheKey, busInfo);
        return busInfo;
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
    }

    return null;
  }

  // Sync all buses from API with caching
  async syncAllBusesFromAPI(): Promise<BusInfo[]> {
    const cacheKey = 'all_buses';
    const cachedData = this.getCache(cacheKey);

    if (cachedData) {
      logger.info('📦 Using cached buses data', 'component');
      return cachedData;
    }

    try {
      const response = await apiService.getAllBuses();
      if (response.success && response.data) {
        const buses: BusInfo[] = [];

        for (const apiBus of response.data) {
          const busId = apiBus.bus_id || apiBus.id;
          if (busId) {
            const busInfo = await this.syncBusFromAPI(busId, apiBus);
            if (busInfo) {
              buses.push(busInfo);
            }
          }
        }

        this.setCache(cacheKey, buses);
        return buses;
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
    }

    return [];
  }

  // Get bus statistics
  getBusStatistics(): {
    totalBuses: number;
    activeBuses: number;
    inactiveBuses: number;
    averageSpeed: number;
    routesCount: number;
  } {
    const allBuses = this.getAllBuses();
    const activeBuses = this.getActiveBuses();
    const routes = new Set(allBuses.map(bus => bus.routeName));

    const totalSpeed = activeBuses.reduce((sum, bus) => {
      return sum + (bus.currentLocation?.speed || 0);
    }, 0);

    return {
      totalBuses: allBuses.length,
      activeBuses: activeBuses.length,
      inactiveBuses: allBuses.length - activeBuses.length,
      averageSpeed: activeBuses.length > 0 ? Math.round(totalSpeed / activeBuses.length) : 0,
      routesCount: routes.size,
    };
  }

  // Clear old data
  clearOldData(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Clear old previous locations
    Object.keys(this.previousLocations).forEach(busId => {
      const location = this.previousLocations[busId];
      if (new Date(location.timestamp) < oneHourAgo) {
        delete this.previousLocations[busId];
      }
    });

    // Clear cache
    this.clearCache();
  }

  // Reset service
  reset(): void {
    this.buses = {};
    this.previousLocations = {};
    this.clearCache();
  }
}

// Export singleton instance
export const optimizedBusService = new OptimizedBusService();
export default optimizedBusService;
