// Comprehensive Error Handler for Real-time Services

// Add NetworkInformation type definition
interface NetworkInformation {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

export interface ErrorContext {
  service: 'websocket' | 'supabase' | 'sse' | 'api' | 'ui' | 'map' | 'network';
  operation: string;
  timestamp: string;
  userAgent: string;
  url: string;
  networkInfo?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
}

export interface ErrorReport {
  message: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  suggestions: string[];
}

class ErrorHandler {
  private errorLog: ErrorReport[] = [];
  private maxLogSize = 100;

  // Log an error with context
  logError(
    error: Error | string | Event | unknown,
    context: Partial<ErrorContext>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): ErrorReport {
    // Handle different error types
    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Event) {
      errorMessage = `Event error: ${error.type}`;
    } else {
      errorMessage = 'Unknown error';
    }

    // Add network information if available
    let networkInfo = {};
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (
        navigator as Navigator & { connection?: NetworkInformation }
      ).connection;
      if (conn) {
        networkInfo = {
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
          saveData: conn.saveData,
        };
      }
    }

    const errorReport: ErrorReport = {
      message: errorMessage,
      context: {
        service: context.service || 'api',
        operation: context.operation || 'unknown',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        networkInfo: networkInfo as Record<string, unknown>,
        ...context,
      },
      severity,
      retryable: this.isRetryableError(error),
      suggestions: this.getSuggestions(error),
    };

    this.errorLog.push(errorReport);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console with appropriate level (suppress verbose logs in production for low severity)
    if (import.meta && (import.meta as any).env && (import.meta as any).env.PROD) {
      if (severity === 'low') {
        // Store internally but avoid noisy console output in production
        return errorReport;
      }
    }
    this.logToConsole(errorReport);

    return errorReport;
  }

  // Check if an error is retryable
  private isRetryableError(error: Error | string | Event | unknown): boolean {
    let message: string;

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error instanceof Event) {
      message = error.type;
    } else {
      message = 'Unknown error';
    }

    // Define retryable error patterns
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /temporary/i,
      /rate.?limit/i,
      /server.?error/i,
      /gateway/i,
      /service.?unavailable/i,
    ];

    return retryablePatterns.some(pattern => pattern.test(message));
  }

  // Get suggestions for fixing the error
  private getSuggestions(error: Error | string | Event | unknown): string[] {
    let message: string;

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error instanceof Event) {
      message = error.type;
    } else {
      message = 'Unknown error';
    }

    const suggestions: string[] = [];

    if (message.includes('CORS')) {
      suggestions.push('Check CORS configuration on the server');
      suggestions.push('Verify the API endpoint is accessible');
    }

    if (message.includes('timeout')) {
      suggestions.push('Increase connection timeout settings');
      suggestions.push('Check network connectivity');
    }

    if (message.includes('websocket')) {
      suggestions.push('Verify WebSocket server is running');
      suggestions.push('Check WebSocket URL configuration');
    }

    if (message.includes('sse')) {
      suggestions.push('Verify SSE endpoint is implemented on server');
      suggestions.push('Check SSE URL configuration');
    }

    if (message.includes('supabase')) {
      suggestions.push('Verify Supabase configuration');
      suggestions.push('Check Supabase service status');
    }

    if (suggestions.length === 0) {
      suggestions.push('Check network connectivity');
      suggestions.push('Verify server is running');
      suggestions.push('Check browser console for more details');
    }

    return suggestions;
  }

  // Log to console with appropriate styling
  private logToConsole(errorReport: ErrorReport): void {
    const { message, context, severity, retryable, suggestions } = errorReport;

    const severityColors = {
      low: 'color: #6b7280',
      medium: 'color: #f59e0b',
      high: 'color: #ef4444',
      critical: 'color: #dc2626; font-weight: bold',
    };

    const color = severityColors[severity];
    const retryableText = retryable ? '🔄 Retryable' : '❌ Not Retryable';

    console.group(
      `%c${severity.toUpperCase()} ERROR - ${context.service.toUpperCase()}`,
      color
    );
    console.error(`Message: ${message}`);
    console.error(`Service: ${context.service}`);
    console.error(`Operation: ${context.operation}`);
    console.error(`Status: ${retryableText}`);
    console.error(`Timestamp: ${context.timestamp}`);

    if (suggestions.length > 0) {
      console.warn('Suggestions:');
      suggestions.forEach(suggestion => console.warn(`  • ${suggestion}`));
    }

    console.groupEnd();
  }

  // Get error statistics
  getErrorStats(): {
    total: number;
    byService: Record<string, number>;
    bySeverity: Record<string, number>;
    recentErrors: ErrorReport[];
  } {
    const byService: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.errorLog.forEach(error => {
      byService[error.context.service] =
        (byService[error.context.service] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    return {
      total: this.errorLog.length,
      byService,
      bySeverity,
      recentErrors: [...this.errorLog].reverse().slice(0, 10),
    };
  }

  // Get errors by service
  getErrorsByService(service: string): ErrorReport[] {
    return this.errorLog.filter(error => error.context.service === service);
  }

  // Get errors by severity
  getErrorsBySeverity(severity: string): ErrorReport[] {
    return this.errorLog.filter(error => error.severity === severity);
  }

  // Get critical errors
  getCriticalErrors(): ErrorReport[] {
    return this.errorLog.filter(error => error.severity === 'critical');
  }

  // Get retryable errors
  getRetryableErrors(): ErrorReport[] {
    return this.errorLog.filter(error => error.retryable);
  }

  // Clear error log
  clearLog(): void {
    this.errorLog = [];
  }

  // Export error log for debugging
  exportLog(): ErrorReport[] {
    return [...this.errorLog];
  }

  // Get all errors (for testing/debugging)
  getAllErrors(): ErrorReport[] {
    return [...this.errorLog];
  }

  // Public method to set max log size (for testing)
  setMaxLogSize(size: number): void {
    this.maxLogSize = size;
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Export utility functions
export const logError = (
  error: Error | string | Event | unknown,
  context: Partial<ErrorContext>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): ErrorReport => {
  return errorHandler.logError(error, context, severity);
};

export const getErrorStats = () => errorHandler.getErrorStats();
export const getErrorsByService = (service: string) =>
  errorHandler.getErrorsByService(service);
export const getErrorsBySeverity = (severity: string) =>
  errorHandler.getErrorsBySeverity(severity);
export const getCriticalErrors = () => errorHandler.getCriticalErrors();
export const getRetryableErrors = () => errorHandler.getRetryableErrors();
export const clearErrorLog = () => errorHandler.clearLog();
export const exportErrorLog = () => errorHandler.exportLog();
