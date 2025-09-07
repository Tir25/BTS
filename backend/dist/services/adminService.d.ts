export interface BusData {
    id?: string;
    code: string;
    number_plate: string;
    capacity: number;
    model?: string;
    year?: number;
    bus_image_url?: string;
    assigned_driver_id?: string;
    route_id?: string;
    is_active?: boolean;
}
export interface DriverData {
    id?: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    profile_photo_url?: string;
    role: 'driver';
}
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
export declare class AdminService {
    static getAllBuses(): Promise<any[]>;
    static getBusById(busId: string): Promise<any>;
    static createBus(busData: BusData): Promise<any>;
    static updateBus(busId: string, busData: Partial<BusData>): Promise<any>;
    static deleteBus(busId: string): Promise<any>;
    static getAllDrivers(): Promise<any[]>;
    static getAssignedDrivers(): Promise<any[]>;
    static getDriverById(driverId: string): Promise<any>;
    static assignDriverToBus(driverId: string, busId: string): Promise<any>;
    static unassignDriverFromBus(driverId: string): Promise<any[]>;
    static createDriver(driverData: DriverData & {
        password: string;
    }): Promise<any>;
    static updateDriver(driverId: string, driverData: Partial<DriverData>): Promise<any>;
    static deleteDriver(driverId: string): Promise<any>;
    static getAnalytics(): Promise<AnalyticsData>;
    static getSystemHealth(): Promise<{
        buses: number;
        routes: number;
        drivers: number;
        recentLocations: number;
        timestamp: string;
    }>;
    static getAllRoutes(): Promise<any[]>;
    static getRouteById(routeId: string): Promise<any>;
    static createRoute(routeData: {
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
        bus_stops?: Array<{
            id: string;
            name: string;
            location: string;
            stop_order: number;
        }>;
        stops?: Array<{
            id: string;
            name: string;
            geom: string;
            seq: number;
        }>;
    }): Promise<any>;
    static updateRoute(routeId: string, routeData: {
        name?: string;
        description?: string;
        distance_km?: number;
        estimated_duration_minutes?: number;
        is_active?: boolean;
        city?: string;
        custom_destination?: string;
        custom_destination_coordinates?: [number, number];
        custom_origin?: string;
        custom_origin_coordinates?: [number, number];
        bus_stops?: Array<{
            id: string;
            name: string;
            location: string;
            stop_order: number;
        }>;
        stops?: Array<{
            id: string;
            name: string;
            geom: string;
            seq: number;
        }>;
    }): Promise<any>;
    static deleteRoute(routeId: string): Promise<any>;
    static calculateRouteETA(routeId: string, currentLocation: [number, number]): Promise<number>;
    private static calculateDistance;
    static getDefaultDestination(): Promise<any>;
    static clearAllData(): Promise<{
        deletedBuses: number;
        deletedRoutes: number;
        deletedDrivers: number;
        deletedLocations: number;
        totalDeleted: number;
    }>;
}
//# sourceMappingURL=adminService.d.ts.map