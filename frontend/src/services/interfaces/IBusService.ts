import { BusLocation, BusInfo } from '../../types';

export interface IBusService {
  updateBusLocation(location: BusLocation): void;
  getBus(busId: string): BusInfo | null;
  getAllBuses(): BusInfo[];
  getBusesByRoute(routeName: string): BusInfo[];
  syncBusFromAPI(busId: string, apiData: any): void;
  clearBuses(): void;
}
