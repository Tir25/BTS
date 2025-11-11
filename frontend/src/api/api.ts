import { authService } from '../services/authService';
import { HealthResponse, Bus, Route, Driver, BusLocation } from '../types';
import { environment } from '../config/environment';
import { resilientApiService } from '../services/resilience/ResilientApiService';
import { logError } from '../utils/errorHandler';
import { timeoutConfig } from '../config/timeoutConfig';

const API_BASE_URL = environment.api.baseUrl;

import { IApiService } from '../services/interfaces/IApiService';

import { logger } from '../utils/logger';

class ApiService implements IApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async backendRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const method = options?.method || 'GET';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

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
        const isVolatile = (
          endpoint.startsWith('/tracking/assignment') ||
          endpoint.startsWith('/student/route-status') ||
          endpoint.startsWith('/student/routes-by-shift') ||
          endpoint.startsWith('/student/active-routes')
        );
        response = await resilientApiService.get<T>(endpoint, { headers, useOfflineStorage: !isVolatile, retryOnFailure: !isVolatile });
      } else if (method === 'POST') {
        const body = options?.body
          ? JSON.parse(options.body as string)
          : undefined;
        response = await resilientApiService.post<T>(endpoint, body, {
          headers,
          useOfflineStorage: false,
          retryOnFailure: false,
        });
      } else if (method === 'PUT') {
        const body = options?.body
          ? JSON.parse(options.body as string)
          : undefined;
        response = await resilientApiService.put<T>(endpoint, body, {
          headers,
          useOfflineStorage: false,
          retryOnFailure: false,
        });
      } else if (method === 'DELETE') {
        response = await resilientApiService.delete<T>(endpoint, { headers, useOfflineStorage: false, retryOnFailure: false });
      } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }

      if (!response.success) {
        throw new Error(response.error || 'API request failed');
      }

      return response.data as T;
    } catch (error) {
      logError(
        error,
        `API request failed for ${method} ${endpoint}`
      );

      throw error;
    }
  }

  async getHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(timeoutConfig.api.healthCheck),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('✅ Health check successful:', 'component', { data });
      return data;
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
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

  async getAllBuses(): Promise<{
    success: boolean;
    data: Bus[];
    timestamp: string;
  }> {
    try {
      const response = await this.backendRequest<{
        success: boolean;
        data: Bus[];
        error?: string;
        timestamp: string;
      }>('/buses');

      if (response && typeof response === 'object' && 'success' in response) {
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
        logger.info('✅ Buses fetched as direct array', 'component', { count: response.length });
        return {
          success: true,
          data: response,
          timestamp: new Date().toISOString(),
        };
      } else {
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

  async getRoutes(): Promise<{
    success: boolean;
    data: Route[];
    timestamp: string;
  }> {
    try {
      const backendResponse = await this.backendRequest<{
        success: boolean;
        data: Route[];
        error?: string;
        timestamp: string;
      }>('/routes');

      if (backendResponse && typeof backendResponse === 'object') {
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
              success: true,
              data: [],
              timestamp: backendResponse.timestamp || new Date().toISOString(),
            };
          }
        } else if ('success' in backendResponse && !backendResponse.success) {
          const errorMsg = backendResponse.error || 'Failed to fetch routes';
          logger.error('❌ Error fetching routes from backend', 'component', { error: errorMsg });
          return {
            success: false,
            data: [],
            timestamp: backendResponse.timestamp || new Date().toISOString(),
          };
        }
      }
      
      if (Array.isArray(backendResponse)) {
        logger.info('✅ Routes fetched as direct array', 'component', { count: backendResponse.length });
        return {
          success: true,
          data: backendResponse,
          timestamp: new Date().toISOString(),
        };
      }

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

  async getAllDrivers(): Promise<{
    success: boolean;
    data: Driver[];
    timestamp: string;
  }> {
    try {
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

  async getLiveLocations(): Promise<{
    success: boolean;
    data: BusLocation[];
    timestamp: string;
  }> {
    try {
      const response = await this.backendRequest<{
        success: boolean;
        data: BusLocation[];
        error?: string;
        timestamp: string;
      }>('/locations/current');

      if (response && typeof response === 'object' && 'success' in response) {
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
        logger.info('✅ Live locations fetched as direct array', 'component', { count: response.length });
        return {
          success: true,
          data: response,
          timestamp: new Date().toISOString(),
        };
      } else {
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

      const response = await fetch(
        `${this.baseUrl}/routes/viewport?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(timeoutConfig.api.default),
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

      const response = await fetch(
        `${this.baseUrl}/buses/viewport?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(timeoutConfig.api.default),
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

      const response = await fetch(
        `${this.baseUrl}/locations/viewport?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(timeoutConfig.api.default),
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

  /**
   * Get driver assignment with stops
   * PRODUCTION FIX: Added missing method for driver dashboard
   */
  async getDriverAssignmentWithStops(driverId: string): Promise<{
    success: boolean;
    data: {
      stops: {
        completed: any[];
        next: any | null;
        remaining: any[];
      };
      shift_name?: string;
      route_name?: string;
      route_id?: string;
    } | null;
    error?: string;
  }> {
    try {
      const response = await this.backendRequest<{
        success: boolean;
        data: {
          stops: {
            completed: any[];
            next: any | null;
            remaining: any[];
          };
          shift_name?: string;
          route_name?: string;
          route_id?: string;
        };
        error?: string;
      }>(`/tracking/assignment/${driverId}`);

      if (response && typeof response === 'object') {
        if ('success' in response && response.success && 'data' in response) {
          logger.info('✅ Driver assignment with stops fetched successfully', 'component', {
            hasStops: !!response.data?.stops,
            routeName: response.data?.route_name
          });
          return {
            success: true,
            data: response.data || null,
          };
        } else {
          logger.warn('⚠️ Assignment fetch returned unsuccessful', 'component', { error: (response as any).error });
          return {
            success: false,
            data: null,
            error: (response as any).error || 'Failed to fetch assignment',
          };
        }
      }

      logger.warn('⚠️ Unexpected response format from getDriverAssignmentWithStops', 'component');
      return {
        success: false,
        data: null,
        error: 'Unexpected response format',
      };
    } catch (error) {
      logger.error('❌ Error fetching driver assignment with stops', 'component', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Start tracking session for driver
   * PRODUCTION FIX: Fixed endpoint to match backend route - use body parameters instead of path
   */
  async startTracking(driverId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // PRODUCTION FIX: Use correct endpoint /tracking/start with body parameters
      const response = await this.backendRequest<{
        success: boolean;
        data?: any;
        error?: string;
      }>('/tracking/start', {
        method: 'POST',
        body: JSON.stringify({
          driverId
        }),
      });

      if (response && typeof response === 'object' && 'success' in response) {
        if (response.success) {
          logger.info('✅ Tracking started successfully', 'component', { driverId });
          return { success: true };
        } else {
          logger.warn('⚠️ Start tracking returned unsuccessful', 'component', { error: response.error });
          return {
            success: false,
            error: response.error || 'Failed to start tracking',
          };
        }
      }

      // If response doesn't have success field, assume it succeeded (idempotent operation)
      logger.info('✅ Tracking start request completed', 'component', { driverId });
      return { success: true };
    } catch (error) {
      logger.error('❌ Error starting tracking', 'component', {
        error: error instanceof Error ? error.message : String(error),
        driverId
      });
      // PRODUCTION FIX: Don't fail if tracking is already started (idempotent)
      if (error instanceof Error && error.message.includes('already')) {
        return { success: true };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Stop tracking session for driver
   * PRODUCTION FIX: Fixed endpoint to match backend route - use body parameters instead of path
   */
  async stopTracking(driverId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // PRODUCTION FIX: Use correct endpoint /tracking/stop with body parameters
      const response = await this.backendRequest<{
        success: boolean;
        data?: any;
        error?: string;
      }>('/tracking/stop', {
        method: 'POST',
        body: JSON.stringify({
          driverId
        }),
      });

      if (response && typeof response === 'object' && 'success' in response) {
        if (response.success) {
          logger.info('✅ Tracking stopped successfully', 'component', { driverId });
          return { success: true };
        } else {
          logger.warn('⚠️ Stop tracking returned unsuccessful', 'component', { error: response.error });
          return {
            success: false,
            error: response.error || 'Failed to stop tracking',
          };
        }
      }

      logger.info('✅ Tracking stop request completed', 'component', { driverId });
      return { success: true };
    } catch (error) {
      logger.error('❌ Error stopping tracking', 'component', {
        error: error instanceof Error ? error.message : String(error),
        driverId
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Mark stop as reached
   * PRODUCTION FIX: Fixed endpoint to match backend route
   */
  async markStopReached(driverId: string, stopId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // PRODUCTION FIX: Use correct endpoint /tracking/stop-reached with body parameters
      const response = await this.backendRequest<{
        success: boolean;
        data?: any;
        error?: string;
      }>('/tracking/stop-reached', {
        method: 'POST',
        body: JSON.stringify({
          driverId,
          stopId
        }),
      });

      if (response && typeof response === 'object' && 'success' in response) {
        if (response.success) {
          logger.info('✅ Stop marked as reached successfully', 'component', { driverId, stopId });
          return { success: true };
        } else {
          logger.warn('⚠️ Mark stop reached returned unsuccessful', 'component', { error: response.error });
          return {
            success: false,
            error: response.error || 'Failed to mark stop as reached',
          };
        }
      }

      logger.info('✅ Mark stop reached request completed', 'component', { driverId, stopId });
      return { success: true };
    } catch (error) {
      logger.error('❌ Error marking stop as reached', 'component', {
        error: error instanceof Error ? error.message : String(error),
        driverId,
        stopId
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get route stops for a given route (student access)
   * PRODUCTION FIX: Added missing method for student map access
   */
  async getRouteStops(routeId: string): Promise<{
    success: boolean;
    data: Array<{ id: string; name?: string; sequence: number; is_active?: boolean }>;
    error?: string;
  }> {
    try {
      const response = await this.backendRequest<{
        success: boolean;
        data: Array<{ id: string; name?: string; sequence: number; is_active?: boolean }>;
        error?: string;
      }>(`/student/route-stops?routeId=${encodeURIComponent(routeId)}`);

      if (response && typeof response === 'object') {
        if ('success' in response && response.success && 'data' in response) {
          logger.info('✅ Route stops fetched successfully', 'component', {
            routeId,
            stopCount: response.data?.length || 0
          });
          return {
            success: true,
            data: response.data || [],
          };
        } else {
          logger.warn('⚠️ Route stops fetch returned unsuccessful', 'component', { 
            error: (response as any).error,
            routeId 
          });
          return {
            success: false,
            data: [],
            error: (response as any).error || 'Failed to fetch route stops',
          };
        }
      }

      logger.warn('⚠️ Unexpected response format from getRouteStops', 'component');
      return {
        success: false,
        data: [],
        error: 'Unexpected response format',
      };
    } catch (error) {
      logger.error('❌ Error fetching route stops', 'component', {
        error: error instanceof Error ? error.message : String(error),
        routeId
      });
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get routes by shift (student access)
   * PRODUCTION FIX: Added missing method for student map shift filtering
   */
  async getRoutesByShift(opts: { shiftName?: string; shiftId?: string }): Promise<{
    success: boolean;
    data: Array<{ id: string; name: string }>;
    error?: string;
  }> {
    try {
      const params = new URLSearchParams();
      if (opts.shiftName) params.append('shiftName', opts.shiftName);
      if (opts.shiftId) params.append('shiftId', opts.shiftId);

      const response = await this.backendRequest<{
        success: boolean;
        data: Array<{ id: string; name: string }>;
        error?: string;
      }>(`/student/routes-by-shift?${params.toString()}`);

      if (response && typeof response === 'object') {
        if ('success' in response && response.success && 'data' in response) {
          logger.info('✅ Routes by shift fetched successfully', 'component', {
            shiftName: opts.shiftName,
            shiftId: opts.shiftId,
            routeCount: response.data?.length || 0
          });
          return {
            success: true,
            data: response.data || [],
          };
        } else {
          logger.warn('⚠️ Routes by shift fetch returned unsuccessful', 'component', { 
            error: (response as any).error,
            shiftName: opts.shiftName,
            shiftId: opts.shiftId
          });
          return {
            success: false,
            data: [],
            error: (response as any).error || 'Failed to fetch routes by shift',
          };
        }
      }

      logger.warn('⚠️ Unexpected response format from getRoutesByShift', 'component');
      return {
        success: false,
        data: [],
        error: 'Unexpected response format',
      };
    } catch (error) {
      logger.error('❌ Error fetching routes by shift', 'component', {
        error: error instanceof Error ? error.message : String(error),
        shiftName: opts.shiftName,
        shiftId: opts.shiftId
      });
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get student route status (student access)
   * PRODUCTION FIX: Added missing method for student map route status
   */
  async getStudentRouteStatus(routeId: string, params?: { shiftName?: string; shiftId?: string }): Promise<{
    success: boolean;
    data: {
      tracking_active: boolean;
      stops: {
        completed: any[];
        next: any | null;
        remaining: any[];
      };
      session?: {
        id: string;
        driver_id: string;
        bus_id: string;
        shift_id: string;
        started_at: string;
      };
    };
    error?: string;
  }> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('routeId', routeId);
      if (params?.shiftName) queryParams.append('shiftName', params.shiftName);
      if (params?.shiftId) queryParams.append('shiftId', params.shiftId);

      const response = await this.backendRequest<{
        success: boolean;
        data: {
          tracking_active: boolean;
          stops: {
            completed: any[];
            next: any | null;
            remaining: any[];
          };
          session?: {
            id: string;
            driver_id: string;
            bus_id: string;
            shift_id: string;
            started_at: string;
          };
        };
        error?: string;
      }>(`/student/route-status?${queryParams.toString()}`);

      if (response && typeof response === 'object') {
        if ('success' in response && response.success && 'data' in response) {
          logger.info('✅ Student route status fetched successfully', 'component', {
            routeId,
            trackingActive: response.data?.tracking_active,
            shiftName: params?.shiftName,
            shiftId: params?.shiftId
          });
          return {
            success: true,
            data: response.data || {
              tracking_active: false,
              stops: { completed: [], next: null, remaining: [] }
            },
          };
        } else {
          logger.warn('⚠️ Student route status fetch returned unsuccessful', 'component', { 
            error: (response as any).error,
            routeId
          });
          return {
            success: false,
            data: {
              tracking_active: false,
              stops: { completed: [], next: null, remaining: [] }
            },
            error: (response as any).error || 'Failed to fetch route status',
          };
        }
      }

      logger.warn('⚠️ Unexpected response format from getStudentRouteStatus', 'component');
      return {
        success: false,
        data: {
          tracking_active: false,
          stops: { completed: [], next: null, remaining: [] }
        },
        error: 'Unexpected response format',
      };
    } catch (error) {
      logger.error('❌ Error fetching student route status', 'component', {
        error: error instanceof Error ? error.message : String(error),
        routeId,
        shiftName: params?.shiftName,
        shiftId: params?.shiftId
      });
      return {
        success: false,
        data: {
          tracking_active: false,
          stops: { completed: [], next: null, remaining: [] }
        },
        error: error instanceof Error ? error.message : 'Unknown error',
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

      const response = await fetch(
        `${this.baseUrl}/buses/clusters?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}&zoom=${zoom}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(timeoutConfig.api.default),
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

  /**
   * Student Login
   * Authenticates a student and returns session token
   */
  async studentLogin(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    data?: {
      user: {
        id: string;
        email: string;
        full_name: string;
        role: string;
        is_active: boolean;
        email_verified: boolean;
      };
      session: {
        access_token: string;
        refresh_token: string;
        expires_at: number;
      };
    };
    error?: string;
    message?: string;
    code?: string;
    timestamp?: string;
  }> {
    try {
      const response = await this.backendRequest<{
        success: boolean;
        data: {
          user: {
            id: string;
            email: string;
            full_name: string;
            role: string;
            is_active: boolean;
            email_verified: boolean;
          };
          session: {
            access_token: string;
            refresh_token: string;
            expires_at: number;
          };
        };
        error?: string;
        message?: string;
        code?: string;
        timestamp?: string;
      }>('/auth/student/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      return response;
    } catch (error: any) {
      logger.error('Student login error', 'api', { error: error?.message });
      return {
        success: false,
        error: error?.message || 'Login failed',
        code: 'LOGIN_ERROR'
      };
    }
  }
}

export const apiService = new ApiService(API_BASE_URL);
export default apiService;

