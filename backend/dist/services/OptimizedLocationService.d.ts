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
    id: string;
    bus_id: string;
    bus_number: string;
    route_id: string;
    route_name: string;
    driver_id: string;
    driver_name: string;
    assigned_driver_profile_id?: string;
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
interface ViewportBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}
interface SpatialQueryOptions {
    viewport?: ViewportBounds;
    timeWindow?: number;
    maxResults?: number;
    includeInactive?: boolean;
}
declare class OptimizedLocationService {
    private static instance;
    private connectionPool;
    private queryCache;
    private cacheTTL;
    private constructor();
    static getInstance(): OptimizedLocationService;
    saveLocationUpdate(data: LocationData): Promise<SavedLocation | null>;
    getCurrentBusLocations(options?: SpatialQueryOptions): Promise<SavedLocation[]>;
    getLocationsInViewport(north: number, south: number, east: number, west: number, timeWindow?: number): Promise<SavedLocation[]>;
    getBusLocationHistory(busId: string, startTime: string, endTime: string, limit?: number): Promise<SavedLocation[]>;
    getDriverBusInfo(driverId: string): Promise<BusInfo | null>;
    getSpatialStats(): Promise<{
        totalLocations: number;
        activeBuses: number;
        averageResponseTime: number;
        cacheHitRate: number;
    }>;
    private invalidateCache;
    private startCacheCleanup;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        ttl: number;
        entries: string[];
    };
}
export declare const optimizedLocationService: OptimizedLocationService;
export default optimizedLocationService;
//# sourceMappingURL=OptimizedLocationService.d.ts.map