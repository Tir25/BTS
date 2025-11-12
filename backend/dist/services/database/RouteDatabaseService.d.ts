export interface RouteDatabaseData {
    id: string;
    name: string;
    description: string | null;
    distance_km: number;
    estimated_duration_minutes: number;
    city: string | null;
    custom_origin: string | null;
    custom_destination: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    assigned_buses_count?: number;
}
export declare class RouteDatabaseService {
    static getAllRoutes(): Promise<RouteDatabaseData[]>;
}
//# sourceMappingURL=RouteDatabaseService.d.ts.map