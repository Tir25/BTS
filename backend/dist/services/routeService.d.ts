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
export interface RouteWithGeoJSON extends Omit<Route, 'stops'> {
    stops: LineString;
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
export interface RouteData {
    id?: string;
    name: string;
    description?: string;
    distance_km?: number;
    estimated_duration_minutes?: number;
    is_active?: boolean;
    city?: string | null;
}
export declare class RouteService {
    static calculateETA(busLocation: BusLocation, routeId: string): Promise<ETAInfo | null>;
    static getAllRoutes(): Promise<RouteWithGeoJSON[]>;
    static getRouteById(routeId: string): Promise<RouteWithGeoJSON | null>;
    static createRoute(routeData: RouteData): Promise<RouteWithGeoJSON>;
    static updateRoute(routeId: string, routeData: Partial<RouteData>): Promise<RouteWithGeoJSON | null>;
    static deleteRoute(routeId: string): Promise<RouteWithGeoJSON | null>;
    static getRoutesInViewport(viewport: any): Promise<RouteWithGeoJSON[]>;
    static assignBusToRoute(busId: string, routeId: string): Promise<boolean>;
    static checkBusNearStop(busLocation: any, routeId: string): Promise<any>;
}
export {};
//# sourceMappingURL=routeService.d.ts.map