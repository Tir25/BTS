/**
 * Safe JSON parsing utilities
 * Prevents "JSON.parse: unexpected character" errors
 */

import { logger } from './logger';

export interface SafeParseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Safely parse JSON with comprehensive error handling
 */
export function safeJsonParse<T = any>(
  jsonString: string, 
  fallback?: T,
  context?: string
): SafeParseResult<T> {
  try {
    // Check if input is valid
    if (!jsonString || typeof jsonString !== 'string') {
      return {
        success: false,
        error: 'Invalid input: not a string or empty',
        data: fallback
      };
    }

    // Trim whitespace
    const trimmed = jsonString.trim();
    if (!trimmed) {
      return {
        success: false,
        error: 'Empty string after trimming',
        data: fallback
      };
    }

    // Check for common non-JSON patterns
    if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE')) {
      return {
        success: false,
        error: 'Input appears to be HTML, not JSON',
        data: fallback
      };
    }

    if (trimmed.startsWith('<?xml')) {
      return {
        success: false,
        error: 'Input appears to be XML, not JSON',
        data: fallback
      };
    }

    // Attempt to parse
    const parsed = JSON.parse(trimmed);
    return {
      success: true,
      data: parsed
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    
    logger.error('JSON parsing failed', 'json-utils', {
      error: errorMessage,
      context,
      inputLength: jsonString.length,
      inputPreview: jsonString.substring(0, 100)
    });

    return {
      success: false,
      error: errorMessage,
      data: fallback
    };
  }
}

/**
 * Parse JSON with automatic fallback
 */
export function parseJsonWithFallback<T = any>(
  jsonString: string,
  fallback: T,
  context?: string
): T {
  const result = safeJsonParse<T>(jsonString, fallback, context);
  return result.data ?? fallback;
}

/**
 * Parse JSON from response with content-type checking
 */
export async function parseJsonResponse<T = any>(
  response: Response,
  fallback?: T,
  context?: string
): Promise<SafeParseResult<T>> {
  try {
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      
      // Enhanced error reporting for HTML responses
      let errorMessage = `Expected JSON but received ${contentType || 'unknown content type'}`;
      
      if (contentType?.includes('text/html')) {
        // Check if it's a 404 or error page
        if (text.includes('404') || text.includes('Not Found')) {
          errorMessage += ' (404 Not Found - check if API endpoint exists)';
        } else if (text.includes('500') || text.includes('Internal Server Error')) {
          errorMessage += ' (500 Internal Server Error - check server logs)';
        } else if (text.includes('403') || text.includes('Forbidden')) {
          errorMessage += ' (403 Forbidden - check authentication)';
        } else {
          errorMessage += ' (HTML error page received)';
        }
        
        // Log the HTML content for debugging (first 200 chars)
        logger.error('HTML response received instead of JSON', 'json-utils', {
          context,
          status: response.status,
          statusText: response.statusText,
          contentType,
          url: response.url,
          htmlPreview: text.substring(0, 200)
        });
      }
      
      return {
        success: false,
        error: errorMessage,
        data: fallback
      };
    }

    const text = await response.text();
    return safeJsonParse<T>(text, fallback, context);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      data: fallback
    };
  }
}

/**
 * Validate JSON string without parsing
 */
export function isValidJson(jsonString: string): boolean {
  if (!jsonString || typeof jsonString !== 'string') {
    return false;
  }

  const trimmed = jsonString.trim();
  if (!trimmed) {
    return false;
  }

  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}
