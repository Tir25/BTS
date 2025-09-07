/**
 * Input Validation Schemas using Zod
 * Following the Coding Standards & Best Practices Guide
 */

import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string().email('Invalid email format');
const uuidSchema = z.string().uuid('Invalid UUID format');
const positiveNumberSchema = z.number().positive('Must be a positive number');
const nonEmptyStringSchema = z.string().min(1, 'Cannot be empty');

// Location validation
const coordinateSchema = z.number()
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180');

const latitudeSchema = z.number()
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90');

// Bus validation schemas
export const createBusSchema = z.object({
  code: nonEmptyStringSchema,
  number_plate: nonEmptyStringSchema,
  capacity: positiveNumberSchema,
  model: z.string().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  bus_image_url: z.string().url().optional(),
  route_id: uuidSchema.optional(),
  is_active: z.boolean().default(true),
});

export const updateBusSchema = createBusSchema.partial();

export const busIdSchema = z.object({
  id: uuidSchema,
});

// Route validation schemas
export const createRouteSchema = z.object({
  name: nonEmptyStringSchema,
  description: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  city: z.string().optional(),
  total_distance_m: positiveNumberSchema.optional(),
  estimated_duration_minutes: positiveNumberSchema.optional(),
  is_active: z.boolean().default(true),
});

export const updateRouteSchema = createRouteSchema.partial();

export const routeIdSchema = z.object({
  id: uuidSchema,
});

// Location validation schemas
export const locationUpdateSchema = z.object({
  busId: uuidSchema,
  driverId: uuidSchema,
  latitude: latitudeSchema,
  longitude: coordinateSchema,
  speed: z.number().min(0).max(200).optional(), // km/h
  heading: z.number().min(0).max(360).optional(), // degrees
  timestamp: z.string().datetime().optional(),
});

export const locationQuerySchema = z.object({
  busId: uuidSchema.optional(),
  routeId: uuidSchema.optional(),
  bounds: z.object({
    north: latitudeSchema,
    south: latitudeSchema,
    east: coordinateSchema,
    west: coordinateSchema,
  }).optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
});

// Driver validation schemas
export const createDriverSchema = z.object({
  driver_id: nonEmptyStringSchema,
  driver_name: nonEmptyStringSchema,
  license_no: nonEmptyStringSchema,
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
  email: emailSchema.optional(),
  photo_url: z.string().url().optional(),
});

export const updateDriverSchema = createDriverSchema.partial();

export const driverIdSchema = z.object({
  id: uuidSchema,
});

// Authentication validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  full_name: nonEmptyStringSchema,
  role: z.enum(['student', 'driver', 'admin']).default('student'),
});

// WebSocket validation schemas
export const driverAuthSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  driverId: uuidSchema,
  busId: uuidSchema,
});

export const locationBroadcastSchema = z.object({
  driverId: uuidSchema,
  busId: uuidSchema,
  latitude: latitudeSchema,
  longitude: coordinateSchema,
  speed: z.number().min(0).max(200).optional(),
  heading: z.number().min(0).max(360).optional(),
  timestamp: z.string().datetime(),
});

// Query parameter validation schemas
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const searchSchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty'),
  ...paginationSchema.shape,
});

// File upload validation schemas
export const fileUploadSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  mimetype: z.string().regex(/^image\/(jpeg|jpg|png|gif|webp)$/, 'Only image files are allowed'),
  size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'), // 5MB limit
});

// Admin validation schemas
export const adminActionSchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'activate', 'deactivate']),
  resource: z.enum(['bus', 'route', 'driver', 'user']),
  targetId: uuidSchema.optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

// Validation middleware factory
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      // Validate request body, query, and params
      const data = {
        ...req.body,
        ...req.query,
        ...req.params,
      };

      const validatedData = schema.parse(data);
      
      // Replace original data with validated data
      req.body = validatedData;
      req.query = validatedData;
      req.params = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            name: 'ValidationError',
            message: 'Request validation failed',
            statusCode: 400,
            timestamp: new Date().toISOString(),
            details: error.issues.map((err: any) => ({
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

// Utility function to validate specific fields
export const validateField = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

// Utility function to safely validate with error handling
export const safeValidate = <T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};

// Legacy validation functions for backward compatibility
export const validateLocationData = (data: unknown) => {
  return safeValidate(locationUpdateSchema, data);
};

export const validateRouteData = (data: unknown) => {
  return safeValidate(createRouteSchema, data);
};