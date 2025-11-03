export declare class TrackingService {
    static startTracking(driverId: string, shiftId?: string): Promise<{
        id: any;
    }>;
    static stopTracking(driverId: string): Promise<{
        success: boolean;
    }>;
    static stopReached(driverId: string, routeStopId: string): Promise<{
        success: boolean;
        last_stop_sequence: any;
    }>;
    static getDriverAssignmentWithStops(driverId: string): Promise<{
        route_id: string;
        bus_id: string;
        shift_id: any;
        shift_name: string | null;
        tracking_active: boolean;
        stops: {
            completed: {
                id: any;
                name: any;
                sequence: any;
            }[];
            next: {
                id: any;
                name: any;
                sequence: any;
            };
            remaining: {
                id: any;
                name: any;
                sequence: any;
            }[];
        };
    } | null>;
}
//# sourceMappingURL=TrackingService.d.ts.map