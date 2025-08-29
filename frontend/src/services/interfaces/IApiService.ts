import { HealthResponse, Bus, Route, Driver, BusLocation } from '../../types';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
  message?: string;
}

export interface IApiService {
  getHealth(): Promise<HealthResponse>;
  
  getAllBuses(): Promise<ApiResponse<Bus[]>>;
  
  getBusInfo(busId: string): Promise<ApiResponse<Bus | null>>;
  
  getRoutes(): Promise<ApiResponse<Route[]>>;
  
  getRouteInfo(routeId: string): Promise<ApiResponse<Route | null>>;
  
  getAllDrivers(): Promise<ApiResponse<Driver[]>>;
  
  getDriverInfo(driverId: string): Promise<ApiResponse<Driver | null>>;
  
  getLiveLocations(): Promise<ApiResponse<BusLocation[]>>;
  
  updateLiveLocation(
    busId: string,
    driverId: string,
    location: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
    }
  ): Promise<ApiResponse<BusLocation | null>>;
}
