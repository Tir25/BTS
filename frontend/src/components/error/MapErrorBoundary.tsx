import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '../../utils/errorHandler';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class MapErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with map-specific context
    logError(error, {
      service: 'map',
      operation: 'map-render-error',
    }, 'high');

    this.setState({ errorInfo });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  private handleReloadPage = (): void => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const isMapError = error?.message?.includes('map') || 
                        error?.message?.includes('WebGL') ||
                        error?.message?.includes('tile');

      return (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Map Loading Error
            </h3>
            
            <p className="text-gray-600 mb-4">
              {isMapError 
                ? "We're having trouble loading the map. This might be due to network issues or browser compatibility."
                : "Something went wrong while displaying the map."
              }
            </p>

            <div className="space-y-2">
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                🔄 Retry Loading Map
              </button>
              
              <button
                onClick={this.handleReloadPage}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                🔄 Reload Page
              </button>
            </div>

            {isMapError && (
              <div className="mt-4 text-left">
                <p className="text-sm text-gray-500 mb-2">Troubleshooting tips:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Try refreshing the page</li>
                  <li>• Update your browser to the latest version</li>
                  <li>• Disable browser extensions that might interfere</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;
