export declare class TrackingService {
    static startTracking(driverId: string, shiftId?: string): Promise<any>;
    static stopTracking(driverId: string): Promise<{
        success: boolean;
    }>;
    static stopReached(driverId: string, routeStopId: string): Promise<{
        success: boolean;
        last_stop_sequence: any;
        route_id: any;
        stop_id: string;
    }>;
    static getDriverAssignmentWithStops(driverId: string): Promise<{
        route_id: string;
        bus_id: string;
        route_name: string | null;
        shift_id: any;
        shift_name: string | null;
        shift_start_time: string | null;
        shift_end_time: string | null;
        tracking_active: boolean;
        stops: {
            completed: any;
            next: any;
            remaining: any;
        };
    } | null>;
}
//# sourceMappingURL=TrackingService.d.ts.map