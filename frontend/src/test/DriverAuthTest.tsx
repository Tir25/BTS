import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DriverAuthProvider } from '../contexts/DriverAuthContext';
import DriverLogin from '../components/DriverLogin';

// Mock the logger to avoid console output during tests
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Supabase
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  },
}));

// Mock WebSocket service
jest.mock('../services/UnifiedWebSocketService', () => ({
  unifiedWebSocketService: {
    setClientType: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    authenticateAsDriver: jest.fn(),
  },
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <DriverAuthProvider>
      {children}
    </DriverAuthProvider>
  </BrowserRouter>
);

describe('Driver Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders driver login form', () => {
    render(
      <TestWrapper>
        <DriverLogin />
      </TestWrapper>
    );

    expect(screen.getByText('Driver Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('handles form input changes', () => {
    render(
      <TestWrapper>
        <DriverLogin />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'driver@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('driver@test.com');
    expect(passwordInput).toHaveValue('password123');
  });

  test('shows loading state during login', async () => {
    const { supabase } = await import('../config/supabase');
    const mockSignIn = supabase.auth.signInWithPassword;
    mockSignIn.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <TestWrapper>
        <DriverLogin />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'driver@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
  });

  test('displays error message on login failure', async () => {
    const { supabase } = await import('../config/supabase');
    const mockSignIn = supabase.auth.signInWithPassword;
    mockSignIn.mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    });

    render(
      <TestWrapper>
        <DriverLogin />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'driver@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  test('successful login flow', async () => {
    const { supabase } = await import('../config/supabase');
    const mockSignIn = supabase.auth.signInWithPassword;
    const mockGetSession = supabase.auth.getSession;
    const mockFrom = supabase.from;

    // Mock successful authentication
    mockSignIn.mockResolvedValue({
      data: {
        user: { id: 'driver-123', email: 'driver@test.com' },
        session: { access_token: 'token-123' },
      },
      error: null,
    });

    // Mock session check
    mockGetSession.mockResolvedValue({
      data: {
        session: { user: { id: 'driver-123', email: 'driver@test.com' } },
      },
    });

    // Mock profile query
    const mockSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'driver-123',
            full_name: 'Test Driver',
            role: 'driver',
            is_active: true,
          },
          error: null,
        }),
      })),
    }));

    mockFrom.mockReturnValue({
      select: mockSelect,
    });

    // Mock bus assignment query
    const mockAssignmentSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'assignment-123',
            driver_id: 'driver-123',
            bus_id: 'bus-123',
            bus_number: 'BUS-001',
            route_id: 'route-123',
            route_name: 'Route A',
            driver_name: 'Test Driver',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          error: null,
        }),
      })),
    }));

    mockFrom.mockReturnValueOnce({
      select: mockSelect,
    }).mockReturnValueOnce({
      select: mockAssignmentSelect,
    });

    render(
      <TestWrapper>
        <DriverLogin />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'driver@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'driver@test.com',
        password: 'password123',
      });
    });
  });
});

describe('Driver Authentication Context', () => {
  test('provides authentication state', () => {
    const TestComponent = () => {
      const { isAuthenticated, isLoading, error } = useDriverAuth();
      return (
        <div>
          <div data-testid="isAuthenticated">{isAuthenticated.toString()}</div>
          <div data-testid="isLoading">{isLoading.toString()}</div>
          <div data-testid="error">{error || 'no-error'}</div>
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('isLoading')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });
});

// Helper function to use the driver auth context in tests
const useDriverAuth = () => {
  const { DriverAuthContext } = await import('../contexts/DriverAuthContext');
  const context = React.useContext(DriverAuthContext);
  if (context === undefined) {
    throw new Error('useDriverAuth must be used within a DriverAuthProvider');
  }
  return context;
};
