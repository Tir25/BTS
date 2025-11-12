import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UnifiedDriverInterface from '../../components/UnifiedDriverInterface';
import { useDriverInterfaceStore } from '../../stores/useDriverInterfaceStore';
import { useDriverStore } from '../../stores/useDriverStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { useConnectionStore } from '../../stores/useConnectionStore';
import * as authServiceModule from '../../services/authService';

// Mock the logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the auth service
vi.mock('../../services/authService', () => ({
  authService: {
    validateDriverSession: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    getCurrentProfile: vi.fn(),
  },
}));

// Mock the WebSocket service
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

// Mock the location service
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

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock DriverAuthContext
vi.mock('../../contexts/DriverAuthContext', () => ({
  useDriverAuth: () => ({
    logout: vi.fn(),
    retryConnection: vi.fn(),
    refreshAssignment: vi.fn(),
  }),
}));

// Test wrapper component
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

describe('UnifiedDriverInterface Integration Tests', () => {
  beforeEach(() => {
    // Reset all store states
    useDriverStore.getState().resetAll();
    useLocationStore.getState().resetAll();
    useConnectionStore.getState().resetAll();
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="login" />
        </TestWrapper>
      );

      expect(screen.getByText('Loading driver interface...')).toBeInTheDocument();
    });

    it('should render login form when not authenticated', async () => {
      // Set up store state for unauthenticated user
      useDriverStore.getState().setAuthState({
        isAuthenticated: false,
        isDriver: false,
        isLoading: false,
        error: null,
      });

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="login" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Driver Login')).toBeInTheDocument();
      });
    });

    it('should render dashboard when authenticated', async () => {
      // Set up store state for authenticated driver
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

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Driver Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should handle successful login', async () => {
      const mockValidateDriverSession = vi.fn().mockResolvedValue({
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

      vi.mocked(authServiceModule.authService.validateDriverSession)
        .mockImplementation(mockValidateDriverSession);

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="login" />
        </TestWrapper>
      );

      // Simulate login form interaction
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'driver@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockValidateDriverSession).toHaveBeenCalled();
      });
    });

    it('should handle login errors', async () => {
      const mockValidateDriverSession = vi.fn().mockResolvedValue({
        isValid: false,
        assignment: null,
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: 'Invalid email or password',
      });

      vi.mocked(authServiceModule.authService.validateDriverSession)
        .mockImplementation(mockValidateDriverSession);

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="login" />
        </TestWrapper>
      );

      // Simulate login attempt
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'invalid@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });
  });

  describe('Location Tracking', () => {
    it('should start location tracking when button is clicked', async () => {
      // Set up authenticated state
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

      useLocationStore.getState().setPermissionState({
        hasPermission: true,
        isRequestingPermission: false,
      });

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        const startTrackingButton = screen.getByRole('button', { name: /start tracking/i });
        expect(startTrackingButton).toBeInTheDocument();
      });

      const startTrackingButton = screen.getByRole('button', { name: /start tracking/i });
      fireEvent.click(startTrackingButton);

      await waitFor(() => {
        expect(useLocationStore.getState().isTracking).toBe(true);
      });
    });

    it('should stop location tracking when button is clicked', async () => {
      // Set up tracking state
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

      useLocationStore.getState().setPermissionState({
        hasPermission: true,
        isRequestingPermission: false,
      });

      useLocationStore.getState().startTracking(123);

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        const stopTrackingButton = screen.getByRole('button', { name: /stop tracking/i });
        expect(stopTrackingButton).toBeInTheDocument();
      });

      const stopTrackingButton = screen.getByRole('button', { name: /stop tracking/i });
      fireEvent.click(stopTrackingButton);

      await waitFor(() => {
        expect(useLocationStore.getState().isTracking).toBe(false);
      });
    });

    it('should request location permission when needed', async () => {
      // Set up state without permission
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

      useLocationStore.getState().setPermissionState({
        hasPermission: false,
        isRequestingPermission: false,
      });

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        const requestPermissionButton = screen.getByRole('button', { name: /request permission/i });
        expect(requestPermissionButton).toBeInTheDocument();
      });

      const requestPermissionButton = screen.getByRole('button', { name: /request permission/i });
      fireEvent.click(requestPermissionButton);

      await waitFor(() => {
        expect(useLocationStore.getState().isRequestingPermission).toBe(true);
      });
    });
  });

  describe('WebSocket Connection', () => {
    it('should show connection status', async () => {
      // Set up authenticated state
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

      // Set connection state
      useConnectionStore.getState().setConnected(true);
      useConnectionStore.getState().setAuthenticated(true);
      useConnectionStore.getState().setConnectionStatus('connected');

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    it('should show disconnected status', async () => {
      // Set up authenticated state
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

      // Set disconnected state
      useConnectionStore.getState().setConnected(false);
      useConnectionStore.getState().setAuthenticated(false);
      useConnectionStore.getState().setConnectionStatus('disconnected');

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      });
    });

    it('should handle connection retry', async () => {
      // Set up authenticated state with connection error
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

      useConnectionStore.getState().setConnectionError('Connection failed');
      useConnectionStore.getState().setConnectionStatus('disconnected');

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Should increment reconnect attempts
      await waitFor(() => {
        expect(useConnectionStore.getState().reconnectAttempts).toBe(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display initialization errors', async () => {
      useDriverStore.getState().setInitializationState({
        isInitializing: false,
        initializationError: 'Failed to initialize dashboard',
      });

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to initialize dashboard')).toBeInTheDocument();
      });
    });

    it('should clear initialization errors when dismiss button is clicked', async () => {
      useDriverStore.getState().setInitializationState({
        isInitializing: false,
        initializationError: 'Failed to initialize dashboard',
      });

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        const dismissButton = screen.getByRole('button', { name: /dismiss/i });
        expect(dismissButton).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(useDriverStore.getState().initializationError).toBe(null);
      });
    });

    it('should display location errors', async () => {
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

      useLocationStore.getState().setLocationError({
        code: 1,
        message: 'Location permission denied',
      });

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/location permission denied/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sign Out', () => {
    it('should handle sign out correctly', async () => {
      const mockLogout = vi.fn().mockResolvedValue({ success: true });

      vi.mocked(authServiceModule.authService.logout)
        .mockImplementation(mockLogout);

      // Set up authenticated state
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

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        const signOutButton = screen.getByRole('button', { name: /sign out/i });
        expect(signOutButton).toBeInTheDocument();
      });

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });
  });

  describe('State Synchronization', () => {
    it('should sync state between stores correctly', async () => {
      // Update driver store
      useDriverStore.getState().setAuthState({
        isAuthenticated: true,
        isDriver: true,
        isLoading: false,
        error: null,
      });

      // Update location store
      useLocationStore.getState().setPermissionState({
        hasPermission: true,
        isRequestingPermission: false,
      });

      // Update connection store
      useConnectionStore.getState().setConnected(true);
      useConnectionStore.getState().setAuthenticated(true);

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check that all states are properly reflected
        expect(useDriverStore.getState().isAuthenticated).toBe(true);
        expect(useLocationStore.getState().hasPermission).toBe(true);
        expect(useConnectionStore.getState().isConnected).toBe(true);
        expect(useConnectionStore.getState().isAuthenticated).toBe(true);
      });
    });
  });
});
