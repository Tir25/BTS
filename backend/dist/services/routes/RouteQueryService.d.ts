import type { LineString } from 'geojson';
export interface RouteWithGeoJSON {
    id: string;
    name: string;
    description: string;
    stops: LineString;
    distance_km: number;
    estimated_duration_minutes: number;
    city?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
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
export declare class RouteQueryService {
    static calculateETA(busLocation: BusLocation, routeId: string): Promise<ETAInfo | null>;
    static getAllRoutes(): Promise<RouteWithGeoJSON[]>;
    static getRouteById(routeId: string): Promise<RouteWithGeoJSON | null>;
    static getRoutesInViewport(viewport: any): Promise<RouteWithGeoJSON[]>;
    static checkBusNearStop(busLocation: any, routeId: string): Promise<any>;
}
export {};
//# sourceMappingURL=RouteQueryService.d.ts.map