import { authService } from './authService';
import { HealthResponse, Bus, Route, Driver, BusLocation } from '../types';
import { environment } from '../config/environment';
import { resilientApiService } from './resilience/ResilientApiService';
import { logError } from '../utils/errorHandler';

const API_BASE_URL = environment.api.baseUrl;

import { IApiService } from './interfaces/IApiService';

import { logger } from '../utils/logger';

class ApiService implements IApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Backend API calls (for business logic) - Now using resilient API service
  private async backendRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const method = options?.method || 'GET';
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
      logger.info('🔓 Public access - no authentication token available', 'component');
    }

    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    try {
      let response;

      if (method === 'GET') {
        response = await resilientApiService.get<T>(endpoint, { headers });
      } else if (method === 'POST') {
        const body = options?.body
          ? JSON.parse(options.body as string)
          : undefined;
        response = await resilientApiService.post<T>(endpoint, body, {
          headers,
        });
      } else if (method === 'PUT') {
        const body = options?.body
          ? JSON.parse(options.body as string)
          : undefined;
        response = await resilientApiService.put<T>(endpoint, body, {
          headers,
        });
      } else if (method === 'DELETE') {
        response = await resilientApiService.delete<T>(endpoint, { headers });
      } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }

      if (!response.success) {
        throw new Error(response.error || 'API request failed');
      }

      return response.data as T;
    } catch (error) {
      // Log error with context
      logError(
        error,
        `API request failed for ${method} ${endpoint}`
      );

      throw error;
    }
  }

  // Health check
  async getHealth(): Promise<HealthResponse> {
    try {
      // Direct fetch to bypass resilient service for debugging
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('✅ Health check successful:', 'component', { data });
      return data;
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      // Return a fallback health response that matches the expected structure
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: 'development',
        services: {
          database: {
            status: 'unhealthy',
            details: {
              status: 'disconnected',
              details: {
                currentTime: new Date().toISOString(),
                postgresVersion: 'unknown',
                poolSize: 0,
                idleCount: 0,
                waitingCount: 0,
              },
            },
          },
          api: {
            status: 'down',
            database: 'down',
          },
        },
      };
    }
  }

  // Bus operations (Backend API)
  async getAllBuses(): Promise<{
    success: boolean;
    data: Bus[];
    timestamp: string;
  }> {
    try {
      // PRODUCTION FIX: backendRequest already extracts data from resilientApiService response
      // So response is directly the backend response structure
      const response = await this.backendRequest<{
        success: boolean;
        data: Bus[];
        error?: string;
        timestamp: string;
      }>('/buses');

      // PRODUCTION FIX: Check if response is already the backend structure or just data
      if (response && typeof response === 'object' && 'success' in response) {
        // Response is the backend structure {success, data, timestamp}
        if (response.success && response.data) {
          return {
            success: true,
            data: Array.isArray(response.data) ? response.data : [],
            timestamp: response.timestamp || new Date().toISOString(),
          };
        } else {
          logger.error('Error occurred', 'component', { error: `❌ Error fetching buses from backend: ${response.error || 'Unknown error'}` });
          return {
            success: false,
            data: [],
            timestamp: response.timestamp || new Date().toISOString(),
          };
        }
      } else if (Array.isArray(response)) {
        // PRODUCTION FIX: Handle case where backendRequest returns data directly (legacy support)
        logger.info('✅ Buses fetched as direct array', 'component', { count: response.length });
        return {
          success: true,
          data: response,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Unexpected response format
        logger.warn('⚠️ Unexpected response format from getAllBuses', 'component', {
          responseType: typeof response,
          isArray: Array.isArray(response)
        });
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getBusInfo(busId: string): Promise<{
    success: boolean;
    data: Bus | null;
    timestamp: string;
  }> {
    try {
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<{
        success: boolean;
        data: Bus;
        error?: string;
        timestamp: string;
      }>(`/buses/${busId}`);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        logger.error('Error occurred', 'component', { error: `❌ Error fetching bus info from backend: ${response.error}` });
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      return {
        success: false,
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Route operations (Backend API)
  async getRoutes(): Promise<{
    success: boolean;
    data: Route[];
    timestamp: string;
  }> {
    try {
      // PRODUCTION FIX: backendRequest returns the backend's response structure
      // Backend: {success: true, data: Route[], timestamp}
      // resilientApiService wraps: {success: true, data: {success: true, data: Route[], timestamp}, timestamp}
      // backendRequest extracts: {success: true, data: Route[], timestamp}
      const backendResponse = await this.backendRequest<{
        success: boolean;
        data: Route[];
        error?: string;
        timestamp: string;
      }>('/routes');

      // Extract routes from backend response structure
      if (backendResponse && typeof backendResponse === 'object') {
        // Handle standard backend response format
        if ('success' in backendResponse && backendResponse.success && 'data' in backendResponse) {
          const routesArray = Array.isArray(backendResponse.data) ? backendResponse.data : [];
          
          if (routesArray.length > 0) {
            logger.info('✅ Routes fetched successfully', 'component', { count: routesArray.length });
            return {
              success: true,
              data: routesArray,
              timestamp: backendResponse.timestamp || new Date().toISOString(),
            };
          } else {
            logger.warn('⚠️ No routes found in response', 'component');
            return {
              success: true, // Success but empty
              data: [],
              timestamp: backendResponse.timestamp || new Date().toISOString(),
            };
          }
        } else if ('success' in backendResponse && !backendResponse.success) {
          // Error response from backend
          const errorMsg = backendResponse.error || 'Failed to fetch routes';
          logger.error('❌ Error fetching routes from backend', 'component', { error: errorMsg });
          return {
            success: false,
            data: [],
            timestamp: backendResponse.timestamp || new Date().toISOString(),
          };
        }
      }
      
      // Fallback: Check if response is directly an array (legacy support)
      if (Array.isArray(backendResponse)) {
        logger.info('✅ Routes fetched as direct array', 'component', { count: backendResponse.length });
        return {
          success: true,
          data: backendResponse,
          timestamp: new Date().toISOString(),
        };
      }

      // If we get here, response format is unexpected
      logger.warn('⚠️ Unexpected response format', 'component', {
        responseType: typeof backendResponse,
        hasSuccess: backendResponse && typeof backendResponse === 'object' && 'success' in backendResponse,
        hasData: backendResponse && typeof backendResponse === 'object' && 'data' in backendResponse
      });
      
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('❌ Failed to fetch routes', 'component', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getRouteInfo(routeId: string): Promise<{
    success: boolean;
    data: Route | null;
    timestamp: string;
  }> {
    try {
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<{
        success: boolean;
        data: Route;
        error?: string;
        timestamp: string;
      }>(`/routes/${routeId}`);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        logger.error('Error occurred', 'component', { error: `❌ Error fetching route info from backend: ${response.error}` });
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      return {
        success: false,
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Driver operations (Backend API)
  async getAllDrivers(): Promise<{
    success: boolean;
    data: Driver[];
    timestamp: string;
  }> {
    try {
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<{
        success: boolean;
        data: Driver[];
        error?: string;
        timestamp: string;
      }>('/admin/drivers');

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        logger.error('Error occurred', 'component', { error: `❌ Error fetching drivers from backend: ${response.error}` });
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error: `❌ Error in getAllDrivers: ${error}` });
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getDriverInfo(driverId: string): Promise<{
    success: boolean;
    data: Driver | null;
    timestamp: string;
  }> {
    try {
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<{
        success: boolean;
        data: Driver;
        error?: string;
        timestamp: string;
      }>(`/admin/drivers/${driverId}`);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        logger.error('Error occurred', 'component', { error: `❌ Error fetching driver info from backend: ${response.error}` });
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error: `❌ Error in getDriverInfo: ${error}` });
      return {
        success: false,
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Live location operations (Backend API)
  async getLiveLocations(): Promise<{
    success: boolean;
    data: BusLocation[];
    timestamp: string;
  }> {
    try {
      // PRODUCTION FIX: backendRequest already extracts data from resilientApiService response
      const response = await this.backendRequest<{
        success: boolean;
        data: BusLocation[];
        error?: string;
        timestamp: string;
      }>('/locations/current');

      // PRODUCTION FIX: Check if response is already the backend structure or just data
      if (response && typeof response === 'object' && 'success' in response) {
        // Response is the backend structure {success, data, timestamp}
        if (response.success && response.data) {
          return {
            success: true,
            data: Array.isArray(response.data) ? response.data : [],
            timestamp: response.timestamp || new Date().toISOString(),
          };
        } else {
          logger.error('Error occurred', 'component', { error: `❌ Error fetching live locations from backend: ${response.error || 'Unknown error'}` });
          return {
            success: false,
            data: [],
            timestamp: response.timestamp || new Date().toISOString(),
          };
        }
      } else if (Array.isArray(response)) {
        // PRODUCTION FIX: Handle case where backendRequest returns data directly (legacy support)
        logger.info('✅ Live locations fetched as direct array', 'component', { count: response.length });
        return {
          success: true,
          data: response,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Unexpected response format
        logger.warn('⚠️ Unexpected response format from getLiveLocations', 'component', {
          responseType: typeof response,
          isArray: Array.isArray(response)
        });
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error: any) {
      logger.error('Error occurred', 'component', { error: `❌ Error in getLiveLocations: ${error}` });
      // Handle 401 Unauthorized gracefully for student access
      if (error.message && error.message.includes('401')) {
        logger.info('ℹ️ Student access - no authentication required for viewing locations', 'component');
        return {
          success: true,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
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
  ): Promise<{
    success: boolean;
    data: BusLocation | null;
    timestamp: string;
  }> {
    try {
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<{
        success: boolean;
        data: BusLocation;
        error?: string;
        timestamp: string;
      }>('/locations/update', {
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
          timestamp: new Date().toISOString(),
        };
      } else {
        logger.error('Error occurred', 'component', { error: `❌ Error updating live location via backend: ${response.error}` });
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error: `❌ Error in updateLiveLocation: ${error}` });
      return {
        success: false,
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Spatial optimization methods
  async getRoutesInViewport(
    bounds: [[number, number], [number, number]]
  ): Promise<{
    success: boolean;
    data: Route[];
    timestamp: string;
  }> {
    try {
      const [minLng, minLat] = bounds[0];
      const [maxLng, maxLat] = bounds[1];

      // Direct fetch to bypass resilient service for debugging
      const response = await fetch(
        `${this.baseUrl}/routes/viewport?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('Debug info', 'component', { data: `✅ Routes in viewport fetched successfully: ${JSON.stringify(data)}` });

      if (data.success && data.data) {
        return {
          success: true,
          data: data.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        logger.error('Error occurred', 'component', { error: `❌ Error fetching routes in viewport: ${data.error}` });
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error: `❌ Error in getRoutesInViewport: ${error}` });
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getBusesInViewport(
    bounds: [[number, number], [number, number]]
  ): Promise<{
    success: boolean;
    data: Bus[];
    timestamp: string;
  }> {
    try {
      const [minLng, minLat] = bounds[0];
      const [maxLng, maxLat] = bounds[1];

      // Direct fetch to bypass resilient service for debugging
      const response = await fetch(
        `${this.baseUrl}/buses/viewport?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('Debug info', 'component', { data: `✅ Buses in viewport fetched successfully: ${JSON.stringify(data)}` });

      if (data.success && data.data) {
        return {
          success: true,
          data: data.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        logger.error('Error occurred', 'component', { error: `❌ Error fetching buses in viewport: ${data.error}` });
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getLiveLocationsInViewport(
    bounds: [[number, number], [number, number]]
  ): Promise<{
    success: boolean;
    data: BusLocation[];
    timestamp: string;
  }> {
    try {
      const [minLng, minLat] = bounds[0];
      const [maxLng, maxLat] = bounds[1];

      // Direct fetch to bypass resilient service for debugging
      const response = await fetch(
        `${this.baseUrl}/locations/viewport?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('✅ Live locations in viewport fetched successfully:', 'component', { data });

      if (data.success && data.data) {
        return {
          success: true,
          data: data.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        logger.error('Error occurred', 'component', { error: `❌ Error fetching live locations in viewport: ${data.error}` });
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error: `❌ Error in getLiveLocationsInViewport: ${error}` });
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getBusClusters(
    bounds: [[number, number], [number, number]],
    zoom: number
  ): Promise<{
    success: boolean;
    data: any[];
    timestamp: string;
  }> {
    try {
      const [minLng, minLat] = bounds[0];
      const [maxLng, maxLat] = bounds[1];

      // Direct fetch to bypass resilient service for debugging
      const response = await fetch(
        `${this.baseUrl}/buses/clusters?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}&zoom=${zoom}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('✅ Bus clusters fetched successfully:', 'component', { data });

      if (data.success && data.data) {
        return {
          success: true,
          data: data.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        logger.error('Error occurred', 'component', { error: `❌ Error fetching bus clusters: ${data.error}` });
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error: `❌ Error in getBusClusters: ${error}` });
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const apiService = new ApiService(API_BASE_URL);
export default apiService;
