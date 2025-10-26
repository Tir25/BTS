interface LocationData {
    driverId: string;
    busId: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
    heading?: number;
}
interface BusInfo {
    bus_id: string;
    bus_number: string;
    route_id: string;
    route_name: string;
    driver_id: string;
    driver_name: string;
    assigned_driver_id?: string;
    route_city?: string;
    bus_image_url?: string | null;
}
interface SavedLocation {
    id: string;
    driver_id: string;
    bus_id: string;
    location: string;
    timestamp: string;
    speed?: number;
    heading?: number;
}
export declare const saveLocationUpdate: (data: LocationData) => Promise<SavedLocation | null>;
export declare const getDriverBusInfo: (driverId: string) => Promise<BusInfo | null>;
export declare const getCurrentBusLocations: () => Promise<SavedLocation[]>;
export declare const getBusLocationHistory: (busId: string, startTime: string, endTime: string) => Promise<SavedLocation[]>;
export declare const getBusInfo: (busId: string) => Promise<BusInfo | null>;
export {};
//# sourceMappingURL=locationService.d.ts.map