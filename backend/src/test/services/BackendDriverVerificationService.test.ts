/**
 * Comprehensive tests for BackendDriverVerificationService
 * Tests backend driver system verification functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { backendDriverVerificationService, BackendVerificationResult } from '../../../backend/src/services/BackendDriverVerificationService';
import { supabaseAdmin } from '../../../backend/src/config/supabase';

// Mock Supabase admin client
vi.mock('../../../backend/src/config/supabase', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe('BackendDriverVerificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyBackendDriverSystem', () => {
    it('returns comprehensive verification result', async () => {
      // Mock successful database connection
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { status: 'connected' },
        error: null,
      });

      // Mock driver profiles query
      const mockFrom = vi.fn();
      const mockSelect = vi.fn();
      const mockEq = vi.fn();
      const mockCount = vi.fn();

      mockCount.mockResolvedValue({ count: 5, error: null });
      mockEq.mockReturnValue({ count: mockCount });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);

      // Mock assigned buses query
      const mockNot = vi.fn();
      const mockLimit = vi.fn();
      const mockSingle = vi.fn();

      mockSingle.mockResolvedValue({
        data: [{
          id: 'bus-1',
          bus_number: 'BUS-001',
          route_id: 'route-1',
          assigned_driver_profile_id: 'driver-1',
          routes: { name: 'Route A' },
          user_profiles: { full_name: 'John Doe' },
        }],
        error: null,
      });

      mockLimit.mockReturnValue({ single: mockSingle });
      mockNot.mockReturnValue({ limit: mockLimit });
      mockEq.mockReturnValue({ not: mockNot });

      const result = await backendDriverVerificationService.verifyBackendDriverSystem();

      expect(result).toHaveProperty('databaseConnection');
      expect(result).toHaveProperty('driverProfilesExist');
      expect(result).toHaveProperty('assignedBusesExist');
      expect(result).toHaveProperty('overallStatus');
      expect(result).toHaveProperty('timestamp');
    });

    it('handles database connection success', async () => {
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { status: 'connected' },
        error: null,
      });

      // Mock other queries to succeed
      const mockFrom = vi.fn();
      const mockSelect = vi.fn();
      const mockEq = vi.fn();
      const mockCount = vi.fn();
      const mockNot = vi.fn();
      const mockLimit = vi.fn();
      const mockSingle = vi.fn();

      mockCount.mockResolvedValue({ count: 5, error: null });
      mockSingle.mockResolvedValue({
        data: [{
          id: 'bus-1',
          bus_number: 'BUS-001',
          route_id: 'route-1',
          assigned_driver_profile_id: 'driver-1',
          routes: { name: 'Route A' },
          user_profiles: { full_name: 'John Doe' },
        }],
        error: null,
      });

      mockEq.mockReturnValue({ count: mockCount, not: mockNot });
      mockNot.mockReturnValue({ limit: mockLimit });
      mockLimit.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);

      const result = await backendDriverVerificationService.verifyBackendDriverSystem();

      expect(result.databaseConnection).toBe('connected');
      expect(result.databaseMessage).toBe('Successfully connected to Supabase database.');
    });

    it('handles database connection failure', async () => {
      vi.mocked(supabaseAdmin.rpc).mockRejectedValue(new Error('Connection failed'));

      const result = await backendDriverVerificationService.verifyBackendDriverSystem();

      expect(result.databaseConnection).toBe('error');
      expect(result.databaseMessage).toContain('Database connection failed');
    });

    it('verifies driver profiles exist', async () => {
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { status: 'connected' },
        error: null,
      });

      const mockFrom = vi.fn();
      const mockSelect = vi.fn();
      const mockEq = vi.fn();
      const mockCount = vi.fn();
      const mockNot = vi.fn();
      const mockLimit = vi.fn();
      const mockSingle = vi.fn();

      mockCount.mockResolvedValue({ count: 5, error: null });
      mockSingle.mockResolvedValue({
        data: [{
          id: 'bus-1',
          bus_number: 'BUS-001',
          route_id: 'route-1',
          assigned_driver_profile_id: 'driver-1',
          routes: { name: 'Route A' },
          user_profiles: { full_name: 'John Doe' },
        }],
        error: null,
      });

      mockEq.mockReturnValue({ count: mockCount, not: mockNot });
      mockNot.mockReturnValue({ limit: mockLimit });
      mockLimit.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);

      const result = await backendDriverVerificationService.verifyBackendDriverSystem();

      expect(result.driverProfilesExist).toBe(true);
      expect(result.driverProfilesMessage).toBe('Found 5 driver profiles.');
    });

    it('handles no driver profiles', async () => {
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { status: 'connected' },
        error: null,
      });

      const mockFrom = vi.fn();
      const mockSelect = vi.fn();
      const mockEq = vi.fn();
      const mockCount = vi.fn();
      const mockNot = vi.fn();
      const mockLimit = vi.fn();
      const mockSingle = vi.fn();

      mockCount.mockResolvedValue({ count: 0, error: null });
      mockSingle.mockResolvedValue({
        data: [],
        error: null,
      });

      mockEq.mockReturnValue({ count: mockCount, not: mockNot });
      mockNot.mockReturnValue({ limit: mockLimit });
      mockLimit.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);

      const result = await backendDriverVerificationService.verifyBackendDriverSystem();

      expect(result.driverProfilesExist).toBe(false);
      expect(result.driverProfilesMessage).toBe('No driver profiles found in the database.');
    });

    it('verifies assigned buses exist', async () => {
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { status: 'connected' },
        error: null,
      });

      const mockFrom = vi.fn();
      const mockSelect = vi.fn();
      const mockEq = vi.fn();
      const mockCount = vi.fn();
      const mockNot = vi.fn();
      const mockLimit = vi.fn();
      const mockSingle = vi.fn();

      mockCount.mockResolvedValue({ count: 5, error: null });
      mockSingle.mockResolvedValue({
        data: [{
          id: 'bus-1',
          bus_number: 'BUS-001',
          route_id: 'route-1',
          assigned_driver_profile_id: 'driver-1',
          routes: { name: 'Route A' },
          user_profiles: { full_name: 'John Doe' },
        }],
        error: null,
      });

      mockEq.mockReturnValue({ count: mockCount, not: mockNot });
      mockNot.mockReturnValue({ limit: mockLimit });
      mockLimit.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);

      const result = await backendDriverVerificationService.verifyBackendDriverSystem();

      expect(result.assignedBusesExist).toBe(true);
      expect(result.assignedBusesMessage).toBe('Found 1 active bus assignments.');
      expect(result.sampleDriverAssignment).toEqual({
        driver_id: 'driver-1',
        bus_id: 'bus-1',
        bus_number: 'BUS-001',
        route_id: 'route-1',
        route_name: 'Route A',
        driver_name: 'John Doe',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('handles no assigned buses', async () => {
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { status: 'connected' },
        error: null,
      });

      const mockFrom = vi.fn();
      const mockSelect = vi.fn();
      const mockEq = vi.fn();
      const mockCount = vi.fn();
      const mockNot = vi.fn();
      const mockLimit = vi.fn();
      const mockSingle = vi.fn();

      mockCount.mockResolvedValue({ count: 5, error: null });
      mockSingle.mockResolvedValue({
        data: [],
        error: null,
      });

      mockEq.mockReturnValue({ count: mockCount, not: mockNot });
      mockNot.mockReturnValue({ limit: mockLimit });
      mockLimit.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);

      const result = await backendDriverVerificationService.verifyBackendDriverSystem();

      expect(result.assignedBusesExist).toBe(false);
      expect(result.assignedBusesMessage).toBe('No active bus assignments found.');
    });

    it('determines overall status correctly', async () => {
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { status: 'connected' },
        error: null,
      });

      const mockFrom = vi.fn();
      const mockSelect = vi.fn();
      const mockEq = vi.fn();
      const mockCount = vi.fn();
      const mockNot = vi.fn();
      const mockLimit = vi.fn();
      const mockSingle = vi.fn();

      mockCount.mockResolvedValue({ count: 5, error: null });
      mockSingle.mockResolvedValue({
        data: [{
          id: 'bus-1',
          bus_number: 'BUS-001',
          route_id: 'route-1',
          assigned_driver_profile_id: 'driver-1',
          routes: { name: 'Route A' },
          user_profiles: { full_name: 'John Doe' },
        }],
        error: null,
      });

      mockEq.mockReturnValue({ count: mockCount, not: mockNot });
      mockNot.mockReturnValue({ limit: mockLimit });
      mockLimit.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);

      const result = await backendDriverVerificationService.verifyBackendDriverSystem();

      expect(result.overallStatus).toBe('ready');
    });

    it('handles degraded status', async () => {
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { status: 'connected' },
        error: null,
      });

      const mockFrom = vi.fn();
      const mockSelect = vi.fn();
      const mockEq = vi.fn();
      const mockCount = vi.fn();
      const mockNot = vi.fn();
      const mockLimit = vi.fn();
      const mockSingle = vi.fn();

      mockCount.mockResolvedValue({ count: 0, error: null });
      mockSingle.mockResolvedValue({
        data: [{
          id: 'bus-1',
          bus_number: 'BUS-001',
          route_id: 'route-1',
          assigned_driver_profile_id: 'driver-1',
          routes: { name: 'Route A' },
          user_profiles: { full_name: 'John Doe' },
        }],
        error: null,
      });

      mockEq.mockReturnValue({ count: mockCount, not: mockNot });
      mockNot.mockReturnValue({ limit: mockLimit });
      mockLimit.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);

      const result = await backendDriverVerificationService.verifyBackendDriverSystem();

      expect(result.overallStatus).toBe('degraded');
    });

    it('handles failed status', async () => {
      vi.mocked(supabaseAdmin.rpc).mockRejectedValue(new Error('Connection failed'));

      const result = await backendDriverVerificationService.verifyBackendDriverSystem();

      expect(result.overallStatus).toBe('failed');
    });
  });

  describe('Utility Methods', () => {
    it('generates correct verification summary', () => {
      const readyResult: BackendVerificationResult = {
        databaseConnection: 'connected',
        databaseMessage: 'Successfully connected to Supabase database.',
        driverProfilesExist: true,
        driverProfilesMessage: 'Found 5 driver profiles.',
        assignedBusesExist: true,
        assignedBusesMessage: 'Found 3 active bus assignments.',
        overallStatus: 'ready',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const failedResult: BackendVerificationResult = {
        databaseConnection: 'error',
        databaseMessage: 'Database connection failed.',
        driverProfilesExist: false,
        driverProfilesMessage: 'No driver profiles found.',
        assignedBusesExist: false,
        assignedBusesMessage: 'No active bus assignments found.',
        overallStatus: 'failed',
        timestamp: '2024-01-01T00:00:00Z',
      };

      expect(backendDriverVerificationService.getVerificationSummary(readyResult))
        .toBe('Backend driver system is fully operational.');
      expect(backendDriverVerificationService.getVerificationSummary(failedResult))
        .toBe('Backend driver system has critical failures. Check logs for details.');
    });

    it('correctly determines backend readiness', () => {
      const readyResult: BackendVerificationResult = {
        databaseConnection: 'connected',
        databaseMessage: 'Successfully connected to Supabase database.',
        driverProfilesExist: true,
        driverProfilesMessage: 'Found 5 driver profiles.',
        assignedBusesExist: true,
        assignedBusesMessage: 'Found 3 active bus assignments.',
        overallStatus: 'ready',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const notReadyResult: BackendVerificationResult = {
        databaseConnection: 'error',
        databaseMessage: 'Database connection failed.',
        driverProfilesExist: false,
        driverProfilesMessage: 'No driver profiles found.',
        assignedBusesExist: false,
        assignedBusesMessage: 'No active bus assignments found.',
        overallStatus: 'failed',
        timestamp: '2024-01-01T00:00:00Z',
      };

      expect(backendDriverVerificationService.isBackendReady(readyResult)).toBe(true);
      expect(backendDriverVerificationService.isBackendReady(notReadyResult)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('handles database query errors gracefully', async () => {
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { status: 'connected' },
        error: null,
      });

      const mockFrom = vi.fn();
      const mockSelect = vi.fn();
      const mockEq = vi.fn();
      const mockCount = vi.fn();

      mockCount.mockRejectedValue(new Error('Query failed'));
      mockEq.mockReturnValue({ count: mockCount });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);

      const result = await backendDriverVerificationService.verifyBackendDriverSystem();

      expect(result.driverProfilesExist).toBe(false);
      expect(result.driverProfilesMessage).toContain('Failed to check driver profiles');
    });

    it('handles assigned buses query errors gracefully', async () => {
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { status: 'connected' },
        error: null,
      });

      const mockFrom = vi.fn();
      const mockSelect = vi.fn();
      const mockEq = vi.fn();
      const mockCount = vi.fn();
      const mockNot = vi.fn();
      const mockLimit = vi.fn();
      const mockSingle = vi.fn();

      mockCount.mockResolvedValue({ count: 5, error: null });
      mockSingle.mockRejectedValue(new Error('Query failed'));

      mockEq.mockReturnValue({ count: mockCount, not: mockNot });
      mockNot.mockReturnValue({ limit: mockLimit });
      mockLimit.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);

      const result = await backendDriverVerificationService.verifyBackendDriverSystem();

      expect(result.assignedBusesExist).toBe(false);
      expect(result.assignedBusesMessage).toContain('Failed to check assigned buses');
    });
  });
});
