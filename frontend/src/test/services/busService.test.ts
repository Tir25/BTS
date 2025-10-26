import { describe, it, expect, vi, beforeEach } from 'vitest'
import { busService } from '../services/busService'

// Mock fetch
global.fetch = vi.fn()

describe('BusService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch buses successfully', async () => {
    const mockBuses = [
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
    ]

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockBuses,
      }),
    })

    const result = await busService.getBuses()
    
    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockBuses)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/buses'),
      expect.any(Object)
    )
  })

  it('should handle API errors', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({
        success: false,
        error: 'Internal server error',
      }),
    })

    const result = await busService.getBuses()
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Internal server error')
  })

  it('should fetch single bus', async () => {
    const mockBus = {
      id: '1',
      bus_number: 'BUS001',
      route_name: 'Route 1',
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockBus,
      }),
    })

    const result = await busService.getBus('1')
    
    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockBus)
  })

  it('should create bus', async () => {
    const busData = {
      bus_number: 'BUS002',
      route_id: '1',
      capacity: 50,
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { id: '2', ...busData },
      }),
    })

    const result = await busService.createBus(busData)
    
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: '2', ...busData })
  })

  it('should update bus', async () => {
    const updateData = {
      capacity: 60,
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { id: '1', ...updateData },
      }),
    })

    const result = await busService.updateBus('1', updateData)
    
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: '1', ...updateData })
  })

  it('should delete bus', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
      }),
    })

    const result = await busService.deleteBus('1')
    
    expect(result.success).toBe(true)
  })
})
