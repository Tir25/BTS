import { describe, it, expect } from 'vitest';
import {
  translateError,
  extractErrorMessage,
  getUserFriendlyError,
  translateErrorWithContext,
  ErrorContext,
} from '../../utils/errorMessageTranslator';

describe('Error Message Translator', () => {
  describe('translateError', () => {
    it('translates authentication errors', () => {
      expect(translateError('Invalid login credentials')).toBe(
        'Incorrect email or password. Please check your credentials and try again.'
      );
    });

    it('translates driver-specific errors', () => {
      expect(translateError('NOT_A_DRIVER')).toBe(
        'You do not have driver privileges. Please contact your administrator if you believe this is an error.'
      );
      
      expect(translateError('NO_BUS_ASSIGNMENT')).toBe(
        'You do not have an active bus assignment. Please contact your administrator to get assigned to a bus.'
      );
    });

    it('translates network errors', () => {
      expect(translateError('Network Error')).toBe(
        'Connection problem. Please check your internet connection and try again.'
      );
      
      expect(translateError('fetch failed')).toBe(
        'Connection failed. Please check your internet connection and try again.'
      );
    });

    it('translates timeout errors', () => {
      expect(translateError('timeout')).toBe('Request took too long. Please try again.');
      expect(translateError('Authentication timeout')).toBe('Login timeout. Please try again.');
    });

    it('translates HTTP status codes', () => {
      expect(translateError('401')).toBe('Authentication required. Please log in again.');
      expect(translateError('403')).toBe('You do not have permission for this action.');
      expect(translateError('404')).toBe('The requested information was not found.');
      expect(translateError('500')).toBe('Server error occurred. Please try again later.');
    });

    it('uses pattern matching for partial matches', () => {
      expect(translateError('network connection failed')).toBe(
        'Connection problem. Please check your internet connection and try again.'
      );
      expect(translateError('Request timeout occurred')).toBe('Request took too long. Please try again.');
    });

    it('returns default message when no match found', () => {
      expect(translateError('Unknown error', 'Default error message')).toBe('Default error message');
    });

    it('returns original message when no default provided', () => {
      expect(translateError('Unknown error')).toBe('Unknown error');
    });

    it('handles empty error messages', () => {
      expect(translateError('')).toBe('An unexpected error occurred. Please try again.');
      expect(translateError('', 'Custom default')).toBe('Custom default');
    });
  });

  describe('extractErrorMessage', () => {
    it('extracts message from string', () => {
      expect(extractErrorMessage('Test error')).toBe('Test error');
    });

    it('extracts message from Error object', () => {
      const error = new Error('Test error');
      expect(extractErrorMessage(error)).toBe('Test error');
    });

    it('extracts message from object with message property', () => {
      const error = { message: 'Object error' };
      expect(extractErrorMessage(error)).toBe('Object error');
    });

    it('returns default for unknown types', () => {
      expect(extractErrorMessage(null)).toBe('An unexpected error occurred');
      expect(extractErrorMessage(123)).toBe('An unexpected error occurred');
    });
  });

  describe('getUserFriendlyError', () => {
    it('translates error string', () => {
      expect(getUserFriendlyError('Invalid login credentials')).toBe(
        'Incorrect email or password. Please check your credentials and try again.'
      );
    });

    it('translates Error object', () => {
      const error = new Error('Network Error');
      expect(getUserFriendlyError(error)).toBe(
        'Connection problem. Please check your internet connection and try again.'
      );
    });

    it('uses default message when no translation found', () => {
      expect(getUserFriendlyError('Unknown', 'Default message')).toBe('Default message');
    });
  });

  describe('translateErrorWithContext', () => {
    it('translates with login context', () => {
      const error = 'Invalid login credentials';
      expect(translateErrorWithContext(error, ErrorContext.LOGIN)).toBe(
        'Incorrect email or password. Please check your credentials and try again.'
      );
    });

    it('translates with driver dashboard context', () => {
      expect(translateErrorWithContext('NOT_A_DRIVER', ErrorContext.DRIVER_DASHBOARD)).toBe(
        'You do not have driver privileges. Please contact your administrator.'
      );
      
      expect(translateErrorWithContext('NO_BUS_ASSIGNMENT', ErrorContext.DRIVER_DASHBOARD)).toBe(
        'You are not assigned to a bus. Please contact your administrator.'
      );
    });

    it('translates with location context', () => {
      expect(translateErrorWithContext('Location permission denied', ErrorContext.LOCATION)).toBe(
        'Location permission required. Please enable location access in your browser.'
      );
    });

    it('translates with websocket context', () => {
      expect(translateErrorWithContext('WebSocket connection failed', ErrorContext.WEBSOCKET)).toBe(
        'Real-time updates unavailable. Please refresh the page.'
      );
    });

    it('falls back to general translation when context not found', () => {
      expect(translateErrorWithContext('Generic error', ErrorContext.GENERAL)).toBe(
        'Generic error'
      );
    });

    it('falls back to general translation when context-specific translation not available', () => {
      expect(translateErrorWithContext('Network Error', ErrorContext.DRIVER_DASHBOARD)).toBe(
        'Connection problem. Please check your internet connection and try again.'
      );
    });
  });

  describe('Real-world scenarios', () => {
    it('handles authentication failure', () => {
      const error = new Error('Invalid login credentials');
      expect(getUserFriendlyError(error)).toBe(
        'Incorrect email or password. Please check your credentials and try again.'
      );
    });

    it('handles driver not assigned to bus', () => {
      expect(translateError('NO_BUS_ASSIGNMENT')).toBe(
        'You do not have an active bus assignment. Please contact your administrator to get assigned to a bus.'
      );
    });

    it('handles websocket connection failure', () => {
      expect(translateError('WebSocket connection failed')).toBe(
        'Real-time connection failed. Please refresh the page.'
      );
    });

    it('handles location permission denied', () => {
      expect(translateError('Location permission denied')).toBe(
        'Location permission denied. Please enable location access in your browser settings.'
      );
    });

    it('handles network timeout', () => {
      expect(translateError('Connection timeout')).toBe('Connection timeout. Please try again.');
    });
  });
});
