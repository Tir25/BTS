import { BusLocation, BusInfo, Bus } from '../../types';

export type { BusLocation, BusInfo } from '../../types';

export interface IBusService {
  updateBusLocation(location: BusLocation): void;
  getBus(busId: string): BusInfo | null;
  getAllBuses(): BusInfo[];
  getBusesByRoute(routeName: string): BusInfo[];
  syncBusFromAPI(busId: string, apiData: Bus): void;
  clearBuses(): void;
}
