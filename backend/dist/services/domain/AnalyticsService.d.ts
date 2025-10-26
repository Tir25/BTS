export interface AnalyticsData {
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
export interface SystemHealth {
    database: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        responseTime: number;
        connectionCount: number;
    };
    services: {
        websocket: 'healthy' | 'degraded' | 'unhealthy';
        api: 'healthy' | 'degraded' | 'unhealthy';
    };
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    buses: number;
    routes: number;
    drivers: number;
    recentLocations: number;
}
export declare class AnalyticsService {
    static getAnalytics(): Promise<AnalyticsData>;
    static getSystemHealth(): Promise<SystemHealth>;
    static getBusPerformanceMetrics(busId?: string): Promise<{
        totalTrips: number;
        onTimeTrips: number;
        delayedTrips: number;
        averageDelay: number;
        reliability: number;
    }>;
    static getRoutePerformanceMetrics(routeId?: string): Promise<{
        totalTrips: number;
        averageDuration: number;
        averageDelay: number;
        popularity: number;
    }>;
}
//# sourceMappingURL=AnalyticsService.d.ts.map