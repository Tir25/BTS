import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminDashboard from '../components/AdminDashboard'

// Mock the services
vi.mock('../services/authService', () => ({
  authService: {
    isAuthenticated: vi.fn(() => true),
    getCurrentUser: vi.fn(() => ({
      id: '1',
      email: 'admin@example.com',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User',
    })),
    signOut: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('../api', () => ({
  adminApiService: {
    getDashboard: vi.fn(() => Promise.resolve({
      success: true,
      data: {
        totalBuses: 10,
        activeBuses: 8,
        totalRoutes: 5,
        activeRoutes: 4,
        totalDrivers: 12,
        activeDrivers: 10,
        recentActivity: [],
      },
    })),
    getSystemHealth: vi.fn(() => Promise.resolve({
      success: true,
      data: {
        status: 'healthy',
        services: {
          database: { status: 'connected' },
          api: { status: 'running' },
        },
      },
    })),
  },
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('AdminDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    render(
      <TestWrapper>
        <AdminDashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument()
    })
  })

  it('displays dashboard statistics', async () => {
    render(
      <TestWrapper>
        <AdminDashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/total buses/i)).toBeInTheDocument()
      expect(screen.getByText(/active buses/i)).toBeInTheDocument()
      expect(screen.getByText(/total routes/i)).toBeInTheDocument()
    })
  })

  it('shows user information', async () => {
    render(
      <TestWrapper>
        <AdminDashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument()
    })
  })

  it('handles sign out', async () => {
    const { authService } = await import('../services/authService')
    
    render(
      <TestWrapper>
        <AdminDashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      const signOutButton = screen.getByText(/sign out/i)
      expect(signOutButton).toBeInTheDocument()
    })
  })

  it('displays loading state', () => {
    render(
      <TestWrapper>
        <AdminDashboard />
      </TestWrapper>
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
