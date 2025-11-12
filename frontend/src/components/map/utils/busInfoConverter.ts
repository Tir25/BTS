/**
 * Utility functions for converting bus data to BusInfo format
 */
import { BusInfo, BusLocation } from '../../../types';

/**
 * Converts API bus data to BusInfo format
 */
export function convertBusToBusInfo(bus: any, lastBusLocations?: { [busId: string]: BusLocation }): BusInfo {
  const busId = bus.id || bus.bus_id || '';
  const currentLocation = lastBusLocations?.[busId] || bus.current_location || bus.currentLocation || null;
  
  return {
    busId,
    busNumber: bus.bus_number || bus.busNumber || bus.code || `Bus ${busId.slice(0, 8)}`,
    routeName: bus.route_name || bus.routeName || bus.routes?.name || 'Unknown Route',
    driverName: bus.driver_full_name || bus.driver_name || bus.driverName || bus.user_profiles?.full_name || 'Unknown Driver',
    driverId: bus.assigned_driver_profile_id || bus.driver_id || bus.driverId || '',
    routeId: bus.route_id || bus.routeId || bus.routes?.id || '',
    currentLocation: currentLocation || (busId ? {
      busId,
      driverId: bus.assigned_driver_profile_id || bus.driver_id || '',
      latitude: 0,
      longitude: 0,
      timestamp: new Date().toISOString(),
    } : null),
  };
}

/**
 * Converts multiple buses to BusInfo array
 */
export function convertBusesToBusInfo(buses: any[], lastBusLocations?: { [busId: string]: BusLocation }): BusInfo[] {
  return buses.map(bus => convertBusToBusInfo(bus, lastBusLocations)).filter(bus => bus.busId);
}

