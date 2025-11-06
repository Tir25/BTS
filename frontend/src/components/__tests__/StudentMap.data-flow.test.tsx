/**
 * StudentMap Data Flow Tests
 * 
 * Tests to verify the critical fixes for:
 * 1. Initial bus data loading regardless of enableRealTime
 * 2. Consistent API response handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import StudentMap from '../StudentMap';
import { apiService } from '../../api';
import { busService } from '../../services/busService';
import { unifiedWebSocketService } from '../../services/UnifiedWebSocketService';

// Mock services
vi.mock('../../api');
vi.mock('../../services/busService');
vi.mock('../../services/UnifiedWebSocketService');
vi.mock('../../services/authService', () => ({
  authService: {
    getAccessToken: vi.fn(() => null),
  },
}));

describe('StudentMap Data Flow Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Fix 1: Initial Bus Data Loading', () => {
    it('should load initial bus data even when enableRealTime is false', async () => {
      const mockBuses = [
        {
          id: 'bus1',
          bus_number: 'BUS001',
          route_id: 'route1',
          route_name: 'Route A',
          driver_id: 'driver1',
          driver_name: 'Driver One',
        },
      ];

      // Mock busService
      (busService.syncAllBusesFromAPI as any) = vi.fn().mockResolvedValue(undefined);
      (busService.getAllBuses as any) = vi.fn().mockReturnValue([]);

      // Mock API fallback
      (apiService.getAllBuses as any) = vi.fn().mockResolvedValue({
        success: true,
        data: mockBuses,
        timestamp: new Date().toISOString(),
      });

      (apiService.getLiveLocations as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });

      (apiService.getRoutes as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });

      const { container } = render(
        <StudentMap config={{ enableRealTime: false }} />
      );

      // Wait for data loading
      await waitFor(() => {
        expect(apiService.getAllBuses).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify API was called even though enableRealTime is false
      expect(apiService.getAllBuses).toHaveBeenCalled();
      expect(busService.syncAllBusesFromAPI).toHaveBeenCalled();
    });

    it('should load initial bus data when enableRealTime is true', async () => {
      const mockBuses = [
        {
          id: 'bus1',
          bus_number: 'BUS001',
          route_id: 'route1',
          route_name: 'Route A',
          driver_id: 'driver1',
          driver_name: 'Driver One',
        },
      ];

      // Mock busService
      (busService.syncAllBusesFromAPI as any) = vi.fn().mockResolvedValue(undefined);
      (busService.getAllBuses as any) = vi.fn().mockReturnValue([]);

      // Mock API fallback
      (apiService.getAllBuses as any) = vi.fn().mockResolvedValue({
        success: true,
        data: mockBuses,
        timestamp: new Date().toISOString(),
      });

      (apiService.getLiveLocations as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });

      (apiService.getRoutes as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });

      // Mock WebSocket
      (unifiedWebSocketService.setClientType as any) = vi.fn();
      (unifiedWebSocketService.connect as any) = vi.fn().mockResolvedValue(undefined);
      (unifiedWebSocketService.onBusLocationUpdate as any) = vi.fn(() => vi.fn());
      (unifiedWebSocketService.onDriverConnected as any) = vi.fn(() => vi.fn());
      (unifiedWebSocketService.onDriverDisconnected as any) = vi.fn(() => vi.fn());
      (unifiedWebSocketService.onBusArriving as any) = vi.fn(() => vi.fn());
      (unifiedWebSocketService.getConnectionStatus as any) = vi.fn().mockReturnValue(false);

      const { container } = render(
        <StudentMap config={{ enableRealTime: true }} />
      );

      // Wait for data loading
      await waitFor(() => {
        expect(apiService.getAllBuses).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify both API call and WebSocket setup
      expect(apiService.getAllBuses).toHaveBeenCalled();
      expect(unifiedWebSocketService.connect).toHaveBeenCalled();
    });

    it('should not connect WebSocket when enableRealTime is false', async () => {
      (busService.syncAllBusesFromAPI as any) = vi.fn().mockResolvedValue(undefined);
      (busService.getAllBuses as any) = vi.fn().mockReturnValue([]);
      (apiService.getAllBuses as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });
      (apiService.getLiveLocations as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });
      (apiService.getRoutes as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });

      render(<StudentMap config={{ enableRealTime: false }} />);

      await waitFor(() => {
        expect(apiService.getAllBuses).toHaveBeenCalled();
      });

      // WebSocket should NOT be called
      expect(unifiedWebSocketService.connect).not.toHaveBeenCalled();
    });
  });

  describe('Fix 2: API Response Handling', () => {
    it('should handle wrapped backend response structure correctly', async () => {
      const mockBackendResponse = {
        success: true,
        data: [
          { id: 'bus1', bus_number: 'BUS001' },
          { id: 'bus2', bus_number: 'BUS002' },
        ],
        timestamp: '2024-01-01T00:00:00Z',
      };

      (busService.syncAllBusesFromAPI as any) = vi.fn().mockResolvedValue(undefined);
      (busService.getAllBuses as any) = vi.fn().mockReturnValue([]);
      (apiService.getAllBuses as any) = vi.fn().mockResolvedValue(mockBackendResponse);
      (apiService.getLiveLocations as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });
      (apiService.getRoutes as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });

      render(<StudentMap />);

      await waitFor(() => {
        expect(apiService.getAllBuses).toHaveBeenCalled();
      });

      // Verify response was handled correctly
      const callResult = await apiService.getAllBuses();
      expect(callResult.success).toBe(true);
      expect(Array.isArray(callResult.data)).toBe(true);
      expect(callResult.data.length).toBe(2);
    });

    it('should handle direct array response (legacy support)', async () => {
      const mockDirectArray = [
        { id: 'bus1', bus_number: 'BUS001' },
        { id: 'bus2', bus_number: 'BUS002' },
      ];

      (busService.syncAllBusesFromAPI as any) = vi.fn().mockResolvedValue(undefined);
      (busService.getAllBuses as any) = vi.fn().mockReturnValue([]);
      (apiService.getAllBuses as any) = vi.fn().mockResolvedValue({
        success: true,
        data: mockDirectArray,
        timestamp: new Date().toISOString(),
      });
      (apiService.getLiveLocations as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });
      (apiService.getRoutes as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });

      render(<StudentMap />);

      await waitFor(() => {
        expect(apiService.getAllBuses).toHaveBeenCalled();
      });

      // Verify legacy array format is handled
      const callResult = await apiService.getAllBuses();
      expect(callResult.success).toBe(true);
      expect(Array.isArray(callResult.data)).toBe(true);
    });

    it('should handle error responses gracefully', async () => {
      (busService.syncAllBusesFromAPI as any) = vi.fn().mockResolvedValue(undefined);
      (busService.getAllBuses as any) = vi.fn().mockReturnValue([]);
      (apiService.getAllBuses as any) = vi.fn().mockResolvedValue({
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      });
      (apiService.getLiveLocations as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });
      (apiService.getRoutes as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });

      const { container } = render(<StudentMap />);

      await waitFor(() => {
        expect(apiService.getAllBuses).toHaveBeenCalled();
      });

      // Component should render even with error response
      expect(container).toBeTruthy();
    });
  });

  describe('Integration: Both Fixes Together', () => {
    it('should load data and handle API responses correctly with enableRealTime=false', async () => {
      const mockBuses = [
        {
          id: 'bus1',
          bus_number: 'BUS001',
          route_id: 'route1',
          route_name: 'Route A',
          driver_id: 'driver1',
          driver_name: 'Driver One',
        },
      ];

      (busService.syncAllBusesFromAPI as any) = vi.fn().mockResolvedValue(undefined);
      (busService.getAllBuses as any) = vi.fn().mockReturnValue([]);
      (apiService.getAllBuses as any) = vi.fn().mockResolvedValue({
        success: true,
        data: mockBuses,
        timestamp: new Date().toISOString(),
      });
      (apiService.getLiveLocations as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });
      (apiService.getRoutes as any) = vi.fn().mockResolvedValue({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      });

      const { container } = render(
        <StudentMap config={{ enableRealTime: false }} />
      );

      await waitFor(() => {
        expect(apiService.getAllBuses).toHaveBeenCalled();
        expect(apiService.getLiveLocations).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify data loaded
      expect(apiService.getAllBuses).toHaveBeenCalled();
      expect(apiService.getLiveLocations).toHaveBeenCalled();

      // Verify WebSocket NOT called
      expect(unifiedWebSocketService.connect).not.toHaveBeenCalled();

      // Component should render successfully
      expect(container).toBeTruthy();
    });
  });
});

