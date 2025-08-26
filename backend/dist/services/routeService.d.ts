import type { LineString } from 'geojson';
interface Route {
    id: string;
    name: string;
    description: string;
    stops: LineString;
    distance_km: number;
    estimated_duration_minutes: number;
    city?: string;
    is_active: boolean;
}
interface RouteWithGeoJSON extends Omit<Route, 'stops'> {
    stops: LineString;
}
interface BusLocation {
    bus_id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
}
interface ETAInfo {
    bus_id: string;
    route_id: string;
    current_location: [number, number];
    next_stop: string;
    distance_remaining: number;
    estimated_arrival_minutes: number;
    is_near_stop: boolean;
}
export declare class RouteService {
    static calculateETA(busLocation: BusLocation, routeId: string): Promise<ETAInfo | null>;
    static getAllRoutes(): Promise<RouteWithGeoJSON[]>;
    static getRouteById(routeId: string): Promise<RouteWithGeoJSON | null>;
    static createRoute(routeData: {
        name: string;
        description: string;
        coordinates: [number, number][];
        distance_km: number;
        estimated_duration_minutes: number;
        city?: string;
    }): Promise<Route | null>;
    static assignBusToRoute(busId: string, routeId: string): Promise<boolean>;
    static checkBusNearStop(busLocation: BusLocation, routeId: string): Promise<{
        is_near_stop: boolean;
        distance_to_stop: number;
    }>;
    static updateRoute(routeId: string, routeData: Partial<{
        name: string;
        description: string;
        coordinates: [number, number][];
        distance_km: number;
        estimated_duration_minutes: number;
        is_active: boolean;
    }>): Promise<Route | null>;
    static deleteRoute(routeId: string): Promise<Route | null>;
}
export {};
//# sourceMappingURL=routeService.d.ts.map