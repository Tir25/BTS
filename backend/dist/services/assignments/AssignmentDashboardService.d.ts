export interface AssignmentData {
    id?: string;
    driver_id: string;
    bus_id: string;
    route_id: string;
    shift_id?: string | null;
    shift_name?: string | null;
    shift_start_time?: string | null;
    shift_end_time?: string | null;
    assigned_by: string;
    notes?: string;
    assigned_at?: string;
    status: 'active' | 'inactive' | 'pending';
    bus_number?: string;
    vehicle_no?: string;
    route_name?: string;
    driver_name?: string;
}
export interface AssignmentDashboard {
    total_assignments: number;
    active_assignments: number;
    unassigned_drivers: number;
    unassigned_buses: number;
    unassigned_routes: number;
    pending_assignments: number;
    recent_assignments: AssignmentData[];
}
export declare class AssignmentDashboardService {
    static getAllAssignments(): Promise<AssignmentData[]>;
    static getAssignmentDashboard(): Promise<AssignmentDashboard>;
    static getAssignmentByBus(busId: string): Promise<AssignmentData | null>;
    static getDriverAssignment(driverId: string): Promise<AssignmentData | null>;
    static getAvailableDrivers(): Promise<any[]>;
    static getAvailableBuses(): Promise<any[]>;
    static getAvailableRoutes(): Promise<any[]>;
    static getAssignedDrivers(): Promise<any[]>;
    static getAssignmentHistory(busId: string): Promise<any[]>;
}
//# sourceMappingURL=AssignmentDashboardService.d.ts.map