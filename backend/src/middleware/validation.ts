import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Invalid input data',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(error => ({
        field: (error as any).path || (error as any).param,
        message: error.msg,
        value: (error as any).value
      }))
    });
  }
  next();
};

/**
 * Common validation rules
 */
export const commonValidations = {
  uuid: (field: string) => param(field).isUUID().withMessage(`${field} must be a valid UUID`),
  email: (field: string) => body(field).isEmail().normalizeEmail().withMessage(`${field} must be a valid email`),
  requiredString: (field: string, minLength: number = 1, maxLength: number = 255) => 
    body(field).isString().isLength({ min: minLength, max: maxLength }).withMessage(`${field} must be a string between ${minLength} and ${maxLength} characters`),
  optionalString: (field: string, maxLength: number = 255) => 
    body(field).optional().isString().isLength({ max: maxLength }).withMessage(`${field} must be a string with maximum ${maxLength} characters`),
  latitude: () => body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  longitude: () => body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  positiveInteger: (field: string) => body(field).isInt({ min: 1 }).withMessage(`${field} must be a positive integer`),
  optionalPositiveInteger: (field: string) => body(field).optional().isInt({ min: 1 }).withMessage(`${field} must be a positive integer`),
  boolean: (field: string) => body(field).isBoolean().withMessage(`${field} must be a boolean`),
  optionalBoolean: (field: string) => body(field).optional().isBoolean().withMessage(`${field} must be a boolean`),
  date: (field: string) => body(field).isISO8601().withMessage(`${field} must be a valid ISO 8601 date`),
  optionalDate: (field: string) => body(field).optional().isISO8601().withMessage(`${field} must be a valid ISO 8601 date`),
  url: (field: string) => body(field).isURL().withMessage(`${field} must be a valid URL`),
  optionalUrl: (field: string) => body(field).optional().isURL().withMessage(`${field} must be a valid URL`),
  phone: (field: string) => body(field).isMobilePhone('any').withMessage(`${field} must be a valid phone number`),
  optionalPhone: (field: string) => body(field).optional().isMobilePhone('any').withMessage(`${field} must be a valid phone number`),
  role: () => body('role').isIn(['admin', 'driver', 'student']).withMessage('Role must be admin, driver, or student'),
  status: () => body('status').isIn(['active', 'inactive', 'maintenance']).withMessage('Status must be active, inactive, or maintenance'),
  pagination: () => [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]
};

/**
 * Location update validation
 */
export const validateLocationUpdate = [
  body('driverId').isUUID().withMessage('Driver ID must be a valid UUID'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('timestamp').isISO8601().withMessage('Timestamp must be a valid ISO 8601 date'),
  body('speed').optional().isFloat({ min: 0 }).withMessage('Speed must be a non-negative number'),
  body('heading').optional().isFloat({ min: 0, max: 360 }).withMessage('Heading must be between 0 and 360 degrees'),
  handleValidationErrors
];

/**
 * Bus creation/update validation
 */
export const validateBus = [
  body('busNumber').isString().isLength({ min: 1, max: 50 }).withMessage('Bus number must be between 1 and 50 characters'),
  body('capacity').isInt({ min: 1, max: 100 }).withMessage('Capacity must be between 1 and 100'),
  body('status').isIn(['active', 'inactive', 'maintenance']).withMessage('Status must be active, inactive, or maintenance'),
  body('routeId').optional().isUUID().withMessage('Route ID must be a valid UUID'),
  body('driverId').optional().isUUID().withMessage('Driver ID must be a valid UUID'),
  handleValidationErrors
];

/**
 * Route creation/update validation
 */
export const validateRoute = [
  body('name').isString().isLength({ min: 1, max: 100 }).withMessage('Route name must be between 1 and 100 characters'),
  body('description').optional().isString().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('stops').isArray({ min: 2 }).withMessage('Route must have at least 2 stops'),
  body('stops.*.name').isString().isLength({ min: 1, max: 100 }).withMessage('Stop name must be between 1 and 100 characters'),
  body('stops.*.latitude').isFloat({ min: -90, max: 90 }).withMessage('Stop latitude must be between -90 and 90'),
  body('stops.*.longitude').isFloat({ min: -180, max: 180 }).withMessage('Stop longitude must be between -180 and 180'),
  body('stops.*.sequence').isInt({ min: 0 }).withMessage('Stop sequence must be a non-negative integer'),
  handleValidationErrors
];

/**
 * User profile validation
 */
export const validateUserProfile = [
  body('full_name').isString().isLength({ min: 1, max: 100 }).withMessage('Full name must be between 1 and 100 characters'),
  body('phone').optional().isMobilePhone('any').withMessage('Phone must be a valid phone number'),
  body('role').isIn(['admin', 'driver', 'student']).withMessage('Role must be admin, driver, or student'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
  handleValidationErrors
];

/**
 * Driver assignment validation
 */
export const validateDriverAssignment = [
  body('driverId').isUUID().withMessage('Driver ID must be a valid UUID'),
  body('busId').isUUID().withMessage('Bus ID must be a valid UUID'),
  handleValidationErrors
];

/**
 * Stop creation/update validation
 */
export const validateStop = [
  body('name').isString().isLength({ min: 1, max: 100 }).withMessage('Stop name must be between 1 and 100 characters'),
  body('description').optional().isString().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('sequence').optional().isInt({ min: 0 }).withMessage('Sequence must be a non-negative integer'),
  handleValidationErrors
];

/**
 * Search query validation
 */
export const validateSearchQuery = [
  query('q').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters'),
  query('type').optional().isIn(['bus', 'route', 'stop', 'driver']).withMessage('Type must be bus, route, stop, or driver'),
  ...commonValidations.pagination(),
  handleValidationErrors
];

/**
 * Generic UUID parameter validation
 */
export const validateUuidParam = (paramName: string) => [
  param(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`),
  handleValidationErrors
];

/**
 * Generic pagination validation
 */
export const validatePagination = [
  ...commonValidations.pagination(),
  handleValidationErrors
];

/**
 * Admin user creation validation
 */
export const validateAdminUser = [
  body('email').isEmail().normalizeEmail().withMessage('Email must be a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('full_name').isString().isLength({ min: 1, max: 100 }).withMessage('Full name must be between 1 and 100 characters'),
  body('role').isIn(['admin', 'driver', 'student']).withMessage('Role must be admin, driver, or student'),
  handleValidationErrors
];

/**
 * Location query validation
 */
export const validateLocationQuery = [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  query('radius').optional().isFloat({ min: 0.1, max: 50 }).withMessage('Radius must be between 0.1 and 50 kilometers'),
  handleValidationErrors
];

/**
 * Time range validation
 */
export const validateTimeRange = [
  body('startTime').isISO8601().withMessage('Start time must be a valid ISO 8601 date'),
  body('endTime').isISO8601().withMessage('End time must be a valid ISO 8601 date'),
  body('endTime').custom((value, { req }) => {
    const startTime = new Date(req.body.startTime);
    const endTime = new Date(value);
    if (endTime <= startTime) {
      throw new Error('End time must be after start time');
    }
    return true;
  }),
  handleValidationErrors
];

/**
 * Bulk operation validation
 */
export const validateBulkOperation = [
  body('ids').isArray({ min: 1, max: 100 }).withMessage('IDs must be an array with 1-100 items'),
  body('ids.*').isUUID().withMessage('Each ID must be a valid UUID'),
  body('action').isIn(['activate', 'deactivate', 'delete']).withMessage('Action must be activate, deactivate, or delete'),
  handleValidationErrors
];
