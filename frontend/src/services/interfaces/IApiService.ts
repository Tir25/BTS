export interface IApiService {
  getHealth(): Promise<any>;
  getAllBuses(): Promise<{
    success: boolean;
    data: any[];
    timestamp: string;
  }>;
  getBusInfo(busId: string): Promise<{
    success: boolean;
    data: any | null;
  }>;
  getRoutes(): Promise<{
    success: boolean;
    data: any[];
  }>;
}
