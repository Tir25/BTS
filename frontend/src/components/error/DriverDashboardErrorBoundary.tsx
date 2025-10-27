import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';
import { errorHandler } from '../../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class DriverDashboardErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = errorHandler.handleError(error, 'DriverDashboardErrorBoundary');
    
    logger.error('Driver dashboard error boundary caught error', 'DriverDashboardErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Handle specific error types
    this.handleSpecificErrors(error);
  }

  private handleSpecificErrors(error: Error) {
    const errorMessage = error.message.toLowerCase();
    
    // WebSocket connection errors
    if (errorMessage.includes('websocket') || errorMessage.includes('socket')) {
      logger.warn('WebSocket error detected, will attempt reconnection', 'DriverDashboardErrorBoundary');
      setTimeout(() => {
        this.handleRetry();
      }, 2000);
    }
    
    // Authentication errors
    if (errorMessage.includes('auth') || errorMessage.includes('token')) {
      logger.warn('Authentication error detected, redirecting to login', 'DriverDashboardErrorBoundary');
      setTimeout(() => {
        window.location.href = '/driver/login';
      }, 3000);
    }
    
    // Map errors
    if (errorMessage.includes('map') || errorMessage.includes('maplibre')) {
      logger.warn('Map error detected, will reload map component', 'DriverDashboardErrorBoundary');
      setTimeout(() => {
        this.handleRetry();
      }, 1000);
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      logger.info(`Retrying driver dashboard (attempt ${this.state.retryCount + 1}/${this.maxRetries})`, 'DriverDashboardErrorBoundary');
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  private handleReload = () => {
    logger.info('Reloading driver dashboard page', 'DriverDashboardErrorBoundary');
    window.location.reload();
  };

  private handleGoToLogin = () => {
    logger.info('Redirecting to driver login', 'DriverDashboardErrorBoundary');
    window.location.href = '/driver/login';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, retryCount } = this.state;
      const canRetry = retryCount < this.maxRetries;
      const errorMessage = error?.message || 'Unknown error occurred';

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">Driver Dashboard Error</h2>
            
            <p className="text-white/70 mb-6">
              {errorMessage.includes('websocket') || errorMessage.includes('socket')
                ? 'Connection error occurred. The system will attempt to reconnect automatically.'
                : errorMessage.includes('auth') || errorMessage.includes('token')
                ? 'Authentication error. Please log in again.'
                : errorMessage.includes('map')
                ? 'Map loading error. The map will be reloaded.'
                : 'Something went wrong with the driver dashboard. Please try again.'
              }
            </p>

            <div className="space-y-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Try Again ({retryCount + 1}/{this.maxRetries})
                </button>
              )}
              
              <button
                onClick={this.handleReload}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoToLogin}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Go to Login
              </button>
            </div>

            {import.meta.env.DEV && error && (
              <details className="mt-6 text-left">
                <summary className="text-white/70 cursor-pointer hover:text-white">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-4 bg-black/20 rounded-lg text-sm text-white/70 font-mono overflow-auto">
                  <div className="mb-2">
                    <strong>Error:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap">{error.stack}</pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping driver components with error boundary
export function withDriverDashboardErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <DriverDashboardErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </DriverDashboardErrorBoundary>
  );

  WrappedComponent.displayName = `withDriverDashboardErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default DriverDashboardErrorBoundary;
