/**
 * Hook for managing StudentMap state
 */
import { useState, Dispatch, SetStateAction } from 'react';
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
  setBuses: Dispatch<SetStateAction<BusInfo[]>>;
  routes: Route[];
  setRoutes: Dispatch<SetStateAction<Route[]>>;
  selectedRoute: string;
  setSelectedRoute: Dispatch<SetStateAction<string>>;
  selectedShift: 'Day' | 'Afternoon' | '';
  setSelectedShift: Dispatch<SetStateAction<'Day' | 'Afternoon' | ''>>;
  // Note: routeStatus and routeStops are managed by useRouteStatusManagement hook
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  lastBusLocations: { [busId: string]: BusLocation };
  setLastBusLocations: (locations: { [busId: string]: BusLocation } | ((prev: { [busId: string]: BusLocation }) => { [busId: string]: BusLocation })) => void;
  
  // UI state
  isNavbarCollapsed: boolean;
  setIsNavbarCollapsed: Dispatch<SetStateAction<boolean>>;
  isRouteFilterOpen: boolean;
  setIsRouteFilterOpen: Dispatch<SetStateAction<boolean>>;
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

