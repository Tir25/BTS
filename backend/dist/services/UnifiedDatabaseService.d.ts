export interface BusData {
    id?: string;
    bus_number: string;
    vehicle_no: string;
    capacity: number;
    model?: string;
    year?: number;
    bus_image_url?: string;
    assigned_driver_profile_id?: string;
    route_id?: string;
    is_active?: boolean;
}
export interface BusWithDriver {
    id: string;
    bus_number: string;
    vehicle_no: string;
    capacity: number;
    model?: string;
    year?: number;
    bus_image_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    driver_id?: string;
    driver_full_name?: string;
    driver_email?: string;
    driver_first_name?: string;
    driver_last_name?: string;
    route_id?: string;
    route_name?: string;
}
export interface DriverData {
    id?: string;
    email: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    role: string;
    is_driver?: boolean;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}
export interface RouteData {
    id?: string;
    name: string;
    description?: string;
    origin?: string;
    destination?: string;
    is_active?: boolean;
}
export declare class UnifiedDatabaseService {
    static getAllBuses(): Promise<BusWithDriver[]>;
    static getBusById(busId: string): Promise<BusWithDriver | null>;
    static createBus(busData: BusData): Promise<BusWithDriver>;
    static updateBus(busId: string, busData: Partial<BusData>): Promise<BusWithDriver | null>;
    static deleteBus(busId: string): Promise<BusWithDriver | null>;
    static getAllDrivers(): Promise<DriverData[]>;
    static getAllRoutes(): Promise<RouteData[]>;
    static getDriverById(driverId: string): Promise<DriverData | null>;
    static createDriver(driverData: any): Promise<DriverData>;
    static updateDriver(driverId: string, driverData: Partial<DriverData>): Promise<DriverData | null>;
    static deleteDriver(driverId: string): Promise<DriverData | null>;
    static cleanupInactiveDrivers(): Promise<{
        cleaned: number;
        errors: string[];
    }>;
}
//# sourceMappingURL=UnifiedDatabaseService.d.ts.map