import { authService } from './authService';
import { supabase } from '../config/supabase';
import { HealthResponse, Bus, Route, Driver } from '../types';
import { environment } from '../config/environment';

const API_BASE_URL = environment.api.url;

class ApiService {
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

  // Route operations (Supabase)
  async getRoutes(): Promise<{
    success: boolean;
    data: Route[];
    timestamp: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching routes:', error);
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString(),
      };
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
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('id', routeId)
        .single();

      if (error) {
        console.error('❌ Error fetching route info:', error);
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error in getRouteInfo:', error);
      return {
        success: false,
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Driver operations (Supabase)
  async getAllDrivers(): Promise<{
    success: boolean;
    data: Driver[];
    timestamp: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'driver')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching drivers:', error);
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString(),
      };
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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', driverId)
        .eq('role', 'driver')
        .single();

      if (error) {
        console.error('❌ Error fetching driver info:', error);
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error in getDriverInfo:', error);
      return {
        success: false,
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Live location operations (Supabase)
  async getLiveLocations(): Promise<{
    success: boolean;
    data: unknown[];
    timestamp: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('live_locations')
        .select(
          `
          *,
          bus:buses!live_locations_bus_id_fkey (
            id,
            bus_number,
            capacity,
            bus_image_url
          ),
          driver:users!live_locations_driver_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `
        )
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching live locations:', error);
        return {
          success: false,
          data: [],
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString(),
      };
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
      const { data, error } = await supabase
        .from('live_locations')
        .upsert({
          bus_id: busId,
          driver_id: driverId,
          latitude: location.latitude,
          longitude: location.longitude,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating live location:', error);
        return {
          success: false,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString(),
      };
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
