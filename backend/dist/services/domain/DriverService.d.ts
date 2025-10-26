export interface DriverData {
    id?: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    profile_photo_url?: string;
    role: 'driver';
}
export interface DriverWithBus {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    profile_photo_url?: string;
    role: string;
    created_at: string;
    updated_at: string;
    assigned_bus_id?: string;
    assigned_route_id?: string;
    assigned_at?: string;
    bus_code?: string;
    bus_number_plate?: string;
    route_name?: string;
}
export declare class DriverService {
    static getAllDrivers(): Promise<DriverWithBus[]>;
    static getDriverById(driverId: string): Promise<DriverWithBus | null>;
    static getAssignedDrivers(): Promise<DriverWithBus[]>;
    static createDriver(driverData: DriverData): Promise<DriverWithBus>;
    static updateDriver(driverId: string, driverData: Partial<DriverData>): Promise<DriverWithBus | null>;
    static deleteDriver(driverId: string): Promise<DriverWithBus | null>;
    static getDriverStats(): Promise<{
        totalDrivers: number;
        activeDrivers: number;
        assignedDrivers: number;
        unassignedDrivers: number;
    }>;
}
//# sourceMappingURL=DriverService.d.ts.map