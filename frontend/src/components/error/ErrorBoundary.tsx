import { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '../../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKey?: string | number; // Key to force reset
  showDetails?: boolean; // Whether to show error details in development
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: '',
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with context
    logError(error, {
      service: 'ui',
      operation: 'component-error',
    }, 'high');

    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log additional error details
    console.error('🚨 Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    });
  }

  public componentDidUpdate(prevProps: Props) {
    // Reset error boundary when resetKey changes
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.resetError();
    }
  }

  private resetError = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: '',
      retryCount: this.state.retryCount + 1,
    });
  };

  private handleRetry = (): void => {
    this.resetError();
  };

  private handleReportError = (): void => {
    const { error, errorInfo, errorId } = this.state;
    if (error) {
      // In a real app, you would send this to your error reporting service
      console.log('📧 Error Report:', {
        errorId,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
      
      // Show feedback to user
      alert('Thank you for reporting this error. We will investigate and fix it.');
    }
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId, retryCount } = this.state;
      const isDevelopment = import.meta.env.DEV;
      const showDetails = this.props.showDetails !== false && isDevelopment;

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full mx-auto">
            <div className="bg-white rounded-xl shadow-2xl p-8 border border-red-200">
              {/* Error Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-600 mb-4">
                  We're sorry, but something unexpected happened. Our team has been notified.
                </p>
                {errorId && (
                  <p className="text-sm text-gray-500 mb-4">
                    Error ID: <code className="bg-gray-100 px-2 py-1 rounded">{errorId}</code>
                  </p>
                )}
              </div>

              {/* Error Details (Development Only) */}
              {showDetails && error && (
                <details className="mb-6 bg-gray-50 rounded-lg p-4">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="space-y-3">
                    <div>
                      <strong className="text-red-600">Message:</strong>
                      <pre className="text-sm text-gray-800 mt-1 p-2 bg-white rounded border overflow-x-auto">
                        {error.message}
                      </pre>
                    </div>
                    {error.stack && (
                      <div>
                        <strong className="text-red-600">Stack Trace:</strong>
                        <pre className="text-xs text-gray-800 mt-1 p-2 bg-white rounded border overflow-x-auto max-h-32">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <strong className="text-red-600">Component Stack:</strong>
                        <pre className="text-xs text-gray-800 mt-1 p-2 bg-white rounded border overflow-x-auto max-h-32">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  🔄 Try Again
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  🏠 Go Home
                </button>
                
                <button
                  onClick={this.handleReportError}
                  className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  📧 Report Error
                </button>
              </div>

              {/* Additional Help */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 mb-2">
                  If the problem persists, try:
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Refreshing the page</li>
                  <li>• Clearing your browser cache</li>
                  <li>• Checking your internet connection</li>
                  <li>• Contacting support if the issue continues</li>
                </ul>
              </div>

              {/* Retry Count */}
              {retryCount > 0 && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">
                    Retry attempts: {retryCount}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
