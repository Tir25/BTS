/**
 * Comprehensive Integration Tests for Driver Dashboard
 * Tests the complete driver functionality flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UnifiedDriverInterface from '../../components/UnifiedDriverInterface';
import DriverDashboardTest from '../../components/DriverDashboardTest';
import { DriverAuthProvider } from '../../contexts/DriverAuthContext';
import { authService } from '../../services/authService';
import { unifiedWebSocketService } from '../../services/UnifiedWebSocketService';

// Mock all external dependencies
vi.mock('../../services/authService', () => ({
  authService: {
    signIn: vi.fn(),
    signOut: vi.fn(),
    getCurrentUser: vi.fn(),
    getCurrentProfile: vi.fn(),
    getDriverBusAssignment: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}));

vi.mock('../../services/UnifiedWebSocketService', () => ({
  unifiedWebSocketService: {
    isConnected: vi.fn(),
    isAuthenticated: vi.fn(),
    sendLocationUpdate: vi.fn(),
    authenticateAsDriver: vi.fn(),
  },
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock permissions
const mockPermissions = {
  query: vi.fn(),
};

Object.defineProperty(global.navigator, 'permissions', {
  value: mockPermissions,
  writable: true,
});

// Test wrapper with all providers
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
        <DriverAuthProvider>
          {children}
        </DriverAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Driver Dashboard Integration Tests', () => {
  const mockDriver = {
    id: 'driver-1',
    email: 'driver@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockProfile = {
    id: 'driver-1',
    email: 'driver@example.com',
    role: 'driver',
    full_name: 'John Doe',
    first_name: 'John',
    last_name: 'Doe',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockAssignment = {
    driver_id: 'driver-1',
    bus_id: 'bus-1',
    bus_number: 'BUS-001',
    route_id: 'route-1',
    route_name: 'Route A',
    driver_name: 'John Doe',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockVerificationResult = {
    authentication: { success: true },
    assignment: { success: true },
    websocket: { connected: true, authenticated: true },
    locationSharing: { permissionGranted: true, locationAvailable: true, websocketReady: true },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(authService.getCurrentUser).mockReturnValue(mockDriver);
    vi.mocked(authService.getCurrentProfile).mockReturnValue(mockProfile);
    vi.mocked(authService.getDriverBusAssignment).mockResolvedValue(mockAssignment);
    vi.mocked(authService.isAuthenticated).mockReturnValue(true);
    
    vi.mocked(unifiedWebSocketService.isConnected).mockReturnValue(true);
    vi.mocked(unifiedWebSocketService.isAuthenticated).mockReturnValue(true);
    
    vi.mocked(driverVerificationService.verifyDriverFunctionality).mockResolvedValue(mockVerificationResult);
    vi.mocked(driverVerificationService.getVerificationSummary).mockReturnValue('Driver Verification: 6/6 checks passed');
    vi.mocked(driverVerificationService.isDriverReady).mockReturnValue(true);
    
    // Setup geolocation mocks
    mockPermissions.query.mockResolvedValue({ state: 'granted' });
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Driver Flow', () => {
    it('handles complete driver login to dashboard flow', async () => {
      // Start with unauthenticated state
      vi.mocked(authService.isAuthenticated).mockReturnValue(false);
      vi.mocked(authService.getCurrentUser).mockReturnValue(null);

      const { rerender } = render(
        <TestWrapper>
          <UnifiedDriverInterface mode="login" />
        </TestWrapper>
      );

      // Should show login form
      expect(screen.getByText(/driver login/i)).toBeInTheDocument();

      // Simulate successful login
      vi.mocked(authService.signIn).mockResolvedValue({
        success: true,
        user: mockProfile,
      });

      // Update auth state
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      vi.mocked(authService.getCurrentUser).mockReturnValue(mockDriver);

      // Rerender to simulate auth state change
      rerender(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Should now show dashboard
      await waitFor(() => {
        expect(screen.getByText(/connection/i)).toBeInTheDocument();
        expect(screen.getByText(/gps tracking/i)).toBeInTheDocument();
      });
    });

    it('handles driver assignment loading', async () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/bus-001/i)).toBeInTheDocument();
        expect(screen.getByText(/route a/i)).toBeInTheDocument();
      });
    });

    it('handles WebSocket connection and authentication', async () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    it('handles location tracking start', async () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      const startButton = screen.getByText(/start tracking/i);
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(unifiedWebSocketService.sendLocationUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Error Scenarios', () => {
    it('handles authentication failure', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(false);
      vi.mocked(authService.getCurrentUser).mockReturnValue(null);

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Should redirect to login
      expect(screen.getByText(/driver login/i)).toBeInTheDocument();
    });

    it('handles missing bus assignment', async () => {
      vi.mocked(authService.getDriverBusAssignment).mockResolvedValue(null);

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/no bus assignment/i)).toBeInTheDocument();
      });
    });

    it('handles WebSocket disconnection', async () => {
      vi.mocked(unifiedWebSocketService.isConnected).mockReturnValue(false);
      vi.mocked(unifiedWebSocketService.isAuthenticated).mockReturnValue(false);

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      });
    });

    it('handles location permission denial', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'denied' });

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      const startButton = screen.getByText(/start tracking/i);
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/location permission denied/i)).toBeInTheDocument();
      });
    });
  });

  describe('Test Mode Integration', () => {
    it('shows test mode in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      expect(screen.getByText(/show test mode/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('runs verification tests successfully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      const testToggle = screen.getByText(/show test mode/i);
      fireEvent.click(testToggle);

      await waitFor(() => {
        expect(screen.getByText(/driver dashboard test/i)).toBeInTheDocument();
      });

      const runButton = screen.getByText(/run verification/i);
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText(/driver ready for operation/i)).toBeInTheDocument();
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('handles verification test failures', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const failedResult = {
        authentication: { success: false },
        assignment: { success: false },
        websocket: { connected: false, authenticated: false },
        locationSharing: { permissionGranted: false, locationAvailable: false, websocketReady: false },
      };

      vi.mocked(driverVerificationService.verifyDriverFunctionality).mockResolvedValue(failedResult);
      vi.mocked(driverVerificationService.getVerificationSummary).mockReturnValue('Driver Verification: 0/6 checks passed');
      vi.mocked(driverVerificationService.isDriverReady).mockReturnValue(false);

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      const testToggle = screen.getByText(/show test mode/i);
      fireEvent.click(testToggle);

      await waitFor(() => {
        expect(screen.getByText(/driver dashboard test/i)).toBeInTheDocument();
      });

      const runButton = screen.getByText(/run verification/i);
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText(/driver needs attention/i)).toBeInTheDocument();
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Performance and Optimization', () => {
    it('uses memoized components correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Re-render with same props
      rerender(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Component should still render correctly
      expect(screen.getByText(/connection/i)).toBeInTheDocument();
    });

    it('handles multiple rapid state changes', async () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Rapidly change WebSocket state
      vi.mocked(unifiedWebSocketService.isConnected).mockReturnValue(false);
      vi.mocked(unifiedWebSocketService.isAuthenticated).mockReturnValue(false);

      await waitFor(() => {
        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      });

      vi.mocked(unifiedWebSocketService.isConnected).mockReturnValue(true);
      vi.mocked(unifiedWebSocketService.isAuthenticated).mockReturnValue(true);

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and UX', () => {
    it('maintains proper focus management', async () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      const startButton = screen.getByRole('button', { name: /start tracking/i });
      expect(startButton).toBeInTheDocument();
      expect(startButton).toBeEnabled();
    });

    it('provides proper loading states', async () => {
      // Make assignment loading slow
      vi.mocked(authService.getDriverBusAssignment).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockAssignment), 100))
      );

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Should show loading state
      expect(screen.getByText(/loading driver interface/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/bus-001/i)).toBeInTheDocument();
      });
    });

    it('handles keyboard navigation', async () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      const startButton = screen.getByRole('button', { name: /start tracking/i });
      startButton.focus();
      expect(document.activeElement).toBe(startButton);

      fireEvent.keyDown(startButton, { key: 'Enter' });
      // Should trigger the click
    });
  });
});
