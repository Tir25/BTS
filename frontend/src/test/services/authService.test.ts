import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../services/authService'

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with no user', () => {
    expect(authService.isAuthenticated()).toBe(false)
    expect(authService.getCurrentUser()).toBeNull()
  })

  it('should handle sign in', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
      },
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    })

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const result = await authService.signIn('test@example.com', 'password')
    
    expect(result.success).toBe(true)
    expect(authService.isAuthenticated()).toBe(true)
  })

  it('should handle sign out', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    await authService.signOut()
    
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('should validate driver session', async () => {
    const mockAssignment = {
      id: '1',
      driver_id: '1',
      bus_id: '1',
      route_id: '1',
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockAssignment,
            error: null,
          }),
        })),
      })),
    })

    const result = await authService.validateDriverSession()
    
    expect(result.isValid).toBe(true)
    expect(result.assignment).toEqual(mockAssignment)
  })
})
