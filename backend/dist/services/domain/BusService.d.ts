export interface BusData {
    id?: string;
    code: string;
    number_plate: string;
    capacity: number;
    model?: string;
    year?: number;
    bus_image_url?: string;
    assigned_driver_id?: string;
    route_id?: string;
    is_active?: boolean;
}
export interface BusWithDriver {
    id: string;
    code: string;
    number_plate: string;
    capacity: number;
    model?: string;
    year?: number;
    bus_image_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    driver_id?: string;
    driver_full_name?: string;
    driver_email?: string;
    driver_first_name?: string;
    driver_last_name?: string;
    route_id?: string;
    route_name?: string;
}
export declare class BusService {
    static getAllBuses(): Promise<BusWithDriver[]>;
    static getBusById(busId: string): Promise<BusWithDriver | null>;
    static createBus(busData: BusData): Promise<BusWithDriver>;
    static updateBus(busId: string, busData: Partial<BusData>): Promise<BusWithDriver | null>;
    static deleteBus(busId: string): Promise<BusWithDriver | null>;
    static assignDriverToBus(busId: string, driverId: string): Promise<BusWithDriver | null>;
    static unassignDriverFromBus(driverId: string): Promise<BusWithDriver[]>;
    static getBusesByRoute(routeId: string): Promise<BusWithDriver[]>;
}
//# sourceMappingURL=BusService.d.ts.map