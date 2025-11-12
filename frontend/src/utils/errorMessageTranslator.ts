/**
 * Error Message Translator
 * Converts technical error messages into user-friendly messages
 */

// Error message mapping for different error types
const ERROR_MESSAGES = {
  // Authentication errors
  'Invalid login credentials': 'Incorrect email or password. Please check your credentials and try again.',
  'Invalid email or password': 'Invalid email or password. Please check your credentials and try again.',
  'Invalid credentials': 'Invalid email or password. Please check your credentials and try again.',
  'Authentication failed': 'Authentication failed. Please log in again.',
  'Please log in again': 'Your session has expired. Please log in again.',
  'No access token available': 'Authentication required. Please log in again.',
  
  // Driver-specific errors
  'NOT_A_DRIVER': 'You do not have driver privileges. Please contact your administrator if you believe this is an error.',
  'NO_BUS_ASSIGNMENT': 'You do not have an active bus assignment. Please contact your administrator to get assigned to a bus.',
  'You do not have driver privileges': 'You do not have driver privileges. Please contact your administrator if you believe this is an error.',
  'You do not have an active bus assignment': 'You do not have an active bus assignment. Please contact your administrator to get assigned to a bus.',
  
  // Network errors
  'Network Error': 'Connection problem. Please check your internet connection and try again.',
  'Network connection failed': 'Connection problem. Please check your internet connection and try again.',
  'Failed to connect to server': 'Unable to reach the server. Please check your internet connection.',
  'fetch failed': 'Connection failed. Please check your internet connection and try again.',
  
  // Timeout errors
  'timeout': 'Request took too long. Please try again.',
  'Request timeout': 'The request took too long. Please try again.',
  'Connection timeout': 'Connection timeout. Please try again.',
  'Authentication timeout': 'Login timeout. Please try again.',
  'Profile loading timeout': 'Loading your profile took too long. Please try refreshing the page.',
  
  // WebSocket errors
  'WebSocket connection failed': 'Real-time connection failed. Please refresh the page.',
  'WebSocket not connected': 'Real-time connection is not available. Please refresh the page.',
  'WebSocket authentication failed': 'Real-time service authentication failed. Please refresh the page.',
  'Failed to connect to real-time service': 'Unable to connect to real-time service. Please refresh the page.',
  
  // Location errors
  'Location permission denied': 'Location permission denied. Please enable location access in your browser settings.',
  'Location unavailable': 'Location information is not available. Please check your device settings.',
  'Location request timed out': 'Location request timed out. Please try again.',
  'Location access denied': 'Location access denied. Please enable location permissions to track your bus.',
  
  // Validation errors
  'Invalid email': 'Please enter a valid email address.',
  'Password is too short': 'Password is too short. Please enter a longer password.',
  'Required field missing': 'Please fill in all required fields.',
  
  // Server errors
  'Server error': 'Server error occurred. Please try again later.',
  'Internal Server Error': 'Server error occurred. Please try again later.',
  '500': 'Server error occurred. Please try again later.',
  'Service unavailable': 'Service is temporarily unavailable. Please try again later.',
  
  // Not found errors
  'Resource not found': 'The requested information was not found.',
  '404': 'The requested page was not found.',
  
  // Rate limit errors
  'Too many requests': 'Too many requests. Please wait a moment and try again.',
  'Rate limit exceeded': 'Too many requests. Please wait a moment and try again.',
  
  // Generic errors
  'Login failed': 'Login failed. Please check your credentials and try again.',
  'An unexpected error occurred': 'Something went wrong. Please try again.',
  'Request failed': 'Request failed. Please try again.',
  'Failed to initialize': 'Initialization failed. Please refresh the page.',
  'Unknown error occurred': 'Something unexpected happened. Please try again.',
  
  // Driver authentication specific
  'Driver authentication failed': 'Driver authentication failed. Please check your credentials and try again.',
  'Cannot initialize driver dashboard': 'Unable to start the driver dashboard. Please refresh the page.',
  'Invalid driver credentials': 'Invalid driver credentials. Please check your email and password.',
  'Driver not found': 'Driver account not found. Please contact your administrator.',
  
  // Bus assignment errors
  'No bus assignment found': 'No bus assignment found. Please contact your administrator to get assigned to a bus.',
  'Bus assignment error': 'Error loading bus assignment. Please refresh the page or contact support.',
  
  // Session errors
  'Session expired': 'Your session has expired. Please log in again.',
  'Invalid session': 'Your session is invalid. Please log in again.',
  'Session validation failed': 'Session validation failed. Please log in again.',
};

/**
 * Translates a technical error message into a user-friendly message
 * @param errorMessage - The technical error message
 * @param defaultMessage - Optional default message if no match is found
 * @returns User-friendly error message
 */
