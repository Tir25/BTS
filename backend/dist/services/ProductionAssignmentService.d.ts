export interface AssignmentData {
    id?: string;
    driver_id: string;
    bus_id: string;
    route_id: string;
    assigned_by: string;
    notes?: string;
    assigned_at?: string;
    status: 'active' | 'inactive' | 'pending';
}
export interface AssignmentValidation {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
    conflicts: string[];
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
export interface BulkAssignmentResult {
    success: boolean;
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{
        assignment: Partial<AssignmentData>;
        error: string;
    }>;
}
export declare class ProductionAssignmentService {
    static getAllAssignments(): Promise<AssignmentData[]>;
    static getAssignmentDashboard(): Promise<AssignmentDashboard>;
    static createAssignment(assignmentData: Omit<AssignmentData, 'id' | 'assigned_at'>): Promise<AssignmentData>;
    static updateAssignment(busId: string, updateData: Partial<Omit<AssignmentData, 'id' | 'assigned_at'>>): Promise<AssignmentData>;
    static removeAssignment(busId: string, assignedBy: string, notes?: string): Promise<boolean>;
    static getAssignmentByBus(busId: string): Promise<AssignmentData | null>;
    static validateAssignment(driverId: string, busId: string, routeId: string): Promise<AssignmentValidation>;
    static bulkAssignDrivers(assignments: Array<Omit<AssignmentData, 'id' | 'assigned_at'>>): Promise<BulkAssignmentResult>;
    static getAssignmentHistory(busId: string): Promise<any[]>;
    static getAvailableDrivers(): Promise<any[]>;
    static getAvailableBuses(): Promise<any[]>;
    static getAvailableRoutes(): Promise<any[]>;
    static getAssignedDrivers(): Promise<any[]>;
}
//# sourceMappingURL=ProductionAssignmentService.d.ts.map