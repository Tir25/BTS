import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeDatabase,
  testDatabaseConnection,
  getDatabaseHealth,
} from '../database';

// Mock the database pool
vi.mock('../database', async () => {
  const actual = await vi.importActual('../database');
  return {
    ...actual,
    pool: {
      query: vi.fn(),
      connect: vi.fn(),
      end: vi.fn(),
    },
    checkDatabaseHealth: vi.fn(),
  };
});

describe('Database Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeDatabase', () => {
    it('should initialize database schema successfully', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };

      // Mock the pool import
      vi.doMock('../database', () => ({
        pool: mockPool,
        checkDatabaseHealth: vi.fn().mockResolvedValue({ healthy: true }),
      }));

      await expect(initializeDatabase()).resolves.not.toThrow();
    });

    it('should handle PostGIS extension errors gracefully', async () => {
      const mockPool = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // checkDatabaseHealth
          .mockRejectedValueOnce(new Error('PostGIS not available')) // PostGIS extension
          .mockResolvedValue({ rows: [] }), // Index creation
      };

      vi.doMock('../database', () => ({
        pool: mockPool,
        checkDatabaseHealth: vi.fn().mockResolvedValue({ healthy: true }),
      }));

      await expect(initializeDatabase()).resolves.not.toThrow();
    });

    it('should handle index creation errors gracefully', async () => {
      const mockPool = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // checkDatabaseHealth
          .mockResolvedValueOnce({ rows: [] }) // PostGIS extension
          .mockRejectedValueOnce(new Error('Index creation failed')) // Index creation
          .mockResolvedValue({ rows: [] }), // Remaining operations
      };

      vi.doMock('../database', () => ({
        pool: mockPool,
        checkDatabaseHealth: vi.fn().mockResolvedValue({ healthy: true }),
      }));

      await expect(initializeDatabase()).resolves.not.toThrow();
    });
  });

  describe('testDatabaseConnection', () => {
    it('should test database connection successfully', async () => {
      const mockCheckDatabaseHealth = vi.fn().mockResolvedValue({
        healthy: true,
        details: { status: 'connected' },
      });

      vi.doMock('../database', () => ({
        checkDatabaseHealth: mockCheckDatabaseHealth,
      }));

      await expect(testDatabaseConnection()).resolves.not.toThrow();
      expect(mockCheckDatabaseHealth).toHaveBeenCalled();
    });

    it('should throw error when database health check fails', async () => {
      const mockCheckDatabaseHealth = vi.fn().mockResolvedValue({
        healthy: false,
        error: 'Connection failed',
      });

      vi.doMock('../database', () => ({
        checkDatabaseHealth: mockCheckDatabaseHealth,
      }));

      await expect(testDatabaseConnection()).rejects.toThrow(
        'Connection failed'
      );
    });
  });

  describe('getDatabaseHealth', () => {
    it('should return database health status', async () => {
      const mockHealth = {
        healthy: true,
        details: { status: 'connected' },
      };

      const mockCheckDatabaseHealth = vi.fn().mockResolvedValue(mockHealth);

      vi.doMock('../database', () => ({
        checkDatabaseHealth: mockCheckDatabaseHealth,
      }));

      const result = await getDatabaseHealth();
      expect(result).toEqual(mockHealth);
    });
  });
});
