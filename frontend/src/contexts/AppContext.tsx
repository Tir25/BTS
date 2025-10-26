/**
 * Centralized Application Context
 * Provides global state management to avoid prop drilling
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { logger } from '../utils/logger';

// Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'driver' | 'student';
  profile_photo_url?: string;
}

export interface BusInfo {
  bus_id: string;
  bus_number: string;
  route_id: string;
  route_name: string;
  driver_id: string;
  driver_name: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
}

export interface Route {
  id: string;
  name: string;
  city: string;
  description: string;
  is_active: boolean;
  stops: any;
  distance_km: number;
  estimated_duration_minutes: number;
}

export interface AppState {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;

  // Connection
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
  connectionError: string | null;

  // Data
  buses: BusInfo[];
  routes: Route[];
  selectedRoute: string;

  // UI State
  isNavbarCollapsed: boolean;
  isRouteFilterOpen: boolean;
  isActiveBusesOpen: boolean;
  isClusteringEnabled: boolean;
  isHeatmapEnabled: boolean;

  // Performance
  lastUpdateTime: string | null;
  updateCount: number;
}

export type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AUTH_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'connected' | 'disconnected' | 'connecting' | 'reconnecting' }
  | { type: 'SET_CONNECTION_ERROR'; payload: string | null }
  | { type: 'SET_BUSES'; payload: BusInfo[] }
  | { type: 'UPDATE_BUS_LOCATION'; payload: { busId: string; location: any } }
  | { type: 'REMOVE_BUS'; payload: string }
  | { type: 'SET_ROUTES'; payload: Route[] }
  | { type: 'SET_SELECTED_ROUTE'; payload: string }
  | { type: 'SET_NAVBAR_COLLAPSED'; payload: boolean }
  | { type: 'SET_ROUTE_FILTER_OPEN'; payload: boolean }
  | { type: 'SET_ACTIVE_BUSES_OPEN'; payload: boolean }
  | { type: 'TOGGLE_CLUSTERING' }
  | { type: 'TOGGLE_HEATMAP' }
  | { type: 'UPDATE_PERFORMANCE'; payload: { lastUpdateTime: string; updateCount: number } }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,
  connectionStatus: 'disconnected',
  connectionError: null,
  buses: [],
  routes: [],
  selectedRoute: 'all',
  isNavbarCollapsed: false,
  isRouteFilterOpen: true,
  isActiveBusesOpen: true,
  isClusteringEnabled: true,
  isHeatmapEnabled: false,
  lastUpdateTime: null,
  updateCount: 0,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        authError: null,
      };

    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.payload,
        authError: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_AUTH_ERROR':
      return {
        ...state,
        authError: action.payload,
        isLoading: false,
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload,
        connectionError: action.payload === 'connected' ? null : state.connectionError,
      };

    case 'SET_CONNECTION_ERROR':
      return {
        ...state,
        connectionError: action.payload,
        connectionStatus: 'disconnected',
      };

    case 'SET_BUSES':
      return {
        ...state,
        buses: action.payload,
      };

    case 'UPDATE_BUS_LOCATION':
      return {
        ...state,
        buses: state.buses.map(bus =>
          bus.bus_id === action.payload.busId
            ? { ...bus, currentLocation: action.payload.location }
            : bus
        ),
      };

    case 'REMOVE_BUS':
      return {
        ...state,
        buses: state.buses.filter(bus => bus.bus_id !== action.payload),
      };

    case 'SET_ROUTES':
      return {
        ...state,
        routes: action.payload,
      };

    case 'SET_SELECTED_ROUTE':
      return {
        ...state,
        selectedRoute: action.payload,
      };

    case 'SET_NAVBAR_COLLAPSED':
      return {
        ...state,
        isNavbarCollapsed: action.payload,
      };

    case 'SET_ROUTE_FILTER_OPEN':
      return {
        ...state,
        isRouteFilterOpen: action.payload,
      };

    case 'SET_ACTIVE_BUSES_OPEN':
      return {
        ...state,
        isActiveBusesOpen: action.payload,
      };

    case 'TOGGLE_CLUSTERING':
      return {
        ...state,
        isClusteringEnabled: !state.isClusteringEnabled,
      };

    case 'TOGGLE_HEATMAP':
      return {
        ...state,
        isHeatmapEnabled: !state.isHeatmapEnabled,
      };

    case 'UPDATE_PERFORMANCE':
      return {
        ...state,
        lastUpdateTime: action.payload.lastUpdateTime,
        updateCount: action.payload.updateCount,
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Log state changes in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('App state updated', 'app-context', { state });
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hooks
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export function useAppState() {
  const { state } = useAppContext();
  return state;
}

export function useAppDispatch() {
  const { dispatch } = useAppContext();
  return dispatch;
}

// Selector hooks for specific state slices
export function useAuth() {
  const { state, dispatch } = useAppContext();
  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.authError,
    setUser: (user: User | null) => dispatch({ type: 'SET_USER', payload: user }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) => dispatch({ type: 'SET_AUTH_ERROR', payload: error }),
    clearError: () => dispatch({ type: 'SET_AUTH_ERROR', payload: null }),
  };
}

export function useConnection() {
  const { state, dispatch } = useAppContext();
  return {
    status: state.connectionStatus,
    error: state.connectionError,
    setStatus: (status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting') =>
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: status }),
    setError: (error: string | null) => dispatch({ type: 'SET_CONNECTION_ERROR', payload: error }),
  };
}

export function useBuses() {
  const { state, dispatch } = useAppContext();
  return {
    buses: state.buses,
    setBuses: (buses: BusInfo[]) => dispatch({ type: 'SET_BUSES', payload: buses }),
    updateBusLocation: (busId: string, location: any) =>
      dispatch({ type: 'UPDATE_BUS_LOCATION', payload: { busId, location } }),
    removeBus: (busId: string) => dispatch({ type: 'REMOVE_BUS', payload: busId }),
  };
}

export function useRoutes() {
  const { state, dispatch } = useAppContext();
  return {
    routes: state.routes,
    selectedRoute: state.selectedRoute,
    setRoutes: (routes: Route[]) => dispatch({ type: 'SET_ROUTES', payload: routes }),
    setSelectedRoute: (routeId: string) => dispatch({ type: 'SET_SELECTED_ROUTE', payload: routeId }),
  };
}

export function useUI() {
  const { state, dispatch } = useAppContext();
  return {
    isNavbarCollapsed: state.isNavbarCollapsed,
    isRouteFilterOpen: state.isRouteFilterOpen,
    isActiveBusesOpen: state.isActiveBusesOpen,
    isClusteringEnabled: state.isClusteringEnabled,
    isHeatmapEnabled: state.isHeatmapEnabled,
    setNavbarCollapsed: (collapsed: boolean) =>
      dispatch({ type: 'SET_NAVBAR_COLLAPSED', payload: collapsed }),
    setRouteFilterOpen: (open: boolean) =>
      dispatch({ type: 'SET_ROUTE_FILTER_OPEN', payload: open }),
    setActiveBusesOpen: (open: boolean) =>
      dispatch({ type: 'SET_ACTIVE_BUSES_OPEN', payload: open }),
    toggleClustering: () => dispatch({ type: 'TOGGLE_CLUSTERING' }),
    toggleHeatmap: () => dispatch({ type: 'TOGGLE_HEATMAP' }),
  };
}

export function usePerformance() {
  const { state, dispatch } = useAppContext();
  return {
    lastUpdateTime: state.lastUpdateTime,
    updateCount: state.updateCount,
    updatePerformance: (lastUpdateTime: string, updateCount: number) =>
      dispatch({ type: 'UPDATE_PERFORMANCE', payload: { lastUpdateTime, updateCount } }),
  };
}
