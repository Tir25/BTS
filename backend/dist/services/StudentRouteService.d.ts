export declare class StudentRouteService {
    static getRouteStatus(routeId: string, opts?: {
        shiftId?: string;
    }): Promise<{
        tracking_active: boolean;
        stops: {
            completed: never[];
            next: null;
            remaining: never[];
        };
        session?: undefined;
    } | {
        tracking_active: boolean;
        session: {
            id: any;
            driver_id: any;
            bus_id: any;
            shift_id: any;
            started_at: any;
        };
        stops: {
            completed: any;
            next: any;
            remaining: any;
        };
    }>;
    static getRouteStops(routeId: string): Promise<any>;
    static getActiveRoutesByShift(opts: {
        shiftId?: string;
        shiftName?: string;
    }): Promise<any>;
    static getRoutesByShift(opts: {
        shiftId?: string;
        shiftName?: string;
    }): Promise<any[]>;
}
//# sourceMappingURL=StudentRouteService.d.ts.map