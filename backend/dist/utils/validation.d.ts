import { z } from 'zod';
export declare const createBusSchema: z.ZodObject<{
    code: z.ZodString;
    number_plate: z.ZodString;
    capacity: z.ZodNumber;
    model: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    bus_image_url: z.ZodOptional<z.ZodString>;
    route_id: z.ZodOptional<z.ZodString>;
    is_active: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const updateBusSchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    number_plate: z.ZodOptional<z.ZodString>;
    capacity: z.ZodOptional<z.ZodNumber>;
    model: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    year: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    bus_image_url: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    route_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    is_active: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const busIdSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const createRouteSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    origin: z.ZodOptional<z.ZodString>;
    destination: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    total_distance_m: z.ZodOptional<z.ZodNumber>;
    estimated_duration_minutes: z.ZodOptional<z.ZodNumber>;
    is_active: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const updateRouteSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    origin: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    destination: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    city: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    total_distance_m: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    estimated_duration_minutes: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    is_active: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const routeIdSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const locationUpdateSchema: z.ZodObject<{
    busId: z.ZodString;
    driverId: z.ZodString;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    speed: z.ZodOptional<z.ZodNumber>;
    heading: z.ZodOptional<z.ZodNumber>;
    timestamp: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const locationQuerySchema: z.ZodObject<{
    busId: z.ZodOptional<z.ZodString>;
    routeId: z.ZodOptional<z.ZodString>;
    bounds: z.ZodOptional<z.ZodObject<{
        north: z.ZodNumber;
        south: z.ZodNumber;
        east: z.ZodNumber;
        west: z.ZodNumber;
    }, z.core.$strip>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const createDriverSchema: z.ZodObject<{
    driver_id: z.ZodString;
    driver_name: z.ZodString;
    license_no: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    photo_url: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateDriverSchema: z.ZodObject<{
    driver_id: z.ZodOptional<z.ZodString>;
    driver_name: z.ZodOptional<z.ZodString>;
    license_no: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    photo_url: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const driverIdSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    full_name: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<{
        student: "student";
        driver: "driver";
        admin: "admin";
    }>>;
}, z.core.$strip>;
export declare const driverAuthSchema: z.ZodObject<{
    token: z.ZodString;
    driverId: z.ZodString;
    busId: z.ZodString;
}, z.core.$strip>;
export declare const locationBroadcastSchema: z.ZodObject<{
    driverId: z.ZodString;
    busId: z.ZodString;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    speed: z.ZodOptional<z.ZodNumber>;
    heading: z.ZodOptional<z.ZodNumber>;
    timestamp: z.ZodString;
}, z.core.$strip>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sort: z.ZodOptional<z.ZodString>;
    order: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
}, z.core.$strip>;
export declare const searchSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sort: z.ZodOptional<z.ZodString>;
    order: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    q: z.ZodString;
}, z.core.$strip>;
export declare const fileUploadSchema: z.ZodObject<{
    fieldname: z.ZodString;
    originalname: z.ZodString;
    mimetype: z.ZodString;
    size: z.ZodNumber;
}, z.core.$strip>;
export declare const adminActionSchema: z.ZodObject<{
    action: z.ZodEnum<{
        update: "update";
        delete: "delete";
        create: "create";
        activate: "activate";
        deactivate: "deactivate";
    }>;
    resource: z.ZodEnum<{
        route: "route";
        bus: "bus";
        driver: "driver";
        user: "user";
    }>;
    targetId: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const validateRequest: (schema: z.ZodSchema) => (req: any, res: any, next: any) => any;
export declare const validateField: <T>(schema: z.ZodSchema<T>, data: unknown) => T;
export declare const safeValidate: <T>(schema: z.ZodSchema<T>, data: unknown) => {
    success: boolean;
    data?: T;
    errors?: z.ZodError;
};
export declare const validateLocationData: (data: unknown) => {
    success: boolean;
    data?: {
        busId: string;
        driverId: string;
        latitude: number;
        longitude: number;
        speed?: number | undefined;
        heading?: number | undefined;
        timestamp?: string | undefined;
    } | undefined;
    errors?: z.ZodError;
};
export declare const validateRouteData: (data: unknown) => {
    success: boolean;
    data?: {
        name: string;
        is_active: boolean;
        description?: string | undefined;
        origin?: string | undefined;
        destination?: string | undefined;
        city?: string | undefined;
        total_distance_m?: number | undefined;
        estimated_duration_minutes?: number | undefined;
    } | undefined;
    errors?: z.ZodError;
};
//# sourceMappingURL=validation.d.ts.map