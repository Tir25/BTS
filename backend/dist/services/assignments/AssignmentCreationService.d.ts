import { AssignmentData } from './AssignmentDashboardService';
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
export declare class AssignmentCreationService {
    static createAssignment(assignmentData: Omit<AssignmentData, 'id' | 'assigned_at'>): Promise<AssignmentData>;
    static updateAssignment(busId: string, updateData: Partial<Omit<AssignmentData, 'id' | 'assigned_at'>>): Promise<AssignmentData>;
    static removeAssignment(busId: string, assignedBy: string, notes?: string): Promise<boolean>;
    static bulkAssignDrivers(assignments: Array<Omit<AssignmentData, 'id' | 'assigned_at'>>): Promise<BulkAssignmentResult>;
}
//# sourceMappingURL=AssignmentCreationService.d.ts.map