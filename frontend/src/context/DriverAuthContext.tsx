/**
 * Driver Auth Context
 * Main context provider that orchestrates driver authentication, WebSocket, and assignment management
 * Uses modular hooks for better maintainability and testability
 */

import React, { createContext, useContext } from 'react';
import { useDriverAuthState } from './hooks/useDriverAuth';
import { useDriverSocket } from './hooks/useDriverSocket';
import { useDriverAssignments } from './hooks/useDriverAssignments';
import { useDriverInit } from './hooks/useDriverInit';
import { DriverBusAssignment } from '../services/authService';

interface DriverAuthState {
  isAuthenticated: boolean;
  isDriver: boolean;
  isLoading: boolean;
  error: string | null;
  
  driverId: string | null;
  driverEmail: string | null;
  driverName: string | null;
  busAssignment: DriverBusAssignment | null;
  
  isWebSocketConnected: boolean;
  isWebSocketAuthenticated: boolean;
  isWebSocketInitializing: boolean;
  
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  retryConnection: () => Promise<void>;
  refreshAssignment: () => Promise<void>;
}

const DriverAuthContext = createContext<DriverAuthState | undefined>(undefined);

interface DriverAuthProviderProps {
  children: React.ReactNode;
}

/**
 * Driver Auth Provider
 * Orchestrates all driver authentication, WebSocket, and assignment management
 */
export const DriverAuthProvider: React.FC<DriverAuthProviderProps> = ({ children }) => {
  // Use modular hooks for different responsibilities
  const auth = useDriverAuthState();
  const socket = useDriverSocket({
    isAuthenticated: auth.isAuthenticated,
    isDriver: auth.isDriver,
    setIsLoading: auth.setIsLoading,
    setError: auth.setError,
  });
  const assignments = useDriverAssignments({
    isAuthenticated: auth.isAuthenticated,
    isWebSocketAuthenticated: socket.isWebSocketAuthenticated,
    driverId: auth.driverId,
    busAssignment: auth.busAssignment,
    setBusAssignment: auth.setBusAssignment,
    setDriverName: auth.setDriverName,
    setError: auth.setError,
  });
  
  // Initialize authentication on mount
  useDriverInit({
    isAuthenticated: auth.isAuthenticated,
    setIsAuthenticated: auth.setIsAuthenticated,
    setIsDriver: auth.setIsDriver,
    setIsLoading: auth.setIsLoading,
    setError: auth.setError,
    setDriverId: auth.setDriverId,
    setDriverEmail: auth.setDriverEmail,
    setDriverName: auth.setDriverName,
    setBusAssignment: auth.setBusAssignment,
    busAssignment: auth.busAssignment,
  });

  // Combine all state and functions into context value
  const value: DriverAuthState = {
    isAuthenticated: auth.isAuthenticated,
    isDriver: auth.isDriver,
    isLoading: auth.isLoading,
    error: auth.error,
    driverId: auth.driverId,
    driverEmail: auth.driverEmail,
    driverName: auth.driverName,
    busAssignment: auth.busAssignment,
    isWebSocketConnected: socket.isWebSocketConnected,
    isWebSocketAuthenticated: socket.isWebSocketAuthenticated,
    isWebSocketInitializing: socket.isWebSocketInitializing,
    login: auth.login,
    logout: () => auth.logoutWithCleanup(socket.cleanup),
    refreshAuth: auth.refreshAuth,
    clearError: auth.clearError,
    retryConnection: socket.retryConnection,
    refreshAssignment: assignments.refreshAssignment,
  };

  return (
    <DriverAuthContext.Provider value={value}>
      {children}
    </DriverAuthContext.Provider>
  );
};

/**
 * Hook to access driver authentication context
 * @throws Error if used outside DriverAuthProvider
 */
export const useDriverAuth = (): DriverAuthState => {
  const context = useContext(DriverAuthContext);
  if (context === undefined) {
    throw new Error('useDriverAuth must be used within a DriverAuthProvider');
  }
  return context;
};
