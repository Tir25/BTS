"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBulkOperation = exports.validateTimeRange = exports.validateLocationQuery = exports.validateAdminUser = exports.validatePagination = exports.validateUuidParam = exports.validateSearchQuery = exports.validateStop = exports.validateDriverAssignment = exports.validateUserProfile = exports.validateRoute = exports.validateBus = exports.validateLocationUpdate = exports.commonValidations = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            message: 'Invalid input data',
            code: 'VALIDATION_ERROR',
            details: errors.array().map(error => ({
                field: error.path || error.param,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
exports.commonValidations = {
    uuid: (field) => (0, express_validator_1.param)(field).isUUID().withMessage(`${field} must be a valid UUID`),
    email: (field) => (0, express_validator_1.body)(field).isEmail().normalizeEmail().withMessage(`${field} must be a valid email`),
    requiredString: (field, minLength = 1, maxLength = 255) => (0, express_validator_1.body)(field).isString().isLength({ min: minLength, max: maxLength }).withMessage(`${field} must be a string between ${minLength} and ${maxLength} characters`),
    optionalString: (field, maxLength = 255) => (0, express_validator_1.body)(field).optional().isString().isLength({ max: maxLength }).withMessage(`${field} must be a string with maximum ${maxLength} characters`),
    latitude: () => (0, express_validator_1.body)('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    longitude: () => (0, express_validator_1.body)('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    positiveInteger: (field) => (0, express_validator_1.body)(field).isInt({ min: 1 }).withMessage(`${field} must be a positive integer`),
    optionalPositiveInteger: (field) => (0, express_validator_1.body)(field).optional().isInt({ min: 1 }).withMessage(`${field} must be a positive integer`),
    boolean: (field) => (0, express_validator_1.body)(field).isBoolean().withMessage(`${field} must be a boolean`),
    optionalBoolean: (field) => (0, express_validator_1.body)(field).optional().isBoolean().withMessage(`${field} must be a boolean`),
    date: (field) => (0, express_validator_1.body)(field).isISO8601().withMessage(`${field} must be a valid ISO 8601 date`),
    optionalDate: (field) => (0, express_validator_1.body)(field).optional().isISO8601().withMessage(`${field} must be a valid ISO 8601 date`),
    url: (field) => (0, express_validator_1.body)(field).isURL().withMessage(`${field} must be a valid URL`),
    optionalUrl: (field) => (0, express_validator_1.body)(field).optional().isURL().withMessage(`${field} must be a valid URL`),
    phone: (field) => (0, express_validator_1.body)(field).isMobilePhone('any').withMessage(`${field} must be a valid phone number`),
    optionalPhone: (field) => (0, express_validator_1.body)(field).optional().isMobilePhone('any').withMessage(`${field} must be a valid phone number`),
    role: () => (0, express_validator_1.body)('role').isIn(['admin', 'driver', 'student']).withMessage('Role must be admin, driver, or student'),
    status: () => (0, express_validator_1.body)('status').isIn(['active', 'inactive', 'maintenance']).withMessage('Status must be active, inactive, or maintenance'),
    pagination: () => [
        (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ]
};
exports.validateLocationUpdate = [
    (0, express_validator_1.body)('driverId').isUUID().withMessage('Driver ID must be a valid UUID'),
    (0, express_validator_1.body)('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    (0, express_validator_1.body)('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    (0, express_validator_1.body)('timestamp').isISO8601().withMessage('Timestamp must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('speed').optional().isFloat({ min: 0 }).withMessage('Speed must be a non-negative number'),
    (0, express_validator_1.body)('heading').optional().isFloat({ min: 0, max: 360 }).withMessage('Heading must be between 0 and 360 degrees'),
    exports.handleValidationErrors
];
exports.validateBus = [
    (0, express_validator_1.body)('busNumber').isString().isLength({ min: 1, max: 50 }).withMessage('Bus number must be between 1 and 50 characters'),
    (0, express_validator_1.body)('capacity').isInt({ min: 1, max: 100 }).withMessage('Capacity must be between 1 and 100'),
    (0, express_validator_1.body)('status').isIn(['active', 'inactive', 'maintenance']).withMessage('Status must be active, inactive, or maintenance'),
    (0, express_validator_1.body)('routeId').optional().isUUID().withMessage('Route ID must be a valid UUID'),
    (0, express_validator_1.body)('driverId').optional().isUUID().withMessage('Driver ID must be a valid UUID'),
    exports.handleValidationErrors
];
exports.validateRoute = [
    (0, express_validator_1.body)('name').isString().isLength({ min: 1, max: 100 }).withMessage('Route name must be between 1 and 100 characters'),
    (0, express_validator_1.body)('description').optional().isString().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    (0, express_validator_1.body)('stops').isArray({ min: 2 }).withMessage('Route must have at least 2 stops'),
    (0, express_validator_1.body)('stops.*.name').isString().isLength({ min: 1, max: 100 }).withMessage('Stop name must be between 1 and 100 characters'),
    (0, express_validator_1.body)('stops.*.latitude').isFloat({ min: -90, max: 90 }).withMessage('Stop latitude must be between -90 and 90'),
    (0, express_validator_1.body)('stops.*.longitude').isFloat({ min: -180, max: 180 }).withMessage('Stop longitude must be between -180 and 180'),
    (0, express_validator_1.body)('stops.*.sequence').isInt({ min: 0 }).withMessage('Stop sequence must be a non-negative integer'),
    exports.handleValidationErrors
];
exports.validateUserProfile = [
    (0, express_validator_1.body)('full_name').isString().isLength({ min: 1, max: 100 }).withMessage('Full name must be between 1 and 100 characters'),
    (0, express_validator_1.body)('phone').optional().isMobilePhone('any').withMessage('Phone must be a valid phone number'),
    (0, express_validator_1.body)('role').isIn(['admin', 'driver', 'student']).withMessage('Role must be admin, driver, or student'),
    (0, express_validator_1.body)('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
    exports.handleValidationErrors
];
exports.validateDriverAssignment = [
    (0, express_validator_1.body)('driverId').isUUID().withMessage('Driver ID must be a valid UUID'),
    (0, express_validator_1.body)('busId').isUUID().withMessage('Bus ID must be a valid UUID'),
    exports.handleValidationErrors
];
exports.validateStop = [
    (0, express_validator_1.body)('name').isString().isLength({ min: 1, max: 100 }).withMessage('Stop name must be between 1 and 100 characters'),
    (0, express_validator_1.body)('description').optional().isString().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    (0, express_validator_1.body)('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    (0, express_validator_1.body)('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    (0, express_validator_1.body)('sequence').optional().isInt({ min: 0 }).withMessage('Sequence must be a non-negative integer'),
    exports.handleValidationErrors
];
exports.validateSearchQuery = [
    (0, express_validator_1.query)('q').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters'),
    (0, express_validator_1.query)('type').optional().isIn(['bus', 'route', 'stop', 'driver']).withMessage('Type must be bus, route, stop, or driver'),
    ...exports.commonValidations.pagination(),
    exports.handleValidationErrors
];
const validateUuidParam = (paramName) => [
    (0, express_validator_1.param)(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`),
    exports.handleValidationErrors
];
exports.validateUuidParam = validateUuidParam;
exports.validatePagination = [
    ...exports.commonValidations.pagination(),
    exports.handleValidationErrors
];
exports.validateAdminUser = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Email must be a valid email'),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('full_name').isString().isLength({ min: 1, max: 100 }).withMessage('Full name must be between 1 and 100 characters'),
    (0, express_validator_1.body)('role').isIn(['admin', 'driver', 'student']).withMessage('Role must be admin, driver, or student'),
    exports.handleValidationErrors
];
exports.validateLocationQuery = [
    (0, express_validator_1.query)('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    (0, express_validator_1.query)('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    (0, express_validator_1.query)('radius').optional().isFloat({ min: 0.1, max: 50 }).withMessage('Radius must be between 0.1 and 50 kilometers'),
    exports.handleValidationErrors
];
exports.validateTimeRange = [
    (0, express_validator_1.body)('startTime').isISO8601().withMessage('Start time must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('endTime').isISO8601().withMessage('End time must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('endTime').custom((value, { req }) => {
        const startTime = new Date(req.body.startTime);
        const endTime = new Date(value);
        if (endTime <= startTime) {
            throw new Error('End time must be after start time');
        }
        return true;
    }),
    exports.handleValidationErrors
];
exports.validateBulkOperation = [
    (0, express_validator_1.body)('ids').isArray({ min: 1, max: 100 }).withMessage('IDs must be an array with 1-100 items'),
    (0, express_validator_1.body)('ids.*').isUUID().withMessage('Each ID must be a valid UUID'),
    (0, express_validator_1.body)('action').isIn(['activate', 'deactivate', 'delete']).withMessage('Action must be activate, deactivate, or delete'),
    exports.handleValidationErrors
];
//# sourceMappingURL=validation.js.map