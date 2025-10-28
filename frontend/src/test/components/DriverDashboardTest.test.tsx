/**
 * Comprehensive tests for DriverDashboardTest component
 * Tests the interactive testing interface
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DriverDashboardTest from '../../components/DriverDashboardTest';

describe('DriverDashboardTest', () => {
  const mockVerificationResult = {
    authentication: {
      success: true,
      driverId: 'driver-1',
      driverEmail: 'driver@example.com',
    },
    assignment: {
      success: true,
      busInfo: {
        bus_id: 'bus-1',
        bus_number: 'BUS-001',
        route_id: 'route-1',
        route_name: 'Route A',
      },
    },
    websocket: {
      connected: true,
      authenticated: true,
    },
    locationSharing: {
      permissionGranted: true,
      locationAvailable: true,
      websocketReady: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(driverVerificationService.verifyDriverFunctionality).mockResolvedValue(mockVerificationResult);
    vi.mocked(driverVerificationService.getVerificationSummary).mockReturnValue('Driver Verification: 6/6 checks passed');
    vi.mocked(driverVerificationService.isDriverReady).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders test interface correctly', () => {
      render(<DriverDashboardTest />);

      expect(screen.getByText('Driver Dashboard Test')).toBeInTheDocument();
      expect(screen.getByText('Run Verification')).toBeInTheDocument();
    });

    it('shows run button as enabled initially', () => {
      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      expect(runButton).toBeEnabled();
    });
  });

  describe('Test Execution', () => {
    it('runs verification when button is clicked', async () => {
      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      expect(driverVerificationService.verifyDriverFunctionality).toHaveBeenCalled();
    });

    it('shows loading state during verification', async () => {
      // Make the verification take some time
      vi.mocked(driverVerificationService.verifyDriverFunctionality).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockVerificationResult), 100))
      );

      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      expect(screen.getByText('Running Tests...')).toBeInTheDocument();
      expect(runButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Run Verification')).toBeInTheDocument();
      });
    });

    it('displays verification results after completion', async () => {
      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('Authentication')).toBeInTheDocument();
        expect(screen.getByText('Bus Assignment')).toBeInTheDocument();
        expect(screen.getByText('WebSocket Connection')).toBeInTheDocument();
        expect(screen.getByText('Location Sharing')).toBeInTheDocument();
      });
    });

    it('calls onTestComplete callback when provided', async () => {
      const mockOnTestComplete = vi.fn();
      render(<DriverDashboardTest onTestComplete={mockOnTestComplete} />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(mockOnTestComplete).toHaveBeenCalledWith(mockVerificationResult);
      });
    });
  });

  describe('Result Display', () => {
    it('displays successful authentication', async () => {
      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('Driver ID: driver-1')).toBeInTheDocument();
        expect(screen.getByText('Email: driver@example.com')).toBeInTheDocument();
      });
    });

    it('displays successful bus assignment', async () => {
      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('Bus: BUS-001')).toBeInTheDocument();
        expect(screen.getByText('Route: Route A')).toBeInTheDocument();
      });
    });

    it('displays WebSocket status', async () => {
      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('Connected: Yes')).toBeInTheDocument();
        expect(screen.getByText('Authenticated: Yes')).toBeInTheDocument();
      });
    });

    it('displays location sharing status', async () => {
      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('Permission: Granted')).toBeInTheDocument();
        expect(screen.getByText('Location Available: Yes')).toBeInTheDocument();
        expect(screen.getByText('WebSocket Ready: Yes')).toBeInTheDocument();
      });
    });

    it('displays error messages when verification fails', async () => {
      const errorResult = {
        authentication: {
          success: false,
          error: 'Authentication failed',
        },
        assignment: {
          success: false,
          error: 'No assignment found',
        },
        websocket: {
          connected: false,
          authenticated: false,
          error: 'Connection failed',
        },
        locationSharing: {
          permissionGranted: false,
          locationAvailable: false,
          websocketReady: false,
          error: 'Permission denied',
        },
      };

      vi.mocked(driverVerificationService.verifyDriverFunctionality).mockResolvedValue(errorResult);
      vi.mocked(driverVerificationService.isDriverReady).mockReturnValue(false);

      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
        expect(screen.getByText('No assignment found')).toBeInTheDocument();
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
        expect(screen.getByText('Permission denied')).toBeInTheDocument();
      });
    });
  });

  describe('Test Logs', () => {
    it('displays test logs after verification', async () => {
      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('Test Logs')).toBeInTheDocument();
        expect(screen.getByText(/Starting driver functionality verification/)).toBeInTheDocument();
        expect(screen.getByText(/Verification completed/)).toBeInTheDocument();
      });
    });

    it('displays error logs when verification fails', async () => {
      vi.mocked(driverVerificationService.verifyDriverFunctionality).mockRejectedValue(
        new Error('Verification failed')
      );

      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText(/Verification failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Overall Status', () => {
    it('displays ready status when all checks pass', async () => {
      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('🎉 Driver Ready for Operation')).toBeInTheDocument();
        expect(screen.getByText('Driver Verification: 6/6 checks passed')).toBeInTheDocument();
      });
    });

    it('displays attention needed status when checks fail', async () => {
      const errorResult = {
        authentication: { success: false },
        assignment: { success: false },
        websocket: { connected: false, authenticated: false },
        locationSharing: { permissionGranted: false, locationAvailable: false, websocketReady: false },
      };

      vi.mocked(driverVerificationService.verifyDriverFunctionality).mockResolvedValue(errorResult);
      vi.mocked(driverVerificationService.getVerificationSummary).mockReturnValue('Driver Verification: 0/6 checks passed');
      vi.mocked(driverVerificationService.isDriverReady).mockReturnValue(false);

      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Driver Needs Attention')).toBeInTheDocument();
        expect(screen.getByText('Driver Verification: 0/6 checks passed')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles verification service errors gracefully', async () => {
      vi.mocked(driverVerificationService.verifyDriverFunctionality).mockRejectedValue(
        new Error('Service unavailable')
      );

      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText(/Verification failed: Service unavailable/)).toBeInTheDocument();
      });
    });

    it('re-enables button after error', async () => {
      vi.mocked(driverVerificationService.verifyDriverFunctionality).mockRejectedValue(
        new Error('Service unavailable')
      );

      render(<DriverDashboardTest />);

      const runButton = screen.getByText('Run Verification');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('Run Verification')).toBeInTheDocument();
        expect(screen.getByText('Run Verification')).toBeEnabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper button accessibility', () => {
      render(<DriverDashboardTest />);

      const runButton = screen.getByRole('button', { name: /run verification/i });
      expect(runButton).toBeInTheDocument();
    });

    it('maintains button state during loading', async () => {
      vi.mocked(driverVerificationService.verifyDriverFunctionality).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockVerificationResult), 100))
      );

      render(<DriverDashboardTest />);

      const runButton = screen.getByRole('button', { name: /run verification/i });
      fireEvent.click(runButton);

      expect(screen.getByRole('button', { name: /running tests/i })).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run verification/i })).toBeEnabled();
      });
    });
  });
});
