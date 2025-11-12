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
    buses: number;
    routes: number;
    drivers: number;
    recentLocations: number;
    timestamp: string;
}
export declare class ConsolidatedAdminService {
    static getAllBuses(): Promise<import("./database/BusDatabaseService").BusWithDriver[]>;
    static getBusById(busId: string): Promise<import("./database/BusDatabaseService").BusWithDriver | null>;
    static createBus(busData: any): Promise<import("./database/BusDatabaseService").BusWithDriver>;
    static updateBus(busId: string, busData: any): Promise<import("./database/BusDatabaseService").BusWithDriver | null>;
    static deleteBus(busId: string): Promise<import("./database/BusDatabaseService").BusWithDriver | null>;
    static getAllDrivers(): Promise<import("./database/DriverDatabaseService").DriverData[]>;
    static getDriverById(driverId: string): Promise<import("./database/DriverDatabaseService").DriverData | null>;
    static createDriver(driverData: any): Promise<import("./database/DriverDatabaseService").DriverData>;
    static updateDriver(driverId: string, driverData: any): Promise<import("./database/DriverDatabaseService").DriverData | null>;
    static deleteDriver(driverId: string): Promise<import("./database/DriverDatabaseService").DriverData | null>;
    static cleanupInactiveDrivers(): Promise<{
        cleaned: number;
        errors: string[];
    }>;
    static getAllRoutes(): Promise<import("./routes/RouteQueryService").RouteWithGeoJSON[]>;
    static getRouteById(routeId: string): Promise<import("./routes/RouteQueryService").RouteWithGeoJSON | null>;
    static createRoute(routeData: any): Promise<import("./routes/RouteQueryService").RouteWithGeoJSON>;
    static updateRoute(routeId: string, routeData: any): Promise<import("./routes/RouteQueryService").RouteWithGeoJSON | null>;
    static deleteRoute(routeId: string): Promise<import("./routes/RouteQueryService").RouteWithGeoJSON | null>;
    static getAnalytics(): Promise<AnalyticsData>;
    static getSystemHealth(): Promise<SystemHealth>;
    static clearAllData(): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=ConsolidatedAdminService.d.ts.map