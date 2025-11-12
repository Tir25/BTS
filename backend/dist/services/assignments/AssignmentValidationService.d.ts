export interface AssignmentValidation {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
    conflicts: string[];
}
export declare class AssignmentValidationService {
    static fetchShiftDetails(shiftId: string | null): Promise<{
        id: string;
        name: string | null;
        start_time: string | null;
        end_time: string | null;
    } | null>;
    static validateAssignment(driverId: string, busId: string, routeId: string): Promise<AssignmentValidation>;
}
//# sourceMappingURL=AssignmentValidationService.d.ts.map