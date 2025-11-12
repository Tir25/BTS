import { RouteWithGeoJSON } from './RouteQueryService';
export interface RouteData {
    id?: string;
    name: string;
    description?: string;
    distance_km?: number;
    estimated_duration_minutes?: number;
    is_active?: boolean;
    city?: string | null;
}
export declare class RouteMutationService {
    static createRoute(routeData: RouteData): Promise<RouteWithGeoJSON>;
    static updateRoute(routeId: string, routeData: Partial<RouteData>): Promise<RouteWithGeoJSON | null>;
    static deleteRoute(routeId: string): Promise<RouteWithGeoJSON | null>;
    static assignBusToRoute(busId: string, routeId: string): Promise<boolean>;
}
//# sourceMappingURL=RouteMutationService.d.ts.map