import { authService } from './authService';
import { environment } from '../config/environment';

const API_BASE_URL = environment.api.url;

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
  number_plate: string;
  capacity: number;
  model?: string;
  year?: number;
  is_active: boolean;
  assigned_driver_id?: string;
  route_id?: string;
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
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      const token = authService.getAccessToken();
      console.log(
        '🔑 Token check for',
        endpoint,
        ':',
        token ? 'Token exists' : 'No token'
      );

      if (!token) {
        console.error('❌ No access token available for', endpoint);
        throw new Error('No access token available');
      }

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(`${API_BASE_URL}/admin${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      const data = await response.json();
      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          throw new Error(
            'Rate limit exceeded. Please wait a moment and try again.'
          );
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 403) {
          throw new Error(
            'Access denied. You do not have permission for this action.'
          );
        } else if (response.status === 404) {
          throw new Error('Resource not found.');
        } else if (response.status === 409) {
          throw new Error(data.message || 'Resource already exists');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(data.message || data.error || 'Request failed');
        }
      }

      return data;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error(`❌ API request failed for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  }

  // ===== ANALYTICS ENDPOINTS =====

  async getAnalytics(): Promise<ApiResponse<AnalyticsData>> {
    return this.makeRequest<AnalyticsData>('/analytics');
  }

  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    return this.makeRequest<SystemHealth>('/health');
  }

  // ===== BUS MANAGEMENT ENDPOINTS =====

  async getAllBuses(): Promise<ApiResponse<BusData[]>> {
    console.log('🚌 Fetching all buses...');
    const result = await this.makeRequest<BusData[]>('/buses');
    console.log(
      '🚌 Buses result:',
      result.success ? `${result.data?.length || 0} buses` : result.error
    );
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

  // ===== DRIVER MANAGEMENT ENDPOINTS =====

  async getAllDrivers(): Promise<ApiResponse<DriverData[]>> {
    console.log('👨‍💼 Fetching all drivers...');
    const result = await this.makeRequest<DriverData[]>('/drivers');
    console.log(
      '👨‍💼 Drivers result:',
      result.success ? `${result.data?.length || 0} drivers` : result.error
    );
    return result;
  }

  async getAssignedDrivers(): Promise<ApiResponse<any[]>> {
    console.log('🚌 Fetching assigned drivers...');
    const result = await this.makeRequest<any[]>('/assigned-drivers');
    console.log(
      '🚌 Assigned drivers result:',
      result.success
        ? `${result.data?.length || 0} assigned drivers`
        : result.error
    );
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
    return this.makeRequest<DriverData>('/drivers', {
      method: 'POST',
      body: JSON.stringify(driverData),
    });
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

  // ===== ROUTE MANAGEMENT ENDPOINTS =====

  async getAllRoutes(): Promise<ApiResponse<RouteData[]>> {
    console.log('🛣️ Fetching all routes...');
    const result = await this.makeRequest<RouteData[]>('/routes');
    console.log(
      '🛣️ Routes result:',
      result.success ? `${result.data?.length || 0} routes` : result.error
    );
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
}

export const adminApiService = new AdminApiService();
export default adminApiService;
