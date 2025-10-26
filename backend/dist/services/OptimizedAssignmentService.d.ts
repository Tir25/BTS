export interface OptimizedAssignmentData {
    id: string;
    driver_id: string;
    bus_id: string;
    route_id: string;
    assigned_by: string;
    notes?: string;
    assigned_at: string;
    status: 'active' | 'inactive' | 'pending';
    driver: {
        id: string;
        full_name: string;
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
    };
    bus: {
        id: string;
        bus_number: string;
        vehicle_no: string;
        capacity: number;
        model: string;
        year: number;
    };
    route: {
        id: string;
        name: string;
        description: string;
        city: string;
    };
}
export interface OptimizedDashboard {
    total_assignments: number;
    active_assignments: number;
    unassigned_drivers: number;
    unassigned_buses: number;
    unassigned_routes: number;
    pending_assignments: number;
    recent_assignments: OptimizedAssignmentData[];
    statistics: {
        driver_utilization: number;
        bus_utilization: number;
        route_utilization: number;
    };
}
export declare class OptimizedAssignmentService {
    private static readonly CACHE_TTL;
    private static readonly CACHE_PREFIX;
    static getAllAssignments(): Promise<OptimizedAssignmentData[]>;
    static getAssignmentDashboard(): Promise<OptimizedDashboard>;
    static getAssignmentByBus(busId: string): Promise<OptimizedAssignmentData | null>;
    static getAvailableDrivers(): Promise<any[]>;
    static getAvailableBuses(): Promise<any[]>;
    static getAvailableRoutes(): Promise<any[]>;
    static invalidateCache(): Promise<void>;
    static getAssignmentStatistics(): Promise<{
        totalAssignments: number;
        activeAssignments: number;
        driverUtilization: number;
        busUtilization: number;
        routeUtilization: number;
        averageAssignmentAge: number;
    }>;
}
//# sourceMappingURL=OptimizedAssignmentService.d.ts.map