/**
 * Hook for managing StudentMap state
 */
import { useState, useCallback } from 'react';
import { BusInfo, Route, BusLocation } from '../../../types';

export interface UseStudentMapStateReturn {
  // Connection state
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  connectionError: string | null;
  setConnectionError: (error: string | null) => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting') => void;
  
  // Data state
  buses: BusInfo[];
  setBuses: (buses: BusInfo[]) => void;
  routes: Route[];
  setRoutes: (routes: Route[]) => void;
  selectedRoute: string;
  setSelectedRoute: (route: string) => void;
  selectedShift: 'Day' | 'Afternoon' | '';
  setSelectedShift: (shift: 'Day' | 'Afternoon' | '') => void;
  // Note: routeStatus and routeStops are managed by useRouteStatusManagement hook
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  lastBusLocations: { [busId: string]: BusLocation };
  setLastBusLocations: (locations: { [busId: string]: BusLocation } | ((prev: { [busId: string]: BusLocation }) => { [busId: string]: BusLocation })) => void;
  
  // UI state
  isNavbarCollapsed: boolean;
  setIsNavbarCollapsed: (collapsed: boolean) => void;
  isRouteFilterOpen: boolean;
  setIsRouteFilterOpen: (open: boolean) => void;
}

/**
 * Manages all state for StudentMap component
 */
export function useStudentMapState(): UseStudentMapStateReturn {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'reconnecting'>('disconnected');
  
  // Data state
  const [buses, setBuses] = useState<BusInfo[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<'Day' | 'Afternoon' | ''>('');
  // Note: routeStatus and routeStops are managed by useRouteStatusManagement hook
  const [isLoading, setIsLoading] = useState(true);
  const [lastBusLocations, setLastBusLocations] = useState<{ [busId: string]: BusLocation }>({});
  
  // UI state
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [isRouteFilterOpen, setIsRouteFilterOpen] = useState(true);

  return {
    // Connection state
    isConnected,
    setIsConnected,
    connectionError,
    setConnectionError,
    connectionStatus,
    setConnectionStatus,
    
    // Data state
    buses,
    setBuses,
    routes,
    setRoutes,
    selectedRoute,
    setSelectedRoute,
    selectedShift,
    setSelectedShift,
    // Note: routeStatus and routeStops are managed by useRouteStatusManagement hook
    isLoading,
    setIsLoading,
    lastBusLocations,
    setLastBusLocations,
    
    // UI state
    isNavbarCollapsed,
    setIsNavbarCollapsed,
    isRouteFilterOpen,
    setIsRouteFilterOpen,
  };
}

