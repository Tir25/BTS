import { BusLocation } from './IWebSocketService';

export interface BusInfo {
  busId: string;
  busNumber: string;
  routeName: string;
  driverName: string;
  currentLocation: BusLocation;
  eta?: number;
}

export interface IBusService {
  updateBusLocation(location: BusLocation): void;
  getBus(busId: string): BusInfo | null;
  getAllBuses(): BusInfo[];
  getBusesByRoute(routeName: string): BusInfo[];
  syncBusFromAPI(busId: string, apiData: any): void;
  clearBuses(): void;
}
