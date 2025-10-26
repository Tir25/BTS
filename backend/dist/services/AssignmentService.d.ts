export interface AssignmentData {
    id?: string;
    driver_id: string;
    bus_id: string;
    route_id: string;
    assigned_by: string;
    notes?: string;
    assigned_at?: string;
}
export interface AssignmentStatus {
    total_assignments: number;
    active_assignments: number;
    unassigned_buses: number;
    unassigned_drivers: number;
}
export interface AssignmentValidation {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
}
export declare class AssignmentService {
    static getAllAssignments(): Promise<any[]>;
    static getAssignmentStatus(): Promise<AssignmentStatus>;
    static getAssignmentByBus(busId: string): Promise<AssignmentData | null>;
    static getAssignmentHistory(busId: string): Promise<any[]>;
    static createAssignment(assignmentData: Omit<AssignmentData, 'id' | 'assigned_at'>): Promise<any>;
    static updateAssignment(busId: string, updateData: Partial<Omit<AssignmentData, 'id' | 'assigned_at'>>): Promise<any>;
    static removeAssignment(busId: string, assignedBy: string, notes?: string): Promise<boolean>;
    static validateAssignment(driverId: string, busId: string, routeId: string): Promise<AssignmentValidation>;
    static bulkAssignDrivers(assignments: Array<Omit<AssignmentData, 'id' | 'assigned_at'>>): Promise<any[]>;
}
//# sourceMappingURL=AssignmentService.d.ts.map