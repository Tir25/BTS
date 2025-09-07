"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRouteData = exports.validateLocationData = exports.safeValidate = exports.validateField = exports.validateRequest = exports.adminActionSchema = exports.fileUploadSchema = exports.searchSchema = exports.paginationSchema = exports.locationBroadcastSchema = exports.driverAuthSchema = exports.registerSchema = exports.loginSchema = exports.driverIdSchema = exports.updateDriverSchema = exports.createDriverSchema = exports.locationQuerySchema = exports.locationUpdateSchema = exports.routeIdSchema = exports.updateRouteSchema = exports.createRouteSchema = exports.busIdSchema = exports.updateBusSchema = exports.createBusSchema = void 0;
const zod_1 = require("zod");
const emailSchema = zod_1.z.string().email('Invalid email format');
const uuidSchema = zod_1.z.string().uuid('Invalid UUID format');
const positiveNumberSchema = zod_1.z.number().positive('Must be a positive number');
const nonEmptyStringSchema = zod_1.z.string().min(1, 'Cannot be empty');
const coordinateSchema = zod_1.z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180');
const latitudeSchema = zod_1.z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90');
exports.createBusSchema = zod_1.z.object({
    code: nonEmptyStringSchema,
    number_plate: nonEmptyStringSchema,
    capacity: positiveNumberSchema,
    model: zod_1.z.string().optional(),
    year: zod_1.z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
    bus_image_url: zod_1.z.string().url().optional(),
    route_id: uuidSchema.optional(),
    is_active: zod_1.z.boolean().default(true),
});
exports.updateBusSchema = exports.createBusSchema.partial();
exports.busIdSchema = zod_1.z.object({
    id: uuidSchema,
});
exports.createRouteSchema = zod_1.z.object({
    name: nonEmptyStringSchema,
    description: zod_1.z.string().optional(),
    origin: zod_1.z.string().optional(),
    destination: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    total_distance_m: positiveNumberSchema.optional(),
    estimated_duration_minutes: positiveNumberSchema.optional(),
    is_active: zod_1.z.boolean().default(true),
});
exports.updateRouteSchema = exports.createRouteSchema.partial();
exports.routeIdSchema = zod_1.z.object({
    id: uuidSchema,
});
exports.locationUpdateSchema = zod_1.z.object({
    busId: uuidSchema,
    driverId: uuidSchema,
    latitude: latitudeSchema,
    longitude: coordinateSchema,
    speed: zod_1.z.number().min(0).max(200).optional(),
    heading: zod_1.z.number().min(0).max(360).optional(),
    timestamp: zod_1.z.string().datetime().optional(),
});
exports.locationQuerySchema = zod_1.z.object({
    busId: uuidSchema.optional(),
    routeId: uuidSchema.optional(),
    bounds: zod_1.z.object({
        north: latitudeSchema,
        south: latitudeSchema,
        east: coordinateSchema,
        west: coordinateSchema,
    }).optional(),
    limit: zod_1.z.number().int().min(1).max(1000).default(100),
    offset: zod_1.z.number().int().min(0).default(0),
});
exports.createDriverSchema = zod_1.z.object({
    driver_id: nonEmptyStringSchema,
    driver_name: nonEmptyStringSchema,
    license_no: nonEmptyStringSchema,
    phone: zod_1.z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
    email: emailSchema.optional(),
    photo_url: zod_1.z.string().url().optional(),
});
exports.updateDriverSchema = exports.createDriverSchema.partial();
exports.driverIdSchema = zod_1.z.object({
    id: uuidSchema,
});
exports.loginSchema = zod_1.z.object({
    email: emailSchema,
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
});
exports.registerSchema = zod_1.z.object({
    email: emailSchema,
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    full_name: nonEmptyStringSchema,
    role: zod_1.z.enum(['student', 'driver', 'admin']).default('student'),
});
exports.driverAuthSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
    driverId: uuidSchema,
    busId: uuidSchema,
});
exports.locationBroadcastSchema = zod_1.z.object({
    driverId: uuidSchema,
    busId: uuidSchema,
    latitude: latitudeSchema,
    longitude: coordinateSchema,
    speed: zod_1.z.number().min(0).max(200).optional(),
    heading: zod_1.z.number().min(0).max(360).optional(),
    timestamp: zod_1.z.string().datetime(),
});
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.number().int().min(1).default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(10),
    sort: zod_1.z.string().optional(),
    order: zod_1.z.enum(['asc', 'desc']).default('asc'),
});
exports.searchSchema = zod_1.z.object({
    q: zod_1.z.string().min(1, 'Search query cannot be empty'),
    ...exports.paginationSchema.shape,
});
exports.fileUploadSchema = zod_1.z.object({
    fieldname: zod_1.z.string(),
    originalname: zod_1.z.string(),
    mimetype: zod_1.z.string().regex(/^image\/(jpeg|jpg|png|gif|webp)$/, 'Only image files are allowed'),
    size: zod_1.z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
});
exports.adminActionSchema = zod_1.z.object({
    action: zod_1.z.enum(['create', 'update', 'delete', 'activate', 'deactivate']),
    resource: zod_1.z.enum(['bus', 'route', 'driver', 'user']),
    targetId: uuidSchema.optional(),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const data = {
                ...req.body,
                ...req.query,
                ...req.params,
            };
            const validatedData = schema.parse(data);
            req.body = validatedData;
            req.query = validatedData;
            req.params = validatedData;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    error: {
                        name: 'ValidationError',
                        message: 'Request validation failed',
                        statusCode: 400,
                        timestamp: new Date().toISOString(),
                        details: error.issues.map((err) => ({
                            field: err.path.join('.'),
                            message: err.message,
                            code: err.code,
                        })),
                    },
                });
            }
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;
const validateField = (schema, data) => {
    return schema.parse(data);
};
exports.validateField = validateField;
const safeValidate = (schema, data) => {
    try {
        const validatedData = schema.parse(data);
        return { success: true, data: validatedData };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return { success: false, errors: error };
        }
        throw error;
    }
};
exports.safeValidate = safeValidate;
const validateLocationData = (data) => {
    return (0, exports.safeValidate)(exports.locationUpdateSchema, data);
};
exports.validateLocationData = validateLocationData;
const validateRouteData = (data) => {
    return (0, exports.safeValidate)(exports.createRouteSchema, data);
};
exports.validateRouteData = validateRouteData;
//# sourceMappingURL=validation.js.map