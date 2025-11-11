/**
 * Utility functions for filtering buses by route
 * Centralizes bus-route matching logic to avoid duplication
 */

import { BusInfo } from '../services/busService';

/**
 * Check if a bus belongs to a specific route
 * 
 * @param bus - The bus object to check
 * @param routeId - The route ID to check against ('all' means any route)
 * @returns true if the bus belongs to the route, false otherwise
 */
export function busBelongsToRoute(bus: BusInfo | null | undefined, routeId: string): boolean {
  if (!bus) return false;
  if (routeId === 'all') return true;
  
  // Check both routeId and route_id properties (handle different data formats)
  const busRouteId = (bus as any).routeId || (bus as any).route_id;
  return busRouteId === routeId;
}

/**
 * Get the route ID from a bus object
 * Handles different property names that might be used
 * 
 * @param bus - The bus object
 * @returns The route ID or empty string if not found
 */
export function getBusRouteId(bus: BusInfo | null | undefined): string {
  if (!bus) return '';
  return (bus as any).routeId || (bus as any).route_id || '';
}

/**
 * Filter buses by route ID
 * 
 * @param buses - Array of buses to filter
 * @param routeId - The route ID to filter by ('all' returns all buses)
 * @returns Filtered array of buses
 */
export function filterBusesByRoute(buses: BusInfo[], routeId: string): BusInfo[] {
  if (routeId === 'all') return buses;
  return buses.filter(bus => busBelongsToRoute(bus, routeId));
}

