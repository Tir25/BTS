const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface HealthResponse {
  status: string;
  timestamp: string;
  database: {
    status: string;
    details?: any;
  };
  environment: string;
}

export interface BusInfo {
  bus_id: string;
  bus_number: string;
  route_id: string;
  route_name: string;
  driver_id: string;
  driver_name: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  async getAllBuses(): Promise<{ success: boolean; data: BusInfo[]; timestamp: string }> {
    return this.request<{ success: boolean; data: BusInfo[]; timestamp: string }>('/buses');
  }

  async getBusInfo(busId: string): Promise<{ success: boolean; data: BusInfo; timestamp: string }> {
    return this.request<{ success: boolean; data: BusInfo; timestamp: string }>(`/buses/${busId}`);
  }
}

export const apiService = new ApiService(API_BASE_URL);

