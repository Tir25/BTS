"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRequestIdToError = exports.requestIdMiddleware = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const requestIdMiddleware = (req, res, next) => {
    req.id = (0, uuid_1.v4)();
    res.setHeader('X-Request-ID', req.id);
    res.locals.requestId = req.id;
    logger_1.logger.info(`Request ${req.id}: ${req.method} ${req.originalUrl}`, 'requestId', {
        method: req.method,
        url: req.originalUrl
    }, req);
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
const addRequestIdToError = (req, res, next) => {
    const originalJson = res.json;
    res.json = function (obj) {
        if (obj && (obj.error || obj.success === false)) {
            obj.requestId = req.id;
        }
        return originalJson.call(this, obj);
    };
    next();
};
exports.addRequestIdToError = addRequestIdToError;
//# sourceMappingURL=requestId.js.map