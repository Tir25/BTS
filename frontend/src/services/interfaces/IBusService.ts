export type { BusLocation, BusInfo } from '../../types';

/**
 * CRITICAL FIX: Updated interface to match refactored BusService
 * BusService now works with MapStore instead of internal state
 */
export interface IBusService {
  // CRITICAL FIX: Returns location with calculated speed (doesn't store state)
  updateBusLocation(location: import('../../types').BusLocation): import('../../types').BusLocation;
  
  // CRITICAL FIX: Returns BusInfo from MapStore (not internal state)
  getBus(busId: string): import('../../types').BusInfo | null;
  getAllBuses(): import('../../types').BusInfo[];
  getBusesByRoute(routeName: string): import('../../types').BusInfo[];
  
  // CRITICAL FIX: Returns BusInfo synced to MapStore
  syncBusFromAPI(busId: string, apiData?: any): Promise<import('../../types').BusInfo | null>;
  syncAllBusesFromAPI(): Promise<import('../../types').BusInfo[]>;
  
  // CRITICAL FIX: Set MapStore reference for state sync
  setMapStore(store: any): void;
  
  clearBuses(): void;
}
