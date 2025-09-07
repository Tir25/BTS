import { Component, ErrorInfo, ReactNode } from 'react';
import { errorHandler } from '../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  context?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  lastResetTime?: number;
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId?: NodeJS.Timeout;

  public state: State = {
    hasError: false,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, context = 'ErrorBoundary' } = this.props;
    
    // Log error with context
    errorHandler.logError(error, {
      service: 'ui',
      operation: context,
    }, 'high');

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Store error info for debugging
    this.setState({ errorInfo });

    // Auto-retry for certain types of errors
    this.scheduleAutoRetry(error);
  }

  public componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) => 
        key !== prevProps.resetKeys?.[index]
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset on any prop change if enabled
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  public componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private scheduleAutoRetry = (error: Error) => {
    const { retryCount } = this.state;
    const maxRetries = 3;
    
    // Only auto-retry for certain types of errors
    const retryableErrors = [
      'ChunkLoadError',
      'Loading chunk',
      'Loading CSS chunk',
      'NetworkError',
      'Failed to fetch'
    ];

    const shouldRetry = retryableErrors.some(errorType => 
      error.message.includes(errorType)
    );

    if (shouldRetry && retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
      
      this.resetTimeoutId = setTimeout(() => {
        console.log(`🔄 Auto-retrying error boundary (attempt ${retryCount + 1}/${maxRetries})`);
        this.resetErrorBoundary();
      }, delay);
    }
  };

  public resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: this.state.retryCount + 1,
      lastResetTime: Date.now(),
    });
  };

  public render() {
    if (this.state.hasError) {
      const { fallback, context = 'ErrorBoundary' } = this.props;
      const { error, retryCount } = this.state;

      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-6xl mb-4">🚨</div>
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                {context} Error
              </h1>
              <p className="text-gray-600 mb-4">
                Something went wrong in the {context.toLowerCase()}. 
                {retryCount > 0 && ` (Retry attempt ${retryCount})`}
              </p>
              
              <div className="space-y-3 mb-6">
                <button
                  onClick={this.resetErrorBoundary}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  🔄 Try Again
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  🔄 Refresh Page
                </button>
              </div>

              {error && (
                <details className="text-left bg-gray-100 p-4 rounded-lg">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Error Details
                  </summary>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap break-words">
                    {error.toString()}
                  </pre>
                </details>
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
