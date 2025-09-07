import { Component, ErrorInfo, ReactNode } from 'react';
import { errorHandler } from '../../utils/errorHandler';

interface MapErrorBoundaryProps {
  children: ReactNode;
  onMapError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallbackComponent?: ReactNode;
  mapType?: 'student' | 'driver' | 'admin';
}

interface MapErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  isRetrying: boolean;
}

class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  private retryTimeoutId?: NodeJS.Timeout;
  private maxRetries = 3;

  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      isRetrying: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<MapErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onMapError, mapType = 'student' } = this.props;
    
    // Log map-specific error
    errorHandler.logError(error, {
      service: 'map',
      operation: `${mapType}_map_rendering`,
    }, 'high');

    // Call custom error handler if provided
    if (onMapError) {
      onMapError(error, errorInfo);
    }

    // Store error info for debugging
    this.setState({ errorInfo });

    // Schedule auto-retry for map-specific errors
    this.scheduleMapRetry(error);
  }

  public componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private scheduleMapRetry = (error: Error) => {
    const { retryCount } = this.state;
    
    // Map-specific retryable errors
    const mapRetryableErrors = [
      'MapLibre',
      'Leaflet',
      'WebGL',
      'Canvas',
      'Map container',
      'Invalid LatLng',
      'Tile load error',
      'NetworkError',
      'Failed to fetch'
    ];

    const shouldRetry = mapRetryableErrors.some(errorType => 
      error.message.includes(errorType)
    );

    if (shouldRetry && retryCount < this.maxRetries) {
      const delay = Math.min(2000 * Math.pow(1.5, retryCount), 15000); // Slower backoff for maps
      
      this.setState({ isRetrying: true });
      
      this.retryTimeoutId = setTimeout(() => {
        console.log(`🗺️ Auto-retrying map component (attempt ${retryCount + 1}/${this.maxRetries})`);
        this.resetMapError();
      }, delay);
    }
  };

  public resetMapError = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: this.state.retryCount + 1,
      isRetrying: false,
    });
  };

  public render() {
    if (this.state.hasError) {
      const { fallbackComponent, mapType = 'student' } = this.props;
      const { error, retryCount, isRetrying } = this.state;

      // Use custom fallback if provided
      if (fallbackComponent) {
        return fallbackComponent;
      }

      return (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-5xl mb-4">🗺️</div>
              <h2 className="text-xl font-bold text-orange-600 mb-3">
                Map Loading Error
              </h2>
              <p className="text-gray-600 mb-4">
                The {mapType} map encountered an error while loading.
                {retryCount > 0 && ` (Retry attempt ${retryCount})`}
              </p>
              
              {isRetrying && (
                <div className="mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Retrying...</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={this.resetMapError}
                  disabled={isRetrying}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔄 Reload Map
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  🔄 Refresh Page
                </button>
              </div>

              {error && (
                <details className="text-left bg-gray-100 p-3 rounded-lg mt-4">
                  <summary className="cursor-pointer font-medium text-gray-700 text-sm">
                    Error Details
                  </summary>
                  <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap break-words">
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

export default MapErrorBoundary;