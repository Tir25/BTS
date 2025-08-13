import { BusLocation } from './websocket';

export interface BusInfo {
  busId: string;
  busNumber: string;
  routeName: string;
  driverName: string;
  currentLocation: BusLocation;
  eta?: number; // ETA to next stop in minutes
}

interface BusData {
  [busId: string]: BusInfo;
}

interface PreviousLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
}

class BusService {
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
        busNumber: `Bus ${busId}`, // Default name, can be updated from API
        routeName: 'Route TBD', // Default route, can be updated from API
        driverName: 'Driver TBD', // Default name, can be updated from API
        currentLocation: location,
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

  // Get specific bus
  getBus(busId: string): BusInfo | null {
    return this.buses[busId] || null;
  }

  // Filter buses by route
  getBusesByRoute(routeName: string): BusInfo[] {
    return Object.values(this.buses).filter(bus =>
      bus.routeName.toLowerCase().includes(routeName.toLowerCase())
    );
  }

  // Filter buses by proximity to a location
  getBusesNearLocation(
    lat: number,
    lon: number,
    radiusKm: number = 5
  ): BusInfo[] {
    return Object.values(this.buses).filter(bus => {
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

  // Update bus information (name, route, driver)
  updateBusInfo(busId: string, updates: Partial<BusInfo>): void {
    if (this.buses[busId]) {
      this.buses[busId] = { ...this.buses[busId], ...updates };
    }
  }

  // Remove bus (when driver disconnects)
  removeBus(busId: string): void {
    delete this.buses[busId];
    delete this.previousLocations[busId];
  }

  // Clear all buses
  clearBuses(): void {
    this.buses = {};
    this.previousLocations = {};
  }

  // Get buses count
  getBusesCount(): number {
    return Object.keys(this.buses).length;
  }
}

// Export singleton instance
export const busService = new BusService();
