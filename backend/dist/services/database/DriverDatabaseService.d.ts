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
export declare class DriverDatabaseService {
    static getAllDrivers(): Promise<DriverData[]>;
    static getDriverById(driverId: string): Promise<DriverData | null>;
    static createDriver(driverData: any): Promise<DriverData>;
    static updateDriver(driverId: string, driverData: Partial<DriverData>): Promise<DriverData | null>;
    static deleteDriver(driverId: string): Promise<DriverData | null>;
    static cleanupInactiveDrivers(): Promise<{
        cleaned: number;
        errors: string[];
    }>;
}
//# sourceMappingURL=DriverDatabaseService.d.ts.map