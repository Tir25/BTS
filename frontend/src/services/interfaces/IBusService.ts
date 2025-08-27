export type { BusLocation, BusInfo } from '../../types';

export interface IBusService {
  updateBusLocation(location: import('../../types').BusLocation): void;
  getBus(busId: string): import('../../types').BusInfo | null;
  getAllBuses(): import('../../types').BusInfo[];
  getBusesByRoute(routeName: string): import('../../types').BusInfo[];
  syncBusFromAPI(busId: string, apiData: any): void;
  clearBuses(): void;
}
