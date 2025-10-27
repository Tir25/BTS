export interface BackendDriverVerificationResult {
    database: {
        connection: boolean;
        tablesExist: boolean;
        error?: string;
    };
    driverProfiles: {
        totalDrivers: number;
        activeDrivers: number;
        assignedDrivers: number;
        unassignedDrivers: number;
        error?: string;
    };
    busAssignments: {
        totalBuses: number;
        assignedBuses: number;
        unassignedBuses: number;
        assignments: Array<{
            bus_id: string;
            bus_number: string;
            driver_id: string;
            driver_name: string;
            route_id: string;
            route_name: string;
        }>;
        error?: string;
    };
    assignmentService: {
        getAllAssignments: boolean;
        validateAssignment: boolean;
        error?: string;
    };
    locationService: {
        getDriverBusInfo: boolean;
        error?: string;
    };
}
export declare class BackendDriverVerificationService {
    private static instance;
    static getInstance(): BackendDriverVerificationService;
    verifyBackendDriverSystem(): Promise<BackendDriverVerificationResult>;
    private verifyDatabase;
    private verifyDriverProfiles;
    private verifyBusAssignments;
    private verifyAssignmentService;
    private verifyLocationService;
    getVerificationSummary(result: BackendDriverVerificationResult): string;
    isBackendReady(result: BackendDriverVerificationResult): boolean;
}
export declare const backendDriverVerificationService: BackendDriverVerificationService;
export default backendDriverVerificationService;
//# sourceMappingURL=BackendDriverVerificationService.d.ts.map