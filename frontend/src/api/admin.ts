import { authService } from '../services/authService';
import { environment } from '../config/environment';

import { logger } from '../utils/logger';
import { parseJsonResponse } from '../utils/jsonUtils';

const API_BASE_URL = environment.api.baseUrl;

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

interface BusData {
  id?: string;
  code: string;
  bus_number: string;
  capacity: number;
  model?: string;
  year?: number;
  is_active: boolean;
  assigned_driver_profile_id?: string;
  route_id?: string;
  driver_full_name?: string;
  driver_email?: string;
  driver_first_name?: string;
  driver_last_name?: string;
  route_name?: string;
  vehicle_no?: string;
  created_at?: string;
  updated_at?: string;
}

interface DriverData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  assigned_bus_id?: string;
  assigned_bus_plate?: string;
  is_driver?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface RouteData {
  id: string;
  name: string;
  description: string;
  distance_km: number;
  estimated_duration_minutes: number;
  is_active: boolean;
  city: string;
  custom_destination?: string;
  created_at?: string;
  updated_at?: string;
  custom_origin?: string;
  destination_coordinates?: {
    coordinates: [number, number];
  };
  origin_coordinates?: {
    coordinates: [number, number];
  };
  bus_stops?: any[];
  current_eta_minutes?: number;
  last_eta_calculation?: string;
  stops?: GeoJSON.LineString;
}

interface AnalyticsData {
  totalBuses: number;
  activeBuses: number;
  totalRoutes: number;
  activeRoutes: number;
  totalDrivers: number;
  activeDrivers: number;
  averageDelay: number;
  busUsageStats: {
    date: string;
    activeBuses: number;
    totalTrips: number;
  }[];
}

interface SystemHealth {
  buses: number;
  routes: number;
  drivers: number;
  recentLocations: number;
  timestamp: string;
}

