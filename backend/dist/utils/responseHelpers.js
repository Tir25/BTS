"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInternalServerError = exports.sendForbiddenError = exports.sendUnauthorizedError = exports.sendNotFoundError = exports.sendValidationError = exports.sendSuccessResponse = exports.sendErrorResponse = exports.createSuccessResponse = exports.createErrorResponse = void 0;
const createErrorResponse = (_statusCode, error, message, details) => ({
    success: false,
    error,
    message,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
});
exports.createErrorResponse = createErrorResponse;
const createSuccessResponse = (data, message, _statusCode = 200) => ({
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
});
exports.createSuccessResponse = createSuccessResponse;
const sendErrorResponse = (res, statusCode, error, message, details) => {
    return res.status(statusCode).json((0, exports.createErrorResponse)(statusCode, error, message, details));
};
exports.sendErrorResponse = sendErrorResponse;
const sendSuccessResponse = (res, data, message, statusCode = 200) => {
    return res.status(statusCode).json((0, exports.createSuccessResponse)(data, message, statusCode));
};
exports.sendSuccessResponse = sendSuccessResponse;
const sendValidationError = (res, field, message) => {
    return (0, exports.sendErrorResponse)(res, 400, 'Validation Error', message, { field });
};
exports.sendValidationError = sendValidationError;
const sendNotFoundError = (res, resource, id) => {
    return (0, exports.sendErrorResponse)(res, 404, 'Not Found', `${resource} with ID ${id} not found`);
};
exports.sendNotFoundError = sendNotFoundError;
const sendUnauthorizedError = (res, message = 'Authentication required') => {
    return (0, exports.sendErrorResponse)(res, 401, 'Unauthorized', message);
};
exports.sendUnauthorizedError = sendUnauthorizedError;
const sendForbiddenError = (res, message = 'Access denied') => {
    return (0, exports.sendErrorResponse)(res, 403, 'Forbidden', message);
};
exports.sendForbiddenError = sendForbiddenError;
const sendInternalServerError = (res, error) => {
    return (0, exports.sendErrorResponse)(res, 500, 'Internal Server Error', error?.message || 'Something went wrong');
};
exports.sendInternalServerError = sendInternalServerError;
//# sourceMappingURL=responseHelpers.js.map