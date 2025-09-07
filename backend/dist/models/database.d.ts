export interface PostGISPoint {
    type: 'Point';
    coordinates: [number, number];
    crs?: {
        type: 'name';
        properties: {
            name: string;
        };
    };
}
export interface PostGISLineString {
    type: 'LineString';
    coordinates: [number, number][];
    crs?: {
        type: 'name';
        properties: {
            name: string;
        };
    };
}
export interface PostGISGeometry {
    type: string;
    coordinates: unknown;
    crs?: {
        type: 'name';
        properties: {
            name: string;
        };
    };
}
export type JSONB = Record<string, unknown>;
export interface DatabaseUser {
    id: string;
    email: string;
    role: 'student' | 'driver' | 'admin';
    first_name?: string;
    last_name?: string;
    phone?: string;
    profile_photo_url?: string;
    created_at?: string;
    updated_at?: string;
}
export interface DatabaseProfile {
    id: string;
    full_name?: string;
    role: 'student' | 'driver' | 'admin';
    created_at?: string;
    updated_at?: string;
    email?: string;
    driver_id?: string;
}
export interface DatabaseDriver {
    id: string;
    driver_id: string;
    driver_name?: string;
    license_no?: string;
    license_number?: string;
    phone?: string;
    email?: string;
    photo_url?: string;
    created_at?: string;
}
export interface DatabaseBus {
    id: string;
    code: string;
    name?: string;
    number_plate: string;
    capacity: number;
    model?: string;
    year?: number;
    bus_image_url?: string;
    photo_url?: string;
    assigned_driver_id?: string;
    driver_id?: string;
    route_id?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}
export interface DatabaseRoute {
    id: string;
    name: string;
    description?: string;
    geom: PostGISGeometry;
    stops?: PostGISGeometry;
    total_distance_m?: number;
    distance_km?: number;
    estimated_duration_minutes?: number;
    map_image_url?: string;
    route_map_url?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    origin?: string;
    destination?: string;
    city?: string;
    custom_destination?: string;
    custom_origin?: string;
    custom_destination_coordinates?: PostGISGeometry;
    custom_origin_coordinates?: PostGISGeometry;
    destination_coordinates?: PostGISGeometry;
    origin_coordinates?: PostGISGeometry;
    use_custom_arrival?: boolean;
    custom_arrival_point?: string;
    custom_arrival_coordinates?: PostGISGeometry;
    use_custom_starting_point?: boolean;
    custom_starting_point?: string;
    custom_starting_coordinates?: PostGISGeometry;
    arrival_point_type?: 'ganpat_university' | 'custom_arrival' | 'driver_location';
    starting_point_type?: 'route_origin' | 'custom_starting' | 'driver_location';
    use_custom_origin?: boolean;
    custom_origin_point?: string;
    origin_point_type?: 'driver_location' | 'custom_origin';
    bus_stops?: Record<string, unknown>;
    last_eta_calculation?: string;
    current_eta_minutes?: number;
}
export interface DatabaseLiveLocation {
    id: string;
    bus_id: string;
    location: PostGISGeometry;
    speed_kmh?: number;
    heading_degrees?: number;
    recorded_at: string;
}
export interface DatabaseBusLocationLive {
    bus_id: string;
    geom: PostGISGeometry;
    lat: number;
    lng: number;
    speed_kmh?: number;
    heading?: number;
    accuracy_m?: number;
    updated_at: string;
}
export interface DatabaseBusLocationHistory {
    id: string;
    bus_id: string;
    geom: PostGISGeometry;
    speed_kmh?: number;
    heading?: number;
    recorded_at: string;
}
export interface DatabaseBusStop {
    id: string;
    route_id: string;
    name: string;
    description?: string;
    location: PostGISGeometry;
    stop_order: number;
    estimated_time_from_start?: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}
export interface DatabaseRouteStop {
    id: string;
    route_id: string;
    name: string;
    geom: PostGISGeometry;
    seq: number;
}
export interface DatabaseDriverBusAssignment {
    id: string;
    driver_id: string;
    bus_id: string;
    route_id?: string;
    is_active: boolean;
    assigned_at?: string;
    created_at?: string;
    updated_at?: string;
}
export interface DatabaseDestination {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    location: PostGISGeometry;
    is_default: boolean;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}
export interface DatabaseDefaultDestination {
    id: string;
    name: string;
    description?: string;
    location: PostGISGeometry;
    address?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}
export interface DatabaseSystemConstant {
    id: number;
    constant_name: string;
    constant_value: JSONB;
    description?: string;
    created_at?: string;
    updated_at?: string;
}
export declare const initializeDatabase: () => Promise<void>;
export declare const testDatabaseConnection: () => Promise<void>;
export declare const getDatabaseHealth: () => Promise<unknown>;
export declare const tableExists: (tableName: string) => Promise<boolean>;
export declare const getTableColumns: (tableName: string) => Promise<string[]>;
//# sourceMappingURL=database.d.ts.map