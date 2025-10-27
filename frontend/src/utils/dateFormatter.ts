/**
 * Date Formatting Utilities
 * Provides safe, production-grade date formatting with validation
 */

/**
 * Validates if a value can be converted to a valid Date
 * Implements comprehensive validation as per best practices
 */
export const isValidDate = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  // Handle empty strings
  if (typeof value === 'string' && value.trim() === '') {
    return false;
  }

  // Handle invalid types
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
    return false;
  }

  // Handle Date objects
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }

  // Handle string, number - try parsing
  const date = new Date(value as any);
  const isValid = !isNaN(date.getTime());
  
  // Additional validation: check if date is within reasonable range
  if (isValid) {
    const year = date.getFullYear();
    // Reject dates before 1970 or after 2100 (reasonable bounds)
    if (year < 1970 || year > 2100) {
      return false;
    }
  }
  
  return isValid;
};

/**
 * Safely converts a value to a Date object
 * Returns null if the value cannot be converted to a valid date
 */
export const safeParseDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle different input types
  let date: Date;
  
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    // Check if it's a valid timestamp (must be a reasonable range)
    // Unix timestamps in seconds should be converted to milliseconds
    let timestamp = value;
    
    // If timestamp is less than 1e12, assume it's in seconds and convert to milliseconds
    if (timestamp < 1e12 && timestamp > 0) {
      timestamp = timestamp * 1000;
    }
    
    date = new Date(timestamp);
  } else if (typeof value === 'string') {
    // Try parsing as ISO string first
    date = new Date(value);
    
    // If that fails, try parsing as number
    if (isNaN(date.getTime())) {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        let timestamp = numValue;
        if (timestamp < 1e12 && timestamp > 0) {
          timestamp = timestamp * 1000;
        }
        date = new Date(timestamp);
      }
    }
  } else {
    return null;
  }

  // Validate the resulting date
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/**
 * Formats a date as a time string (HH:MM:SS)
 * Returns fallback if date is invalid
 */
export const formatTime = (
  value: unknown,
  options?: Intl.DateTimeFormatOptions,
  fallback: string = '--:--:--'
): string => {
  const date = safeParseDate(value);
  if (!date) {
    return fallback;
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  try {
    return date.toLocaleTimeString(undefined, { ...defaultOptions, ...options });
  } catch (error) {
    return fallback;
  }
};

/**
 * Formats a date as a date string (MM/DD/YYYY)
 * Returns fallback if date is invalid
 */
export const formatDate = (
  value: unknown,
  options?: Intl.DateTimeFormatOptions,
  fallback: string = '--/--/----'
): string => {
  const date = safeParseDate(value);
  if (!date) {
    return fallback;
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  try {
    return date.toLocaleDateString(undefined, { ...defaultOptions, ...options });
  } catch (error) {
    return fallback;
  }
};

/**
 * Formats a date as a combined date and time string
 * Returns fallback if date is invalid
 */
export const formatDateTime = (
  value: unknown,
  options?: Intl.DateTimeFormatOptions,
  fallback: string = '--/--/---- --:--:--'
): string => {
  const date = safeParseDate(value);
  if (!date) {
    return fallback;
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  try {
    return date.toLocaleString(undefined, { ...defaultOptions, ...options });
  } catch (error) {
    return fallback;
  }
};

/**
 * Formats a date as a relative time string (e.g., "2 minutes ago")
 * Returns fallback if date is invalid
 */
export const formatRelativeTime = (
  value: unknown,
  fallback: string = 'Unknown time'
): string => {
  const date = safeParseDate(value);
  if (!date) {
    return fallback;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 10) {
    return 'Just now';
  } else if (diffSeconds < 60) {
    return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatDate(value);
  }
};

/**
 * Formats a timestamp for display in driver dashboard
 * Handles various timestamp formats and provides consistent output
 */
export const formatDriverTimestamp = (
  timestamp: unknown,
  showDate: boolean = false
): string => {
  const date = safeParseDate(timestamp);
  if (!date) {
    return showDate ? 'No date available' : '--:--:--';
  }

  try {
    if (showDate) {
      return formatDateTime(timestamp, {
        hour: '2-digit',
        minute: '2-digit',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } else {
      return formatTime(timestamp);
    }
  } catch (error) {
    return showDate ? 'Invalid date' : '--:--:--';
  }
};

/**
 * Formats a timestamp for last update display
 * Shows time and relative time
 */
export const formatLastUpdate = (timestamp: unknown): { time: string; relative: string } => {
  const date = safeParseDate(timestamp);
  
  if (!date) {
    return {
      time: '--:--:--',
      relative: 'No updates yet',
    };
  }

  return {
    time: formatTime(timestamp),
    relative: formatRelativeTime(timestamp),
  };
};