export function translateError(errorMessage: string, defaultMessage?: string): string {
  if (!errorMessage) {
    return defaultMessage || 'An unexpected error occurred. Please try again.';
  }

  // Check for exact match first
  if (ERROR_MESSAGES[errorMessage as keyof typeof ERROR_MESSAGES]) {
    return ERROR_MESSAGES[errorMessage as keyof typeof ERROR_MESSAGES];
  }

  // Check for partial matches (case-insensitive)
  const lowerErrorMessage = errorMessage.toLowerCase();
  
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (lowerErrorMessage.includes(key.toLowerCase())) {
      return value;
    }
  }

  // Check for common error patterns
  if (lowerErrorMessage.includes('network') || lowerErrorMessage.includes('fetch')) {
    return 'Connection problem. Please check your internet connection and try again.';
  }
  
  if (lowerErrorMessage.includes('timeout')) {
    return 'Request took too long. Please try again.';
  }
  
  if (lowerErrorMessage.includes('401') || lowerErrorMessage.includes('unauthorized')) {
    return 'Authentication required. Please log in again.';
  }
  
  if (lowerErrorMessage.includes('403') || lowerErrorMessage.includes('forbidden')) {
    return 'You do not have permission for this action.';
  }
  
  if (lowerErrorMessage.includes('404') || lowerErrorMessage.includes('not found')) {
    return 'The requested information was not found.';
  }
  
  if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  if (lowerErrorMessage.includes('500') || lowerErrorMessage.includes('internal server error')) {
    return 'Server error occurred. Please try again later.';
  }
  
  if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('service unavailable')) {
    return 'Service is temporarily unavailable. Please try again later.';
  }

  // Return default or original message if no match found
  return defaultMessage || errorMessage;
}

/**
 * Extracts the main error message from an error object
 * @param error - Error object or message
 * @returns The error message string
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'An unexpected error occurred';
}

/**
 * Gets a user-friendly error message from an error
 * @param error - Error object or message
 * @param defaultMessage - Optional default message
 * @returns User-friendly error message
 */
export function getUserFriendlyError(error: unknown, defaultMessage?: string): string {
  const errorMessage = extractErrorMessage(error);
  return translateError(errorMessage, defaultMessage);
}

/**
 * Error message context types for more specific error messages
 */
export enum ErrorContext {
  LOGIN = 'login',
  DRIVER_DASHBOARD = 'driver_dashboard',
  LOCATION = 'location',
  WEBSOCKET = 'websocket',
  BUS_ASSIGNMENT = 'bus_assignment',
  GENERAL = 'general',
}

/**
 * Context-specific error message mappings
 */
const CONTEXT_ERROR_MESSAGES: Record<ErrorContext, Record<string, string>> = {
  [ErrorContext.LOGIN]: {
    'Invalid login credentials': 'Incorrect email or password. Please check your credentials and try again.',
    'Authentication failed': 'Login failed. Please check your email and password.',
    'Network Error': 'Cannot connect to the server. Please check your internet connection.',
  },
  [ErrorContext.DRIVER_DASHBOARD]: {
    'NOT_A_DRIVER': 'You do not have driver privileges. Please contact your administrator.',
    'NO_BUS_ASSIGNMENT': 'You are not assigned to a bus. Please contact your administrator.',
  },
  [ErrorContext.LOCATION]: {
    'Location permission denied': 'Location permission required. Please enable location access in your browser.',
    'Location unavailable': 'Cannot determine your location. Please check your device settings.',
  },
  [ErrorContext.WEBSOCKET]: {
    'WebSocket connection failed': 'Real-time updates unavailable. Please refresh the page.',
  },
  [ErrorContext.BUS_ASSIGNMENT]: {
    'No bus assignment found': 'No bus assigned to you. Please contact your administrator.',
  },
  [ErrorContext.GENERAL]: {},
};

/**
 * Translates error message with context
 * @param error - Error object or message
 * @param context - Error context
 * @param defaultMessage - Optional default message
 * @returns User-friendly error message
 */
export function translateErrorWithContext(
  error: unknown,
  context: ErrorContext = ErrorContext.GENERAL,
  defaultMessage?: string
): string {
  const errorMessage = extractErrorMessage(error);
  
  // Check context-specific messages
  const contextMessages = CONTEXT_ERROR_MESSAGES[context];
  if (contextMessages && contextMessages[errorMessage]) {
    return contextMessages[errorMessage];
  }
  
  // Fallback to general translation
  return translateError(errorMessage, defaultMessage);
}

// Export constants
export { ERROR_MESSAGES, CONTEXT_ERROR_MESSAGES };
