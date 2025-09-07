import { HealthResponse, Bus, Route } from '../../types';

export interface IApiService {
  getHealth(): Promise<HealthResponse>;
  getAllBuses(): Promise<{
    success: boolean;
    data: Bus[];
    timestamp: string;
  }>;
  getBusInfo(busId: string): Promise<{
    success: boolean;
    data: Bus | null;
  }>;
  getRoutes(): Promise<{
    success: boolean;
    data: Route[];
  }>;
}
