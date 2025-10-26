"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInternalError = exports.sendBadRequest = exports.sendNoContent = exports.sendCreated = exports.sendConflict = exports.sendForbidden = exports.sendUnauthorized = exports.sendNotFound = exports.sendValidationError = exports.sendError = exports.sendSuccess = exports.ResponseHelper = void 0;
const logger_1 = require("./logger");
class ResponseHelper {
    static success(res, data, message, statusCode = 200) {
        const response = {
            success: true,
            data,
            message,
            timestamp: new Date().toISOString(),
        };
        logger_1.logger.info(`Success response: ${statusCode}`, 'api', { statusCode, hasData: !!data, message });
        return res.status(statusCode).json(response);
    }
    static successWithPagination(res, data, pagination, message, statusCode = 200) {
        const response = {
            success: true,
            data,
            message,
            timestamp: new Date().toISOString(),
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                totalPages: Math.ceil(pagination.total / pagination.limit),
            },
        };
        logger_1.logger.info(`Success response with pagination: ${statusCode}`, 'api', { statusCode, total: pagination.total, page: pagination.page });
        return res.status(statusCode).json(response);
    }
    static error(res, error, statusCode = 500, code) {
        const response = {
            success: false,
            error,
            code,
            timestamp: new Date().toISOString(),
        };
        logger_1.logger.error(`Error response: ${statusCode}`, 'api', { statusCode, error, code });
        return res.status(statusCode).json(response);
    }
    static validationError(res, error, code = 'VALIDATION_ERROR') {
        return this.error(res, error, 400, code);
    }
    static notFound(res, resource = 'Resource') {
        return this.error(res, `${resource} not found`, 404, 'NOT_FOUND');
    }
    static unauthorized(res, message = 'Unauthorized access') {
        return this.error(res, message, 401, 'UNAUTHORIZED');
    }
    static forbidden(res, message = 'Access forbidden') {
        return this.error(res, message, 403, 'FORBIDDEN');
    }
    static conflict(res, message = 'Resource already exists') {
        return this.error(res, message, 409, 'CONFLICT');
    }
    static serviceUnavailable(res, message = 'Service temporarily unavailable') {
        return this.error(res, message, 503, 'SERVICE_UNAVAILABLE');
    }
    static created(res, data, message) {
        return this.success(res, data, message, 201);
    }
    static noContent(res) {
        logger_1.logger.info('No content response: 204', 'api');
        return res.status(204).send();
    }
    static badRequest(res, message = 'Bad request') {
        return this.error(res, message, 400, 'BAD_REQUEST');
    }
    static methodNotAllowed(res, method) {
        return this.error(res, `Method ${method} not allowed`, 405, 'METHOD_NOT_ALLOWED');
    }
    static tooManyRequests(res, message = 'Too many requests') {
        return this.error(res, message, 429, 'RATE_LIMIT_EXCEEDED');
    }
    static internalError(res, message = 'Internal server error') {
        return this.error(res, message, 500, 'INTERNAL_ERROR');
    }
}
exports.ResponseHelper = ResponseHelper;
const sendSuccess = (res, data, message, statusCode = 200) => ResponseHelper.success(res, data, message, statusCode);
exports.sendSuccess = sendSuccess;
const sendError = (res, error, statusCode = 500, code) => ResponseHelper.error(res, error, statusCode, code);
exports.sendError = sendError;
const sendValidationError = (res, error, code = 'VALIDATION_ERROR') => ResponseHelper.validationError(res, error, code);
exports.sendValidationError = sendValidationError;
const sendNotFound = (res, resource = 'Resource') => ResponseHelper.notFound(res, resource);
exports.sendNotFound = sendNotFound;
const sendUnauthorized = (res, message = 'Unauthorized access') => ResponseHelper.unauthorized(res, message);
exports.sendUnauthorized = sendUnauthorized;
const sendForbidden = (res, message = 'Access forbidden') => ResponseHelper.forbidden(res, message);
exports.sendForbidden = sendForbidden;
const sendConflict = (res, message = 'Resource already exists') => ResponseHelper.conflict(res, message);
exports.sendConflict = sendConflict;
const sendCreated = (res, data, message) => ResponseHelper.created(res, data, message);
exports.sendCreated = sendCreated;
const sendNoContent = (res) => ResponseHelper.noContent(res);
exports.sendNoContent = sendNoContent;
const sendBadRequest = (res, message = 'Bad request') => ResponseHelper.badRequest(res, message);
exports.sendBadRequest = sendBadRequest;
const sendInternalError = (res, message = 'Internal server error') => ResponseHelper.internalError(res, message);
exports.sendInternalError = sendInternalError;
//# sourceMappingURL=responseHelpers.js.map