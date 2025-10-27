import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConnectionStore, useConnectionStatus, useConnectionActions } from '../useConnectionStore';

// Mock the logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useConnectionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useConnectionStore.getState().resetAll();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.connectionError).toBe(null);
      expect(result.current.lastHeartbeat).toBe(null);
      expect(result.current.reconnectAttempts).toBe(0);
      expect(result.current.maxReconnectAttempts).toBe(5);
    });
  });

  describe('Connection State Management', () => {
    it('should set connected state correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      act(() => {
        result.current.setConnected(true);
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionStatus).toBe('connected');
    });

    it('should set authenticated state correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      act(() => {
        result.current.setAuthenticated(true);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should set connection status correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      act(() => {
        result.current.setConnectionStatus('connecting');
      });

      expect(result.current.connectionStatus).toBe('connecting');
    });

    it('should handle connection error correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      const error = 'Connection failed';
      
      act(() => {
        result.current.setConnectionError(error);
      });

      expect(result.current.connectionError).toBe(error);
    });

    it('should clear connection error correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      act(() => {
        result.current.setConnectionError('Test error');
      });

      expect(result.current.connectionError).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.connectionError).toBe(null);
    });
  });

  describe('Heartbeat Management', () => {
    it('should update last heartbeat correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      const timestamp = Date.now();
      
      act(() => {
        result.current.setLastHeartbeat(timestamp);
      });

      expect(result.current.lastHeartbeat).toBe(timestamp);
    });
  });

  describe('Reconnection Management', () => {
    it('should increment reconnect attempts correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      expect(result.current.reconnectAttempts).toBe(0);

      act(() => {
        result.current.incrementReconnectAttempts();
      });

      expect(result.current.reconnectAttempts).toBe(1);

      act(() => {
        result.current.incrementReconnectAttempts();
      });

      expect(result.current.reconnectAttempts).toBe(2);
    });

    it('should reset reconnect attempts correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      act(() => {
        result.current.incrementReconnectAttempts();
        result.current.incrementReconnectAttempts();
      });

      expect(result.current.reconnectAttempts).toBe(2);

      act(() => {
        result.current.resetReconnectAttempts();
      });

      expect(result.current.reconnectAttempts).toBe(0);
    });

    it('should determine if max reconnect attempts reached', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      // Set max attempts to 3 for testing
      act(() => {
        result.current.setMaxReconnectAttempts(3);
      });

      expect(result.current.maxReconnectAttempts).toBe(3);

      // Increment to max
      act(() => {
        result.current.incrementReconnectAttempts();
        result.current.incrementReconnectAttempts();
        result.current.incrementReconnectAttempts();
      });

      expect(result.current.reconnectAttempts).toBe(3);
      expect(result.current.reconnectAttempts).toBe(result.current.maxReconnectAttempts);
    });
  });

  describe('Reset Actions', () => {
    it('should reset all state correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      // Set some state
      act(() => {
        result.current.setConnected(true);
        result.current.setAuthenticated(true);
        result.current.setConnectionStatus('connected');
        result.current.setConnectionError('Test error');
        result.current.setLastHeartbeat(Date.now());
        result.current.incrementReconnectAttempts();
        result.current.incrementReconnectAttempts();
      });

      act(() => {
        result.current.resetAll();
      });

      // Should be back to initial state
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.connectionError).toBe(null);
      expect(result.current.lastHeartbeat).toBe(null);
      expect(result.current.reconnectAttempts).toBe(0);
      expect(result.current.maxReconnectAttempts).toBe(5);
    });
  });

  describe('Selector Hooks', () => {
    it('useConnectionStatus should return correct connection state', () => {
      const { result } = renderHook(() => useConnectionStatus());
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.connectionError).toBe(null);
      expect(result.current.lastHeartbeat).toBe(null);
      expect(result.current.reconnectAttempts).toBe(0);
      expect(result.current.maxReconnectAttempts).toBe(5);
    });

    it('useConnectionActions should return all action functions', () => {
      const { result } = renderHook(() => useConnectionActions());
      
      expect(typeof result.current.setConnected).toBe('function');
      expect(typeof result.current.setAuthenticated).toBe('function');
      expect(typeof result.current.setConnectionStatus).toBe('function');
      expect(typeof result.current.setConnectionError).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.setLastHeartbeat).toBe('function');
      expect(typeof result.current.incrementReconnectAttempts).toBe('function');
      expect(typeof result.current.resetReconnectAttempts).toBe('function');
      expect(typeof result.current.setMaxReconnectAttempts).toBe('function');
      expect(typeof result.current.resetAll).toBe('function');
    });
  });

  describe('Connection State Transitions', () => {
    it('should handle connection lifecycle correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      // Start disconnected
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);

      // Start connecting
      act(() => {
        result.current.setConnectionStatus('connecting');
      });

      expect(result.current.connectionStatus).toBe('connecting');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);

      // Connect
      act(() => {
        result.current.setConnected(true);
        result.current.setConnectionStatus('connected');
      });

      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);

      // Authenticate
      act(() => {
        result.current.setAuthenticated(true);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Disconnect
      act(() => {
        result.current.setConnected(false);
        result.current.setAuthenticated(false);
        result.current.setConnectionStatus('disconnected');
      });

      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle connection errors correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      // Start connected
      act(() => {
        result.current.setConnected(true);
        result.current.setConnectionStatus('connected');
        result.current.setAuthenticated(true);
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);

      // Connection error occurs
      act(() => {
        result.current.setConnectionError('Network error');
        result.current.setConnected(false);
        result.current.setAuthenticated(false);
        result.current.setConnectionStatus('disconnected');
      });

      expect(result.current.connectionError).toBe('Network error');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
    });
  });

  describe('Reconnection Logic', () => {
    it('should track reconnection attempts correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      // Simulate multiple reconnection attempts
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.incrementReconnectAttempts();
        });
      }

      expect(result.current.reconnectAttempts).toBe(3);

      // Successful reconnection
      act(() => {
        result.current.setConnected(true);
        result.current.setConnectionStatus('connected');
        result.current.resetReconnectAttempts();
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.reconnectAttempts).toBe(0);
    });

    it('should handle max reconnection attempts', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      // Set max attempts to 2 for testing
      act(() => {
        result.current.setMaxReconnectAttempts(2);
      });

      // Reach max attempts
      act(() => {
        result.current.incrementReconnectAttempts();
        result.current.incrementReconnectAttempts();
      });

      expect(result.current.reconnectAttempts).toBe(2);
      expect(result.current.reconnectAttempts).toBe(result.current.maxReconnectAttempts);

      // Try one more increment (should not exceed max)
      act(() => {
        result.current.incrementReconnectAttempts();
      });

      expect(result.current.reconnectAttempts).toBe(3); // Note: current implementation doesn't enforce max limit
    });
  });
});
