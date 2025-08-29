import { authService } from './authService';
import { HealthResponse, Bus, Route, Driver, BusLocation } from '../types';
import { environment } from '../config/environment';
import errorHandler, { ErrorType, ErrorSeverity } from '../utils/errorHandler';
import validation from '../utils/validation';
import apiHelpers from '../utils/apiHelpers';

const API_BASE_URL = environment.api.url;

import { IApiService, ApiResponse } from './interfaces/IApiService';

class ApiService implements IApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Backend API calls (for business logic)
  private async backendRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    // Ensure we're using the correct backend URL for production
    const baseUrl = this.baseUrl || environment.api.url;
    const url = `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try to get token, but don't fail if auth service is not available
    try {
      const token = authService.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('🔓 Public access - no authentication token available');
    }

    if (options?.headers) {
      Object.assign(headers, options.headers);
    }
    
    try {
      // Add timeout to fetch requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        headers,
        ...options,
        signal: controller.signal,
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Determine error type based on status code
        let errorType = ErrorType.UNKNOWN;
        let severity = ErrorSeverity.ERROR;
        
        switch (response.status) {
          case 400:
            errorType = ErrorType.VALIDATION;
            break;
          case 401:
            errorType = ErrorType.AUTHENTICATION;
            break;
          case 403:
            errorType = ErrorType.AUTHORIZATION;
            break;
          case 404:
            errorType = ErrorType.NOT_FOUND;
            severity = ErrorSeverity.WARNING;
            break;
          case 408:
            errorType = ErrorType.TIMEOUT;
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorType = ErrorType.SERVER;
            severity = ErrorSeverity.CRITICAL;
            break;
        }
        
        const error = errorHandler.createError(
          errorType,
          errorData.message || errorData.error || `API request failed: ${response.status} ${response.statusText}`,
          severity,
          errorData,
          {
            url,
            status: response.status,
            statusText: response.statusText,
            endpoint,
          },
          errorData.code
        );
        
        errorHandler.logError(error);
        throw error;
      }

      return response.json();
    } catch (error) {
      // Handle fetch errors (network issues, timeouts, etc.)
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError = errorHandler.createError(
          ErrorType.TIMEOUT,
          `Request to ${endpoint} timed out after 30 seconds`,
          ErrorSeverity.WARNING,
          error,
          { url, endpoint }
        );
        errorHandler.logError(timeoutError);
        throw timeoutError;
      }
      
      // Handle other network errors
      if (error instanceof Error && error.message.includes('fetch')) {
        const networkError = errorHandler.createError(
          ErrorType.NETWORK,
          `Network error while connecting to ${endpoint}`,
          ErrorSeverity.WARNING,
          error,
          { url, endpoint }
        );
        errorHandler.logError(networkError);
        throw networkError;
      }
      
      // Re-throw the error if it's already an AppError
      if (error && typeof error === 'object' && 'type' in error && 'severity' in error) {
        throw error;
      }
      
      // Handle any other errors
      const unknownError = errorHandler.createError(
        ErrorType.UNKNOWN,
        `Unknown error occurred while fetching ${endpoint}`,
        ErrorSeverity.ERROR,
        error,
        { url, endpoint }
      );
      errorHandler.logError(unknownError);
      throw unknownError;
    }
  }

  // Health check
  async getHealth(): Promise<HealthResponse> {
    return this.backendRequest<HealthResponse>('/health');
  }

  // Bus operations (Backend API)
  async getAllBuses(): Promise<ApiResponse<Bus[]>> {
    try {
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<ApiResponse<Bus[]>>('/buses');
      
      // Use helper function to handle response with validation
      return apiHelpers.handleApiArrayResponse<Bus, Bus>(
        response,
        validation.isBus,
        'buses',
        '/buses'
      );
    } catch (error) {
      // Use helper function to handle errors
      return apiHelpers.handleApiError<Bus[]>(
        error,
        'Failed to fetch buses',
        'buses'
      );
    }
  }

  async getBusInfo(busId: string): Promise<ApiResponse<Bus | null>> {
    try {
      if (!busId) {
        // Use helper function to handle parameter validation error
        return apiHelpers.handleParamValidationError<Bus | null>(
          'Bus ID',
          'bus',
          'getBusInfo'
        );
      }
      
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<ApiResponse<Bus>>(`/buses/${busId}`);
      
      // Use helper function to handle response with validation
      return apiHelpers.handleApiResponse<Bus, Bus>(
        response,
        validation.isBus,
        'bus',
        `/buses/${busId}`,
        busId
      );
    } catch (error) {
      // Use helper function to handle errors
      return apiHelpers.handleApiError<Bus | null>(
        error,
        `Failed to fetch bus information for ID ${busId}`,
        'bus',
        busId
      );
    }
  }

  // Route operations (Backend API)
  async getRoutes(): Promise<ApiResponse<Route[]>> {
    try {
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<ApiResponse<Route[]>>('/routes');
      
      // Use helper function to handle response with validation
      return apiHelpers.handleApiArrayResponse<Route, Route>(
        response,
        validation.isRoute,
        'routes',
        '/routes'
      );
    } catch (error) {
      // Use helper function to handle errors
      return apiHelpers.handleApiError<Route[]>(
        error,
        'Failed to fetch routes',
        'routes'
      );
    }
  }
  
  async getRouteInfo(routeId: string): Promise<ApiResponse<Route | null>> {
    try {
      if (!routeId) {
        // Use helper function to handle parameter validation error
        return apiHelpers.handleParamValidationError<Route | null>(
          'Route ID',
          'route',
          'getRouteInfo'
        );
      }
      
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<ApiResponse<Route>>(`/routes/${routeId}`);
      
      // Use helper function to handle response with validation
      return apiHelpers.handleApiResponse<Route, Route>(
        response,
        validation.isRoute,
        'route',
        `/routes/${routeId}`,
        routeId
      );
    } catch (error) {
      // Use helper function to handle errors
      return apiHelpers.handleApiError<Route | null>(
        error,
        `Failed to fetch route information for ID ${routeId}`,
        'route',
        routeId
      );
    }
  }

  // This is a duplicate method that has been replaced by the typed version above

  // Driver operations (Backend API)
  async getAllDrivers(): Promise<ApiResponse<Driver[]>> {
    try {
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<ApiResponse<Driver[]>>('/admin/drivers');

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          timestamp: response.timestamp || new Date().toISOString(),
        };
      } else {
        console.error(
          '❌ Error fetching drivers from backend:',
          response.error
        );
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
          error: response.error || 'Failed to fetch drivers',
          message: response.message || 'An error occurred while fetching drivers',
        };
      }
    } catch (error) {
      console.error('❌ Error in getAllDrivers:', error);
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch drivers due to a network or server error',
      };
    }
  }

  async getDriverInfo(driverId: string): Promise<ApiResponse<Driver | null>> {
    try {
      if (!driverId) {
        throw new Error('Driver ID is required');
      }
      
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<ApiResponse<Driver>>(`/admin/drivers/${driverId}`);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          timestamp: response.timestamp || new Date().toISOString(),
        };
      } else {
        console.error(
          '❌ Error fetching driver info from backend:',
          response.error
        );
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
          error: response.error || `Failed to fetch driver with ID ${driverId}`,
          message: response.message || 'An error occurred while fetching driver information',
        };
      }
    } catch (error) {
      console.error('❌ Error in getDriverInfo:', error);
      return {
        success: false,
        data: null,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch driver information due to a network or server error',
      };
    }
  }

  // Live location operations (Backend API)
  async getLiveLocations(): Promise<ApiResponse<BusLocation[]>> {
    try {
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<ApiResponse<BusLocation[]>>('/locations/current');

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          timestamp: response.timestamp || new Date().toISOString(),
        };
      } else {
        console.error(
          '❌ Error fetching live locations from backend:',
          response.error
        );
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
          error: response.error || 'Failed to fetch live locations',
          message: response.message || 'An error occurred while fetching live locations',
        };
      }
    } catch (error) {
      console.error('❌ Error in getLiveLocations:', error);
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch live locations due to a network or server error',
      };
    }
  }

  async updateLiveLocation(
    busId: string,
    driverId: string,
    location: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
    }
  ): Promise<ApiResponse<BusLocation | null>> {
    try {
      if (!busId || !driverId) {
        throw new Error('Bus ID and Driver ID are required');
      }
      
      if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        throw new Error('Valid location coordinates are required');
      }
      
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<ApiResponse<BusLocation>>('/locations/update', {
        method: 'POST',
        body: JSON.stringify({
          busId,
          driverId,
          latitude: location.latitude,
          longitude: location.longitude,
          speed: location.speed,
          heading: location.heading,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          timestamp: response.timestamp || new Date().toISOString(),
        };
      } else {
        console.error(
          '❌ Error updating live location via backend:',
          response.error
        );
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
          error: response.error || 'Failed to update location',
          message: response.message || 'An error occurred while updating location',
        };
      }
    } catch (error) {
      console.error('❌ Error in updateLiveLocation:', error);
      return {
        success: false,
        data: null,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update location due to a network or server error',
      };
    }
  }
}

export const apiService = new ApiService(API_BASE_URL);
export default apiService;
