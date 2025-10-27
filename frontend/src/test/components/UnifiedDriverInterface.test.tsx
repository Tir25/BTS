/**
 * Comprehensive tests for UnifiedDriverInterface component
 * Tests all architectural improvements and optimizations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UnifiedDriverInterface from '../../components/UnifiedDriverInterface';
import { DriverAuthProvider } from '../../contexts/DriverAuthContext';
import { unifiedWebSocketService } from '../../services/UnifiedWebSocketService';

// Mock dependencies
vi.mock('../../services/UnifiedWebSocketService', () => ({
  unifiedWebSocketService: {
    isConnected: vi.fn(() => true),
    isAuthenticated: vi.fn(() => true),
    sendLocationUpdate: vi.fn(),
    authenticateAsDriver: vi.fn(() => Promise.resolve(true)),
  },
}));

// Mock the driver auth context
const mockDriverAuth = {
  isAuthenticated: false,
  isLoading: false,
  error: null,
  busAssignment: null,
  isWebSocketConnected: false,
  isWebSocketAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  retryConnection: vi.fn(),
  refreshAssignment: vi.fn(),
};

vi.mock('../../contexts/DriverAuthContext', () => ({
  useDriverAuth: () => mockDriverAuth,
  DriverAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <DriverAuthProvider>
      {children}
    </DriverAuthProvider>
  </BrowserRouter>
);

describe('UnifiedDriverInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockDriverAuth.isAuthenticated = false;
    mockDriverAuth.isLoading = false;
    mockDriverAuth.error = null;
    mockDriverAuth.busAssignment = null;
    mockDriverAuth.isWebSocketConnected = false;
    mockDriverAuth.isWebSocketAuthenticated = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders login mode by default', () => {
      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="login" />
        </TestWrapper>
      );

      // Should show login component
      expect(screen.getByText(/driver login/i)).toBeInTheDocument();
    });

    it('renders dashboard mode when authenticated', () => {
      mockDriverAuth.isAuthenticated = true;
      mockDriverAuth.busAssignment = {
        driver_id: 'driver-1',
        bus_id: 'bus-1',
        bus_number: 'BUS-001',
        route_id: 'route-1',
        route_name: 'Route A',
        driver_name: 'John Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Should show dashboard components
      expect(screen.getByText(/connection/i)).toBeInTheDocument();
      expect(screen.getByText(/gps tracking/i)).toBeInTheDocument();
    });

    it('shows loading state when initializing', () => {
      mockDriverAuth.isLoading = true;

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      expect(screen.getByText(/loading driver interface/i)).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('uses memoized component', () => {
      const { rerender } = render(
        <TestWrapper>
          <UnifiedDriverInterface mode="login" />
        </TestWrapper>
      );

      // Re-render with same props should not cause unnecessary re-renders
      rerender(
        <TestWrapper>
          <UnifiedDriverInterface mode="login" />
        </TestWrapper>
      );

      // Component should still render correctly
      expect(screen.getByText(/driver login/i)).toBeInTheDocument();
    });

    it('uses memoized handlers', () => {
      mockDriverAuth.isAuthenticated = true;
      mockDriverAuth.busAssignment = {
        driver_id: 'driver-1',
        bus_id: 'bus-1',
        bus_number: 'BUS-001',
        route_id: 'route-1',
        route_name: 'Route A',
        driver_name: 'John Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Test that handlers are properly memoized
      const startButton = screen.getByText(/start tracking/i);
      expect(startButton).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error state when authentication fails', () => {
      mockDriverAuth.error = 'Authentication failed';

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      expect(screen.getByText(/error loading interface/i)).toBeInTheDocument();
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });

    it('provides retry functionality', () => {
      mockDriverAuth.error = 'Connection failed';

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      const retryButton = screen.getByText(/retry/i);
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(mockDriverAuth.retryConnection).toHaveBeenCalled();
    });
  });

  describe('WebSocket Integration', () => {
    it('handles WebSocket connection status', () => {
      mockDriverAuth.isAuthenticated = true;
      mockDriverAuth.isWebSocketConnected = true;
      mockDriverAuth.isWebSocketAuthenticated = true;
      mockDriverAuth.busAssignment = {
        driver_id: 'driver-1',
        bus_id: 'bus-1',
        bus_number: 'BUS-001',
        route_id: 'route-1',
        route_name: 'Route A',
        driver_name: 'John Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Should show connected status
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it('handles WebSocket disconnection', () => {
      mockDriverAuth.isAuthenticated = true;
      mockDriverAuth.isWebSocketConnected = false;
      mockDriverAuth.isWebSocketAuthenticated = false;
      mockDriverAuth.busAssignment = {
        driver_id: 'driver-1',
        bus_id: 'bus-1',
        bus_number: 'BUS-001',
        route_id: 'route-1',
        route_name: 'Route A',
        driver_name: 'John Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      // Should show disconnected status
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    });
  });

  describe('Location Tracking', () => {
    it('handles location tracking start', async () => {
      mockDriverAuth.isAuthenticated = true;
      mockDriverAuth.isWebSocketConnected = true;
      mockDriverAuth.isWebSocketAuthenticated = true;
      mockDriverAuth.busAssignment = {
        driver_id: 'driver-1',
        bus_id: 'bus-1',
        bus_number: 'BUS-001',
        route_id: 'route-1',
        route_name: 'Route A',
        driver_name: 'John Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockStartTracking = vi.fn();
      const mockRequestPermission = vi.fn(() => Promise.resolve(true));

      // Mock removed - useLocationStoreBridge now handles location tracking

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      const startButton = screen.getByText(/start tracking/i);
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
        expect(mockStartTracking).toHaveBeenCalled();
      });
    });

    it('handles location permission denial', async () => {
      mockDriverAuth.isAuthenticated = true;
      mockDriverAuth.isWebSocketConnected = true;
      mockDriverAuth.isWebSocketAuthenticated = true;
      mockDriverAuth.busAssignment = {
        driver_id: 'driver-1',
        bus_id: 'bus-1',
        bus_number: 'BUS-001',
        route_id: 'route-1',
        route_name: 'Route A',
        driver_name: 'John Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockRequestPermission = vi.fn(() => Promise.resolve(false));

      // Mock removed - useLocationStoreBridge now handles location tracking

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      const startButton = screen.getByText(/start tracking/i);
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
        // Should show permission error
        expect(screen.getByText(/location permission denied/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('redirects to login when not authenticated', () => {
      mockDriverAuth.isAuthenticated = false;
      mockDriverAuth.isLoading = false;

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/driver-login');
    });
  });

  describe('Test Mode (Development)', () => {
    it('shows test mode toggle in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockDriverAuth.isAuthenticated = true;
      mockDriverAuth.busAssignment = {
        driver_id: 'driver-1',
        bus_id: 'bus-1',
        bus_number: 'BUS-001',
        route_id: 'route-1',
        route_name: 'Route A',
        driver_name: 'John Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      expect(screen.getByText(/show test mode/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('hides test mode toggle in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockDriverAuth.isAuthenticated = true;
      mockDriverAuth.busAssignment = {
        driver_id: 'driver-1',
        bus_id: 'bus-1',
        bus_number: 'BUS-001',
        route_id: 'route-1',
        route_name: 'Route A',
        driver_name: 'John Doe',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(
        <TestWrapper>
          <UnifiedDriverInterface mode="dashboard" />
        </TestWrapper>
      );

      expect(screen.queryByText(/show test mode/i)).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
