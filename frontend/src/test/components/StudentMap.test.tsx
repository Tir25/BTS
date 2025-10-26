import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StudentMap from '../components/StudentMap'

// Mock the services
vi.mock('../services/authService', () => ({
  authService: {
    isAuthenticated: vi.fn(() => true),
    getCurrentUser: vi.fn(() => ({
      id: '1',
      email: 'student@example.com',
      role: 'student',
    })),
  },
}))

vi.mock('../services/UnifiedWebSocketService', () => ({
  unifiedWebSocketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: true,
    on: vi.fn(),
    off: vi.fn(),
  },
}))

vi.mock('../services/busService', () => ({
  busService: {
    getBuses: vi.fn(() => Promise.resolve({
      success: true,
      data: [
        {
          id: '1',
          bus_number: 'BUS001',
          route_name: 'Route 1',
          driver_name: 'Driver 1',
          current_location: {
            latitude: 23.0225,
            longitude: 72.5714,
          },
        },
      ],
    })),
  },
}))

// Mock Leaflet
vi.mock('leaflet', () => ({
  map: vi.fn(() => ({
    setView: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    invalidateSize: vi.fn(),
  })),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn(),
  })),
  marker: vi.fn(() => ({
    addTo: vi.fn(),
    bindPopup: vi.fn(),
    setLatLng: vi.fn(),
  })),
  icon: vi.fn(),
  divIcon: vi.fn(),
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

describe('StudentMap Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    render(
      <TestWrapper>
        <StudentMap />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  it('displays loading state initially', () => {
    render(
      <TestWrapper>
        <StudentMap />
      </TestWrapper>
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('handles authentication state', async () => {
    const { authService } = await import('../services/authService')
    
    render(
      <TestWrapper>
        <StudentMap />
      </TestWrapper>
    )

    expect(authService.isAuthenticated).toHaveBeenCalled()
  })
})
