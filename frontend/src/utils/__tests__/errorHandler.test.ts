import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errorHandler, logError, getErrorStats } from '../errorHandler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    // Clear error log before each test
    errorHandler.clearLog();
    vi.clearAllMocks();
  });

  describe('logError', () => {
    it('should log an Error object correctly', () => {
      const error = new Error('Test error message');
      const context = { service: 'api' as const, operation: 'test' };

      const result = logError(error, context, 'medium');

      expect(result.message).toBe('Test error message');
      expect(result.context.service).toBe('api');
      expect(result.context.operation).toBe('test');
      expect(result.severity).toBe('medium');
      expect(result.retryable).toBe(false);
    });

    it('should log a string error correctly', () => {
      const error = 'String error message';
      const context = { service: 'websocket' as const, operation: 'connect' };

      const result = logError(error, context, 'high');

      expect(result.message).toBe('String error message');
      expect(result.context.service).toBe('websocket');
      expect(result.severity).toBe('high');
    });

    it('should log an Event error correctly', () => {
      const event = new Event('connection_error');
      const context = { service: 'sse' as const, operation: 'stream' };

      const result = logError(event, context, 'low');

      expect(result.message).toBe('Event error: connection_error');
      expect(result.context.service).toBe('sse');
      expect(result.severity).toBe('low');
    });

    it('should handle unknown error types', () => {
      const error = { custom: 'error' };
      const context = { service: 'ui' as const, operation: 'render' };

      const result = logError(error, context, 'critical');

      expect(result.message).toBe('Unknown error');
      expect(result.severity).toBe('critical');
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const error = new Error('Network connection failed');
      const context = { service: 'api' as const, operation: 'fetch' };

      const result = logError(error, context, 'medium');

      expect(result.retryable).toBe(true);
    });

    it('should identify timeout errors as retryable', () => {
      const error = new Error('Request timeout');
      const context = { service: 'websocket' as const, operation: 'connect' };

      const result = logError(error, context, 'medium');

      expect(result.retryable).toBe(true);
    });

    it('should identify non-network errors as not retryable', () => {
      const error = new Error('Invalid input data');
      const context = { service: 'api' as const, operation: 'validate' };

      const result = logError(error, context, 'medium');

      expect(result.retryable).toBe(false);
    });
  });

  describe('getSuggestions', () => {
    it('should provide CORS suggestions for CORS errors', () => {
      const error = new Error('CORS policy violation');
      const context = { service: 'api' as const, operation: 'fetch' };

      const result = logError(error, context, 'medium');

      expect(result.suggestions).toContain(
        'Check CORS configuration on the server'
      );
      expect(result.suggestions).toContain(
        'Verify the API endpoint is accessible'
      );
    });

    it('should provide timeout suggestions for timeout errors', () => {
      const error = new Error('Request timeout');
      const context = { service: 'api' as const, operation: 'fetch' };

      const result = logError(error, context, 'medium');

      expect(result.suggestions).toContain(
        'Increase connection timeout settings'
      );
      expect(result.suggestions).toContain('Check network connectivity');
    });

    it('should provide default suggestions for unknown errors', () => {
      const error = new Error('Unknown error type');
      const context = { service: 'ui' as const, operation: 'render' };

      const result = logError(error, context, 'medium');

      expect(result.suggestions).toContain('Check network connectivity');
      expect(result.suggestions).toContain('Verify server is running');
    });
  });

  describe('getErrorStats', () => {
    it('should return correct error statistics', () => {
      // Log multiple errors
      logError(
        new Error('Error 1'),
        { service: 'api', operation: 'op1' },
        'low'
      );
      logError(
        new Error('Error 2'),
        { service: 'api', operation: 'op2' },
        'medium'
      );
      logError(
        new Error('Error 3'),
        { service: 'websocket', operation: 'op3' },
        'high'
      );

      const stats = getErrorStats();

      expect(stats.total).toBe(3);
      expect(stats.byService.api).toBe(2);
      expect(stats.byService.websocket).toBe(1);
      expect(stats.bySeverity.low).toBe(1);
      expect(stats.bySeverity.medium).toBe(1);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.recentErrors).toHaveLength(3);
    });
  });

  describe('log size management', () => {
    it('should limit log size to maxLogSize', () => {
      // Set maxLogSize to 3 for testing
      errorHandler.setMaxLogSize(3);

      // Log 5 errors
      for (let i = 0; i < 5; i++) {
        logError(new Error(`Error ${i}`), {
          service: 'api',
          operation: `op${i}`,
        });
      }

      const stats = getErrorStats();
      expect(stats.total).toBe(3); // Should only keep last 3
      expect(stats.recentErrors[0].message).toBe('Error 2'); // Oldest remaining
      expect(stats.recentErrors[2].message).toBe('Error 4'); // Newest
    });
  });
});