class AdminApiService {
  // PRODUCTION FIX: Enhanced request method with better error handling and token management
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    let timeoutId: NodeJS.Timeout | undefined;
    const requestId = `admin_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      let token = authService.getAccessToken();
      
      // PRODUCTION FIX: Attempt token refresh if authenticated but no token
      if (!token && authService.isAuthenticated()) {
        try {
          logger.debug('🔄 No token but authenticated, attempting refresh...', 'admin-api', { endpoint, requestId });
          const refreshResult = await authService.refreshSession();
          if (refreshResult.success && refreshResult.session) {
            token = refreshResult.session.access_token;
            logger.debug('✅ Token refreshed successfully', 'admin-api', { endpoint, requestId });
          }
        } catch (refreshError) {
          logger.warn('⚠️ Token refresh failed', 'admin-api', {
            endpoint,
            requestId,
            error: refreshError instanceof Error ? refreshError.message : String(refreshError)
          });
        }
      }
      
      logger.debug('🔑 Token check', 'admin-api', { 
        endpoint, 
        requestId,
        hasToken: !!token,
        isAuthenticated: authService.isAuthenticated()
      });

      if (!token) {
        logger.error('❌ No access token available', 'admin-api', { 
          endpoint, 
          requestId,
          isAuthenticated: authService.isAuthenticated()
        });
        throw new Error('No access token available');
      }

      const controller = new AbortController();
      // PRODUCTION FIX: Extended timeout for operations that may take longer (e.g., Supabase auth)
      // Use 30 seconds for POST/PUT/DELETE operations, 15 seconds for GET
      const isMutation = options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method);
      const timeoutDuration = isMutation ? 30000 : 15000;
      timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      // Normalize baseUrl to never have trailing slash
      const rawBaseUrl = API_BASE_URL || environment.api.baseUrl;
      const baseUrl = rawBaseUrl.replace(/\/+$/, '');
      
      // Safely join URLs to prevent double-slash issues
      const isAssignmentEndpoint = endpoint.startsWith('/assignments') || endpoint.startsWith('/production-assignments');
      const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const fullUrl = isAssignmentEndpoint 
        ? `${baseUrl}${normalizedEndpoint}`
        : `${baseUrl}/admin${normalizedEndpoint}`;
      
      logger.info('🌐 API Request', 'admin-api', { 
        endpoint, 
        fullUrl, 
        isAssignmentEndpoint,
        method: options.method || 'GET',
        requestId
      });
      
      const response = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Request-ID': requestId,
          ...options.headers,
        },
      });

      const parseResult = await parseJsonResponse(response, null, endpoint);
      
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse JSON response');
      }
      
      const data = parseResult.data;
      
      if (timeoutId) clearTimeout(timeoutId);

      // PRODUCTION FIX: Enhanced error handling with proper error codes
      if (!response.ok) {
        const errorData = data as any;
        const errorMessage = errorData?.message || errorData?.error || 'Request failed';
        const errorCode = errorData?.code || 'API_ERROR';
        
        logger.error('Admin API request failed', 'admin-api', {
          requestId,
          endpoint,
          status: response.status,
          error: errorMessage,
          code: errorCode
        });
        
        if (response.status === 429) {
          const rateLimitError: any = new Error('Rate limit exceeded. Please wait a moment and try again.');
          rateLimitError.code = 'RATE_LIMITED';
          rateLimitError.status = 429;
          throw rateLimitError;
        } else if (response.status === 401) {
          const authError: any = new Error('Authentication required. Please log in again.');
          authError.code = 'UNAUTHORIZED';
          authError.status = 401;
          throw authError;
        } else if (response.status === 403) {
          const forbiddenError: any = new Error('Access denied. You do not have permission for this action.');
          forbiddenError.code = 'FORBIDDEN';
          forbiddenError.status = 403;
          throw forbiddenError;
        } else if (response.status === 404) {
          const notFoundError: any = new Error('Resource not found.');
          notFoundError.code = 'NOT_FOUND';
          notFoundError.status = 404;
          throw notFoundError;
        } else if (response.status === 409) {
          const conflictError: any = new Error(errorMessage);
          conflictError.code = 'CONFLICT';
          conflictError.status = 409;
          throw conflictError;
        } else if (response.status >= 500) {
          const serverError: any = new Error('Server error. Please try again later.');
          serverError.code = 'SERVER_ERROR';
          serverError.status = response.status;
          throw serverError;
        } else {
          const apiError: any = new Error(errorMessage);
          apiError.code = errorCode;
          apiError.status = response.status;
          throw apiError;
        }
      }

      return data || { success: false, error: 'No data received' };
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      logger.error(`❌ API request failed for ${endpoint}:`, 'component', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  }

  async getShifts(): Promise<ApiResponse<Array<{ id: string; name: string; is_active?: boolean; start_time?: string; end_time?: string; description?: string }>>> {
    return this.makeRequest('/shifts');
  }

  async createShift(shift: { name: string; start_time?: string; end_time?: string; description?: string; is_active?: boolean }): Promise<ApiResponse<any>> {
    return this.makeRequest('/shifts', {
      method: 'POST',
      body: JSON.stringify(shift),
    });
  }

  async updateShift(id: string, shift: Partial<{ name: string; start_time?: string; end_time?: string; description?: string; is_active?: boolean }>): Promise<ApiResponse<any>> {
    return this.makeRequest(`/shifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(shift),
    });
  }

  async deleteShift(id: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/shifts/${id}`, {
      method: 'DELETE',
    });
  }

  async getAnalytics(): Promise<ApiResponse<AnalyticsData>> {
    try {
      return await this.makeRequest<AnalyticsData>('/analytics');
    } catch (error) {
      logger.warn('Analytics request failed, returning fallback data', 'component');
      return {
        success: true,
        data: {
          totalBuses: 0,
          activeBuses: 0,
          totalRoutes: 0,
          activeRoutes: 0,
          totalDrivers: 0,
          activeDrivers: 0,
          averageDelay: 0,
          busUsageStats: []
        }
      };
    }
  }

  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    try {
      return await this.makeRequest<SystemHealth>('/health');
    } catch (error) {
      logger.warn('Health request failed, returning fallback data', 'component');
      return {
        success: true,
        data: {
          buses: 0,
          routes: 0,
          drivers: 0,
          recentLocations: 0,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async getAllBuses(): Promise<ApiResponse<BusData[]>> {
    logger.info('🚌 Fetching all buses...', 'component');
    const result = await this.makeRequest<BusData[]>('/buses');
    logger.debug('Debug info', 'component', { data: `🚌 Buses result: ${result.success ? `${result.data?.length || 0} buses` : result.error}` });
    return result;
  }

  async getBusById(busId: string): Promise<ApiResponse<BusData>> {
    return this.makeRequest<BusData>(`/buses/${busId}`);
  }

  async createBus(busData: Omit<BusData, 'id'>): Promise<ApiResponse<BusData>> {
    return this.makeRequest<BusData>('/buses', {
      method: 'POST',
      body: JSON.stringify(busData),
    });
  }

  async updateBus(
    busId: string,
    busData: Partial<BusData>
  ): Promise<ApiResponse<BusData>> {
    return this.makeRequest<BusData>(`/buses/${busId}`, {
      method: 'PUT',
      body: JSON.stringify(busData),
    });
  }

  async deleteBus(busId: string): Promise<ApiResponse<BusData>> {
    return this.makeRequest<BusData>(`/buses/${busId}`, {
      method: 'DELETE',
    });
  }

  async getAllDrivers(): Promise<ApiResponse<DriverData[]>> {
    logger.info('👨‍💼 Fetching all drivers...', 'component');
    const result = await this.makeRequest<DriverData[]>('/drivers');
    logger.debug('Debug info', 'component', { data: `👨‍💼 Drivers result: ${result.success ? `${result.data?.length || 0} drivers` : result.error}` });
    return result;
  }

  async getAssignedDrivers(): Promise<ApiResponse<any[]>> {
    logger.info('🚌 Fetching assigned drivers...', 'component');
    const result = await this.makeRequest<any[]>('/production-assignments/assigned-drivers');
    logger.debug('Debug info', 'component', { data: `🚌 Assigned drivers result: ${result.success ? `${result.data?.length || 0} assigned drivers` : result.error}` });
    return result;
  }

  async getDriverById(driverId: string): Promise<ApiResponse<DriverData>> {
    return this.makeRequest<DriverData>(`/drivers/${driverId}`);
  }

  async assignDriverToBus(
    driverId: string,
    busId: string
  ): Promise<ApiResponse<BusData>> {
    return this.makeRequest<BusData>(`/drivers/${driverId}/assign-bus`, {
      method: 'POST',
      body: JSON.stringify({ busId }),
    });
  }

  async unassignDriverFromBus(
    driverId: string
  ): Promise<ApiResponse<BusData[]>> {
    return this.makeRequest<BusData[]>(`/drivers/${driverId}/unassign-bus`, {
      method: 'POST',
    });
  }

  async createDriver(
    driverData: Omit<
      DriverData,
      'id' | 'assigned_bus_id' | 'assigned_bus_plate'
    > & {
      password: string;
    }
  ): Promise<ApiResponse<DriverData>> {
    // PRODUCTION FIX: Use custom timeout for driver creation (Supabase auth can be slow)
    // Create a custom request with extended timeout
    let timeoutId: NodeJS.Timeout | undefined;
    
    try {
      const token = authService.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const controller = new AbortController();
      // Extended timeout for driver creation (30 seconds instead of 15)
      timeoutId = setTimeout(() => controller.abort(), 30000);

      const rawBaseUrl = API_BASE_URL || environment.api.baseUrl;
      const baseUrl = rawBaseUrl.replace(/\/+$/, '');
      const fullUrl = `${baseUrl}/admin/drivers`;
      
      logger.info('🌐 Creating driver (extended timeout)', 'admin-api', { 
        endpoint: '/drivers',
        fullUrl,
        method: 'POST'
      });

      const response = await fetch(fullUrl, {
        method: 'POST',
        body: JSON.stringify(driverData),
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const parseResult = await parseJsonResponse(response, null, '/drivers');
      
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse JSON response');
      }
      
      const data = parseResult.data;
      
      if (timeoutId) clearTimeout(timeoutId);

      // Handle 201 Created status code properly
      if (response.status === 201 || response.ok) {
        if (!data) {
          throw new Error('Driver creation succeeded but response payload was empty.');
        }
        logger.info('✅ Driver created successfully', 'admin-api', { 
          driverId: (data as any)?.data?.id,
          status: response.status
        });
        return data as ApiResponse<DriverData>;
      }

      // Handle error status codes
      if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else if (response.status === 409) {
        throw new Error((data as any)?.message || 'Driver already exists');
      } else if (response.status === 400) {
        throw new Error((data as any)?.message || (data as any)?.error || 'Invalid request');
      } else {
        throw new Error((data as any)?.message || (data as any)?.error || 'Request failed');
      }
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      
      // Check if it's a timeout error
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
        logger.error('❌ Driver creation timed out', 'admin-api', { error });
        return {
          success: false,
          error: 'Driver creation is taking longer than expected. The driver may have been created. Please refresh the page to verify.',
        };
      }
      
      logger.error(`❌ API request failed for /drivers:`, 'component', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  }

  async updateDriver(
    driverId: string,
    driverData: Partial<DriverData>
  ): Promise<ApiResponse<DriverData>> {
    return this.makeRequest<DriverData>(`/drivers/${driverId}`, {
      method: 'PUT',
      body: JSON.stringify(driverData),
    });
  }

  async deleteDriver(driverId: string): Promise<ApiResponse<DriverData>> {
    return this.makeRequest<DriverData>(`/drivers/${driverId}`, {
      method: 'DELETE',
    });
  }

  async getAllRoutes(): Promise<ApiResponse<RouteData[]>> {
    logger.info('🛣️ Fetching all routes...', 'component');
    const result = await this.makeRequest<RouteData[]>('/routes');
    logger.debug('Debug info', 'component', { data: `🛣️ Routes result: ${result.success ? `${result.data?.length || 0} routes` : result.error}` });
    return result;
  }

  async getRouteById(routeId: string): Promise<ApiResponse<RouteData>> {
    return this.makeRequest<RouteData>(`/routes/${routeId}`);
  }

  async createRoute(routeData: {
    name: string;
    description: string;
    distance_km: number;
    estimated_duration_minutes: number;
    is_active: boolean;
    city: string;
  }): Promise<ApiResponse<RouteData>> {
    return this.makeRequest<RouteData>('/routes', {
      method: 'POST',
      body: JSON.stringify(routeData),
    });
  }

  async updateRoute(
    routeId: string,
    routeData: Partial<{
      name: string;
      description: string;
      distance_km: number;
      estimated_duration_minutes: number;
      is_active: boolean;
      city: string;
      custom_destination?: string;
      custom_destination_coordinates?: [number, number];
      custom_origin?: string;
      custom_origin_coordinates?: [number, number];
      bus_stops?: any[];
      stops?: GeoJSON.LineString;
    }>
  ): Promise<ApiResponse<RouteData>> {
    return this.makeRequest<RouteData>(`/routes/${routeId}`, {
      method: 'PUT',
      body: JSON.stringify(routeData),
    });
  }

  async deleteRoute(routeId: string): Promise<ApiResponse<RouteData>> {
    return this.makeRequest<RouteData>(`/routes/${routeId}`, {
      method: 'DELETE',
    });
  }

  async getAllAssignments(): Promise<ApiResponse<any[]>> {
    logger.info('🔗 Fetching all assignments...', 'component');
    const result = await this.makeRequest<any[]>('/production-assignments');
    logger.debug('Debug info', 'component', { data: `🔗 Assignments result: ${result.success ? `${result.data?.length || 0} assignments` : result.error}` });
    return result;
  }

  async getAssignmentStatus(): Promise<ApiResponse<any>> {
    logger.info('📊 Fetching assignment status...', 'component');
    const result = await this.makeRequest<any>('/production-assignments/dashboard');
    logger.debug('Debug info', 'component', { data: `📊 Assignment status result: ${result.success ? 'Status loaded' : result.error}` });
    return result;
  }

  async getAssignmentByBus(busId: string): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(`/production-assignments/bus/${busId}`);
  }

  async getMyAssignment(): Promise<ApiResponse<any>> {
    logger.info('🔗 Fetching driver assignment...', 'component');
    const result = await this.makeRequest<any>('/production-assignments/my-assignment');
    logger.debug('Debug info', 'component', { data: `🔗 Driver assignment result: ${result.success ? 'Assignment loaded' : result.error}` });
    return result;
  }

  async getAssignmentHistory(busId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>(`/production-assignments/bus/${busId}/history`);
  }

  async createAssignment(assignmentData: {
    driver_id: string;
    bus_id: string;
    route_id: string;
    shift_id?: string;
    notes?: string;
  }): Promise<ApiResponse<any>> {
    return this.makeRequest<any>('/production-assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  async updateAssignment(
    busId: string,
    assignmentData: {
      driver_id?: string;
      route_id?: string;
      shift_id?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(`/production-assignments/bus/${busId}`, {
      method: 'PUT',
      body: JSON.stringify(assignmentData),
    });
  }

  async removeAssignment(busId: string, notes?: string): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(`/production-assignments/bus/${busId}`, {
      method: 'DELETE',
      body: JSON.stringify({ notes }),
    });
  }

  async validateAssignment(assignmentData: {
    driver_id: string;
    bus_id: string;
    route_id: string;
  }): Promise<ApiResponse<any>> {
    return this.makeRequest<any>('/production-assignments/validate', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  async bulkAssignDrivers(assignments: Array<{
    driver_id: string;
    bus_id: string;
    route_id: string;
    notes?: string;
  }>): Promise<ApiResponse<any>> {
    return this.makeRequest<any>('/production-assignments/bulk', {
      method: 'POST',
      body: JSON.stringify({ assignments }),
    });
  }

  async getRouteStops(routeId: string): Promise<ApiResponse<Array<{ id: string; route_id: string; stop_id?: string; name?: string; sequence: number; is_active?: boolean }>>> {
    return this.makeRequest(`/route-stops?routeId=${encodeURIComponent(routeId)}`);
  }

  async createRouteStop(routeId: string, stop: { name: string; sequence?: number; latitude?: number; longitude?: number; is_active?: boolean }): Promise<ApiResponse<any>> {
    return this.makeRequest('/route-stops', {
      method: 'POST',
      body: JSON.stringify({ route_id: routeId, ...stop }),
    });
  }

  async updateRouteStop(id: string, stop: Partial<{ name: string; sequence: number; latitude?: number; longitude?: number; is_active?: boolean }>): Promise<ApiResponse<any>> {
    return this.makeRequest(`/route-stops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(stop),
    });
  }

  async deleteRouteStop(id: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/route-stops/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderRouteStops(routeId: string, orderedIds: string[]): Promise<ApiResponse<any>> {
    return this.makeRequest('/route-stops/reorder', {
      method: 'POST',
      body: JSON.stringify({ route_id: routeId, ordered_ids: orderedIds }),
    });
  }
}

export const adminApiService = new AdminApiService();
export default adminApiService;

