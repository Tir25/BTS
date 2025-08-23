import { BusLocation } from './interfaces/IWebSocketService';
import { IBusService, BusInfo } from './interfaces/IBusService';

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

  // Get all buses
  getAllBuses(): BusInfo[] {
    return Object.values(this.buses);
  }

  // Update bus information from API data
  updateBusInfo(busId: string, busInfo: Partial<BusInfo>): void {
    if (this.buses[busId]) {
      this.buses[busId] = {
        ...this.buses[busId],
        ...busInfo,
      };
    }
  }

  // Sync bus information from API data (for new buses)
  syncBusFromAPI(
    busId: string,
    apiBusData: {
      number_plate?: string;
      bus_number?: string;
      route_name?: string;
      route_city?: string;
      routes?: { name: string };
      driver_name?: string;
      driver?: { first_name?: string; last_name?: string };
    }
  ): void {
    // Handle both frontend and backend data structures
    const busNumber =
      apiBusData.bus_number || apiBusData.number_plate || `Bus ${busId}`;
    const routeName =
      apiBusData.route_name || apiBusData.routes?.name || 'Route TBD';
    const driverName =
      apiBusData.driver_name ||
      (apiBusData.driver
        ? `${apiBusData.driver.first_name || ''} ${apiBusData.driver.last_name || ''}`.trim()
        : 'Driver TBD');

    if (this.buses[busId]) {
      // Update existing bus with real data from API
      this.buses[busId] = {
        ...this.buses[busId],
        busNumber,
        routeName,
        driverName,
      };
    } else {
      // Create new bus entry with API data
      this.buses[busId] = {
        busId,
        busNumber,
        routeName,
        driverName,
        currentLocation: {
          busId,
          driverId: '',
          latitude: 0,
          longitude: 0,
          timestamp: new Date().toISOString(),
          speed: 0,
        },
        eta: undefined,
      };
    }

    console.log(`🔄 Synced bus ${busId}: ${busNumber} - ${routeName} - ${driverName}`);
  }

  // Clear all buses (useful for resetting)
  clearBuses(): void {
    this.buses = {};
    this.previousLocations = {};
  }

  // Get specific bus
  getBus(busId: string): BusInfo | null {
    return this.buses[busId] || null;
  }

  // Filter buses by route
  getBusesByRoute(routeName: string): BusInfo[] {
    return Object.values(this.buses).filter((bus) =>
      bus.routeName.toLowerCase().includes(routeName.toLowerCase())
    );
  }

  // Filter buses by proximity to a location
  getBusesNearLocation(
    lat: number,
    lon: number,
    radiusKm: number = 5
  ): BusInfo[] {
    return Object.values(this.buses).filter((bus) => {
      const distance = this.calculateDistance(
        lat,
        lon,
        bus.currentLocation.latitude,
        bus.currentLocation.longitude
      );
      return distance <= radiusKm;
    });
  }

  // Calculate distance between two points
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
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
    return R * c;
  }

  // Remove bus (when driver disconnects)
  removeBus(busId: string): void {
    delete this.buses[busId];
    delete this.previousLocations[busId];
  }

  // Get buses count
  getBusesCount(): number {
    return Object.keys(this.buses).length;
  }
}

// Export singleton instance
export const busService = new BusService();
export type { BusInfo } from './interfaces/IBusService';
