import { BusLocation, BusInfo, Bus } from '../types';
import { IBusService } from './interfaces/IBusService';
import { apiService } from './api';

interface BusData {
  [busId: string]: BusInfo;
}

interface PreviousLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
}

class BusService implements IBusService {
  private buses: BusData = {};
  private previousLocations: { [busId: string]: PreviousLocation } = {};

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
        busNumber: `Bus ${busId}`, // Default name, will be updated from API
        routeName: 'Route TBD', // Default route, will be updated from API
        driverName: 'Driver TBD', // Default name, will be updated from API
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
      // Update ETA from location data
      this.buses[busId].eta = location.eta?.estimated_arrival_minutes;
    }

    // Store current location as previous for next calculation
    this.previousLocations[busId] = {
      latitude,
      longitude,
      timestamp,
    };
  }

  // Get bus information by ID
  getBus(busId: string): BusInfo | null {
    return this.buses[busId] || null;
  }

  // Get all buses
  getAllBuses(): BusInfo[] {
    return Object.values(this.buses);
  }

  // Get buses by route name
  getBusesByRoute(routeName: string): BusInfo[] {
    return Object.values(this.buses).filter(
      (bus) => bus.routeName === routeName
    );
  }

  // Sync bus data from API
  async syncBusFromAPI(busId: string, apiData?: Bus): Promise<void> {
    try {
      // If no API data provided, fetch it from the backend
      if (!apiData) {
        const response = await apiService.getBusInfo(busId);
        if (response.success && response.data) {
          apiData = response.data;
        } else {
          console.error('❌ Failed to fetch bus data from API for bus:', busId);
          return;
        }
      }

      if (this.buses[busId]) {
        // Update existing bus with API data
        this.buses[busId] = {
          ...this.buses[busId],
          busNumber: apiData.number_plate || apiData.code || `Bus ${busId}`,
          routeName: apiData.route_name || 'Route TBD',
          driverName: apiData.driver_full_name || 'Driver TBD',
        };
      } else {
        // Create new bus from API data
        this.buses[busId] = {
          busId,
          busNumber: apiData.number_plate || apiData.code || `Bus ${busId}`,
          routeName: apiData.route_name || 'Route TBD',
          driverName: apiData.driver_full_name || 'Driver TBD',
          currentLocation: {
            busId,
            driverId: apiData.assigned_driver_id || '',
            latitude: 0,
            longitude: 0,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      console.error('❌ Error syncing bus data from API:', error);
    }
  }

  // Sync all buses from API
  async syncAllBusesFromAPI(): Promise<void> {
    try {
      const response = await apiService.getAllBuses();
      if (response.success && response.data) {
        response.data.forEach((bus: Bus) => {
          this.syncBusFromAPI(bus.id, bus);
        });
      }
    } catch (error) {
      console.error('❌ Error syncing all buses from API:', error);
    }
  }

  // Clear all buses
  clearBuses(): void {
    this.buses = {};
    this.previousLocations = {};
  }

  // Get bus statistics
  getBusStats(): {
    totalBuses: number;
    activeBuses: number;
    busesByRoute: { [routeName: string]: number };
  } {
    const buses = Object.values(this.buses);
    const busesByRoute: { [routeName: string]: number } = {};

    buses.forEach((bus) => {
      const routeName = bus.routeName;
      busesByRoute[routeName] = (busesByRoute[routeName] || 0) + 1;
    });

    return {
      totalBuses: buses.length,
      activeBuses: buses.filter((bus) => bus.currentLocation).length,
      busesByRoute,
    };
  }

  // Get buses with recent activity (within last 5 minutes)
  getActiveBuses(): BusInfo[] {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return Object.values(this.buses).filter((bus) => {
      const lastUpdate = new Date(bus.currentLocation.timestamp);
      return lastUpdate > fiveMinutesAgo;
    });
  }

  // Get bus location history (simplified - in real app, this would come from API)
  getBusLocationHistory(busId: string): BusLocation[] {
    // This is a simplified implementation
    // In a real application, this would fetch from the backend API
    const bus = this.buses[busId];
    if (!bus) return [];

    return [bus.currentLocation];
  }

  // Update bus ETA
  updateBusETA(busId: string, eta: number): void {
    if (this.buses[busId]) {
      this.buses[busId].eta = eta;
    }
  }
  
  // Update bus info from WebSocket
  updateBusInfo(busId: string, info: {
    busNumber?: string;
    routeName?: string;
    driverName?: string;
  }): void {
    // Create bus if it doesn't exist
    if (!this.buses[busId]) {
      this.buses[busId] = {
        busId,
        busNumber: info.busNumber || `Bus ${busId}`,
        routeName: info.routeName || 'Route TBD',
        driverName: info.driverName || 'Driver TBD',
        currentLocation: {
          busId,
          driverId: '', // Will be updated when location data arrives
          latitude: 0,
          longitude: 0,
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      // Update existing bus info
      if (info.busNumber) {
        this.buses[busId].busNumber = info.busNumber;
      }
      if (info.routeName) {
        this.buses[busId].routeName = info.routeName;
      }
      if (info.driverName) {
        this.buses[busId].driverName = info.driverName;
      }
    }
  }

  // Get buses near a specific location
  getBusesNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): BusInfo[] {
    return Object.values(this.buses).filter((bus) => {
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
