// Mock services for testing
import { vi } from 'vitest';

export const mockAuthService = {
  isAuthenticated: vi.fn(() => true),
  getCurrentUser: vi.fn(() => ({
    id: '1',
    email: 'test@example.com',
    role: 'admin',
    first_name: 'Test',
    last_name: 'User',
  })),
  signIn: vi.fn(() => Promise.resolve({ success: true })),
  signOut: vi.fn(() => Promise.resolve()),
  validateDriverSession: vi.fn(() => Promise.resolve({
    isValid: true,
    assignment: {
      id: '1',
      driver_id: '1',
      bus_id: '1',
      route_id: '1',
    },
  })),
}

export const mockApiService = {
  get: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  post: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  put: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  delete: vi.fn(() => Promise.resolve({ success: true })),
}

export const mockWebSocketService = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  isConnected: true,
}

export const mockBusService = {
  getBuses: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  getBus: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  createBus: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  updateBus: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  deleteBus: vi.fn(() => Promise.resolve({ success: true })),
}

export const mockRouteService = {
  getRoutes: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  getRoute: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  createRoute: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  updateRoute: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  deleteRoute: vi.fn(() => Promise.resolve({ success: true })),
}

export const mockAdminApiService = {
  getDashboard: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  getSystemHealth: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  getBuses: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  getDrivers: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  getRoutes: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  createBus: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  updateBus: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  deleteBus: vi.fn(() => Promise.resolve({ success: true })),
  createDriver: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  updateDriver: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  deleteDriver: vi.fn(() => Promise.resolve({ success: true })),
  createRoute: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  updateRoute: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  deleteRoute: vi.fn(() => Promise.resolve({ success: true })),
}
