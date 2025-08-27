import { authService } from './authService';
import { HealthResponse, Bus, Route, Driver } from '../types';
import { environment } from '../config/environment';

const API_BASE_URL = environment.api.url;

import { IApiService } from './interfaces/IApiService';

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
    const url = `${this.baseUrl}${endpoint}`;

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

    const response = await fetch(url, {
      headers,
      ...options,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  // Health check
  async getHealth(): Promise<HealthResponse> {
    return this.backendRequest<HealthResponse>('/health');
  }

  // Bus operations (Supabase)
  async getAllBuses(): Promise<{
    success: boolean;
    data: Bus[];
    timestamp: string;
  }> {
    try {
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<{
        success: boolean;
        data: Bus[];
        error?: string;
        timestamp: string;
      }>('/buses');

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        console.error('❌ Error fetching buses from backend:', response.error);
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Error in getAllBuses:', error);
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
        console.error(
          '❌ Error fetching bus info from backend:',
          response.error
        );
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Error in getBusInfo:', error);
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
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<{
        success: boolean;
        data: Route[];
        error?: string;
        timestamp: string;
      }>('/routes');

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        console.error('❌ Error fetching routes from backend:', response.error);
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Error in getRoutes:', error);
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
        console.error('❌ Error fetching route info from backend:', response.error);
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Error in getRouteInfo:', error);
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
        console.error('❌ Error fetching drivers from backend:', response.error);
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Error in getAllDrivers:', error);
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
        console.error('❌ Error fetching driver info from backend:', response.error);
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Error in getDriverInfo:', error);
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
    data: unknown[];
    timestamp: string;
  }> {
    try {
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<{
        success: boolean;
        data: unknown[];
        error?: string;
        timestamp: string;
      }>('/locations/current');

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        console.error('❌ Error fetching live locations from backend:', response.error);
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Error in getLiveLocations:', error);
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
    location: { latitude: number; longitude: number }
  ): Promise<{
    success: boolean;
    data: unknown | null;
    timestamp: string;
  }> {
    try {
      // Use backend API instead of direct Supabase call
      const response = await this.backendRequest<{
        success: boolean;
        data: unknown;
        error?: string;
        timestamp: string;
      }>('/locations/update', {
        method: 'POST',
        body: JSON.stringify({
          busId,
          driverId,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        console.error('❌ Error updating live location via backend:', response.error);
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Error in updateLiveLocation:', error);
      return {
        success: false,
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const apiService = new ApiService(API_BASE_URL);
export default apiService;
