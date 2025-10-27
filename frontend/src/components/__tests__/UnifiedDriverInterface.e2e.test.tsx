import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UnifiedDriverInterface from '../UnifiedDriverInterface';
import { useDriverStore } from '../../stores/useDriverStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { useConnectionStore } from '../../stores/useConnectionStore';

// Mock all external dependencies
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/authService', () => ({
  authService: {
    validateDriverSession: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    getCurrentProfile: vi.fn(),
  },
}));

vi.mock('../../services/UnifiedWebSocketService', () => ({
  UnifiedWebSocketService: {
    getInstance: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      isConnected: vi.fn(() => false),
      isAuthenticated: vi.fn(() => false),
    })),
  },
}));

vi.mock('../../services/LocationService', () => ({
  LocationService: {
    getInstance: vi.fn(() => ({
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestPermission: vi.fn(),
      isTracking: vi.fn(() => false),
      hasPermission: vi.fn(() => false),
    })),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../contexts/DriverAuthContext', () => ({
  useDriverAuth: () => ({
    logout: vi.fn(),
    retryConnection: vi.fn(),
    refreshAssignment: vi.fn(),
  }),
}));

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Driver Dashboard End-to-End Tests', () => {
  beforeEach(() => {
    // Reset all store states
    useDriverStore.getState().resetAll();
    useLocationStore.getState().resetAll();
    useConnectionStore.getState().resetAll();
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Complete Driver Login Flow', () => {
    it('should complete full driver login workflow', async () => {
      const mockValidateDriverSession = vi.fn()
        .mockResolvedValueOnce({
          isValid: false,
          assignment: null,
          errorCode: 'INVALID_CREDENTIALS',
          errorMessage: 'Invalid credentials',
        })
        .mockResolvedValueOnce({
          isValid: true,
          assignment: {
            driver_id: 'driver-123',
            bus_id: 'bus-456',
            bus_number: 'BUS-001',
            route_id: 'route-789',
            route_name: 'Route A',
            driver_name: 'John Driver',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        });

      vi.mocked(require('../../services/authService').authService.validateDriverSession)
        .mockImplementation(mockValidateDriverSession);

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="login" />
        </TestWrapper>
      );

      // Step 1: Initial login form should be visible
      await waitFor(() => {
        expect(screen.getByText('Driver Login')).toBeInTheDocument();
      });

      // Step 2: Fill in credentials
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'driver@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Step 3: First login attempt (should fail)
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Step 4: Correct credentials and retry
      fireEvent.change(emailInput, { target: { value: 'driver@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'correctpassword' } });
      fireEvent.click(loginButton);

      // Step 5: Should transition to dashboard
      await waitFor(() => {
        expect(screen.getByText('Driver Dashboard')).toBeInTheDocument();
      });

      // Step 6: Verify driver data is loaded
      expect(useDriverStore.getState().isAuthenticated).toBe(true);
      expect(useDriverStore.getState().isDriver).toBe(true);
      expect(useDriverStore.getState().driverId).toBe('driver-123');
      expect(useDriverStore.getState().busAssignment).toBeDefined();
    });
  });

  describe('Complete Location Tracking Flow', () => {
    beforeEach(async () => {
      // Set up authenticated driver state
      useDriverStore.getState().setAuthState({
        isAuthenticated: true,
        isDriver: true,
        isLoading: false,
        error: null,
      });

      useDriverStore.getState().setDriverData({
        driverId: 'driver-123',
        driverEmail: 'driver@example.com',
        driverName: 'John Driver',
      });

      useDriverStore.getState().setInitializationState({
        isInitializing: false,
        initializationError: null,
      });
    });

    it('should complete full location tracking workflow', async () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Step 1: Dashboard should be loaded
      await waitFor(() => {
        expect(screen.getByText('Driver Dashboard')).toBeInTheDocument();
      });

      // Step 2: Initially no permission
      useLocationStore.getState().setPermissionState({
        hasPermission: false,
        isRequestingPermission: false,
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /request permission/i })).toBeInTheDocument();
      });

      // Step 3: Request permission
      const requestPermissionButton = screen.getByRole('button', { name: /request permission/i });
      fireEvent.click(requestPermissionButton);

      await waitFor(() => {
        expect(useLocationStore.getState().isRequestingPermission).toBe(true);
      });

      // Step 4: Grant permission
      useLocationStore.getState().setPermissionState({
        hasPermission: true,
        isRequestingPermission: false,
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start tracking/i })).toBeInTheDocument();
      });

      // Step 5: Start tracking
      const startTrackingButton = screen.getByRole('button', { name: /start tracking/i });
      fireEvent.click(startTrackingButton);

      await waitFor(() => {
        expect(useLocationStore.getState().isTracking).toBe(true);
      });

      // Step 6: Simulate location updates
      const mockLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        timestamp: Date.now(),
      };

      useLocationStore.getState().updateLocation(mockLocation);

      await waitFor(() => {
        expect(useLocationStore.getState().currentLocation).toEqual(mockLocation);
        expect(useLocationStore.getState().updateCount).toBe(1);
      });

      // Step 7: Stop tracking
      const stopTrackingButton = screen.getByRole('button', { name: /stop tracking/i });
      fireEvent.click(stopTrackingButton);

      await waitFor(() => {
        expect(useLocationStore.getState().isTracking).toBe(false);
      });
    });

    it('should handle location tracking errors', async () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Driver Dashboard')).toBeInTheDocument();
      });

      // Set up permission but simulate error
      useLocationStore.getState().setPermissionState({
        hasPermission: true,
        isRequestingPermission: false,
      });

      useLocationStore.getState().setLocationError({
        code: 1,
        message: 'Location permission denied',
      });

      await waitFor(() => {
        expect(screen.getByText(/location permission denied/i)).toBeInTheDocument();
      });

      // Clear error
      useLocationStore.getState().clearError();

      await waitFor(() => {
        expect(screen.queryByText(/location permission denied/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Complete WebSocket Connection Flow', () => {
    beforeEach(async () => {
      // Set up authenticated driver state
      useDriverStore.getState().setAuthState({
        isAuthenticated: true,
        isDriver: true,
        isLoading: false,
        error: null,
      });

      useDriverStore.getState().setInitializationState({
        isInitializing: false,
        initializationError: null,
      });
    });

    it('should complete WebSocket connection workflow', async () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Step 1: Initially disconnected
      await waitFor(() => {
        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      });

      // Step 2: Start connecting
      useConnectionStore.getState().setConnectionStatus('connecting');

      await waitFor(() => {
        expect(screen.getByText(/connecting/i)).toBeInTheDocument();
      });

      // Step 3: Connect
      useConnectionStore.getState().setConnected(true);
      useConnectionStore.getState().setConnectionStatus('connected');

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });

      // Step 4: Authenticate
      useConnectionStore.getState().setAuthenticated(true);

      await waitFor(() => {
        expect(useConnectionStore.getState().isAuthenticated).toBe(true);
      });

      // Step 5: Simulate connection loss
      useConnectionStore.getState().setConnected(false);
      useConnectionStore.getState().setAuthenticated(false);
      useConnectionStore.getState().setConnectionStatus('disconnected');
      useConnectionStore.getState().setConnectionError('Connection lost');

      await waitFor(() => {
        expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
      });

      // Step 6: Retry connection
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(useConnectionStore.getState().reconnectAttempts).toBe(1);
      });
    });
  });

  describe('Complete Assignment Update Flow', () => {
    beforeEach(async () => {
      // Set up authenticated driver with initial assignment
      useDriverStore.getState().setAuthState({
        isAuthenticated: true,
        isDriver: true,
        isLoading: false,
        error: null,
      });

      useDriverStore.getState().setDriverData({
        driverId: 'driver-123',
        driverEmail: 'driver@example.com',
        driverName: 'John Driver',
        busAssignment: {
          driver_id: 'driver-123',
          bus_id: 'bus-456',
          bus_number: 'BUS-001',
          route_id: 'route-789',
          route_name: 'Route A',
          driver_name: 'John Driver',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      useDriverStore.getState().setInitializationState({
        isInitializing: false,
        initializationError: null,
      });
    });

    it('should handle assignment updates', async () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Step 1: Initial assignment should be displayed
      await waitFor(() => {
        expect(screen.getByText('BUS-001')).toBeInTheDocument();
        expect(screen.getByText('Route A')).toBeInTheDocument();
      });

      // Step 2: Simulate assignment update from admin
      const newAssignment = {
        driver_id: 'driver-123',
        bus_id: 'bus-789',
        bus_number: 'BUS-002',
        route_id: 'route-456',
        route_name: 'Route B',
        driver_name: 'John Driver',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      useDriverStore.getState().updateBusAssignment(newAssignment);

      // Step 3: Verify assignment update is reflected
      await waitFor(() => {
        expect(screen.getByText('BUS-002')).toBeInTheDocument();
        expect(screen.getByText('Route B')).toBeInTheDocument();
      });

      // Step 4: Simulate assignment removal
      useDriverStore.getState().clearAssignment();

      await waitFor(() => {
        expect(screen.queryByText('BUS-002')).not.toBeInTheDocument();
        expect(screen.queryByText('Route B')).not.toBeInTheDocument();
      });
    });
  });

  describe('Complete Error Recovery Flow', () => {
    beforeEach(async () => {
      // Set up authenticated driver state
      useDriverStore.getState().setAuthState({
        isAuthenticated: true,
        isDriver: true,
        isLoading: false,
        error: null,
      });

      useDriverStore.getState().setInitializationState({
        isInitializing: false,
        initializationError: null,
      });
    });

    it('should handle and recover from multiple errors', async () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Step 1: Dashboard loads successfully
      await waitFor(() => {
        expect(screen.getByText('Driver Dashboard')).toBeInTheDocument();
      });

      // Step 2: Simulate initialization error
      useDriverStore.getState().setInitializationState({
        isInitializing: false,
        initializationError: 'Failed to load driver data',
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to load driver data')).toBeInTheDocument();
      });

      // Step 3: Clear initialization error
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(useDriverStore.getState().initializationError).toBe(null);
      });

      // Step 4: Simulate location error
      useLocationStore.getState().setLocationError({
        code: 1,
        message: 'Location service unavailable',
      });

      await waitFor(() => {
        expect(screen.getByText(/location service unavailable/i)).toBeInTheDocument();
      });

      // Step 5: Clear location error
      useLocationStore.getState().clearError();

      await waitFor(() => {
        expect(screen.queryByText(/location service unavailable/i)).not.toBeInTheDocument();
      });

      // Step 6: Simulate connection error
      useConnectionStore.getState().setConnectionError('WebSocket connection failed');

      await waitFor(() => {
        expect(screen.getByText(/websocket connection failed/i)).toBeInTheDocument();
      });

      // Step 7: Retry connection
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(useConnectionStore.getState().reconnectAttempts).toBe(1);
      });
    });
  });

  describe('Complete Sign Out Flow', () => {
    beforeEach(async () => {
      // Set up authenticated driver with active tracking
      useDriverStore.getState().setAuthState({
        isAuthenticated: true,
        isDriver: true,
        isLoading: false,
        error: null,
      });

      useDriverStore.getState().setDriverData({
        driverId: 'driver-123',
        driverEmail: 'driver@example.com',
        driverName: 'John Driver',
      });

      useDriverStore.getState().setInitializationState({
        isInitializing: false,
        initializationError: null,
      });

      useLocationStore.getState().setPermissionState({
        hasPermission: true,
        isRequestingPermission: false,
      });

      useLocationStore.getState().startTracking(123);

      useConnectionStore.getState().setConnected(true);
      useConnectionStore.getState().setAuthenticated(true);
    });

    it('should complete sign out workflow', async () => {
      const mockLogout = vi.fn().mockResolvedValue({ success: true });

      vi.mocked(require('../../services/authService').authService.logout)
        .mockImplementation(mockLogout);

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Step 1: Verify active state
      await waitFor(() => {
        expect(screen.getByText('Driver Dashboard')).toBeInTheDocument();
      });

      expect(useDriverStore.getState().isAuthenticated).toBe(true);
      expect(useLocationStore.getState().isTracking).toBe(true);
      expect(useConnectionStore.getState().isConnected).toBe(true);

      // Step 2: Click sign out
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);

      // Step 3: Verify logout was called
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });

      // Step 4: Verify all states are reset
      await waitFor(() => {
        expect(useDriverStore.getState().isAuthenticated).toBe(false);
        expect(useLocationStore.getState().isTracking).toBe(false);
        expect(useConnectionStore.getState().isConnected).toBe(false);
      });
    });
  });

  describe('Performance and State Synchronization', () => {
    it('should maintain state consistency across multiple rapid updates', async () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Rapidly update multiple stores
      for (let i = 0; i < 10; i++) {
        useDriverStore.getState().setAuthState({
          isAuthenticated: true,
          isDriver: true,
          isLoading: false,
          error: null,
        });

        useLocationStore.getState().updateLocation({
          latitude: 40.7128 + (i * 0.001),
          longitude: -74.0060 + (i * 0.001),
          accuracy: 10,
          timestamp: Date.now(),
        });

        useConnectionStore.getState().setLastHeartbeat(Date.now());
      }

      // Verify final state consistency
      await waitFor(() => {
        expect(useDriverStore.getState().isAuthenticated).toBe(true);
        expect(useLocationStore.getState().updateCount).toBe(10);
        expect(useConnectionStore.getState().lastHeartbeat).toBeDefined();
      });
    });
  });
});
