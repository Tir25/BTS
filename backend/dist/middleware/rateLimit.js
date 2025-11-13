"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimit = exports.rateLimitMiddleware = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const environment_1 = __importDefault(require("../config/environment"));
const logger_1 = require("../utils/logger");
const isRateLimitDisabled = () => {
    const disabled = process.env.DISABLE_RATE_LIMIT &&
        process.env.DISABLE_RATE_LIMIT.toLowerCase() === 'true';
    if (disabled) {
        logger_1.logger.debug('Rate limiting is disabled via environment variable', 'rate-limit');
    }
    return disabled;
};
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: environment_1.default.rateLimit.windowMs,
    max: environment_1.default.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMITED'
    }
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: environment_1.default.rateLimit.windowMs,
    max: environment_1.default.rateLimit.authMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMITED'
    },
    keyGenerator: (req) => {
        const authHeader = req.headers.authorization || '';
        return authHeader ? `auth:${authHeader.slice(0, 24)}` : `ip:${req.ip}`;
    }
});
const rateLimitMiddleware = (req, res, next) => {
    if (isRateLimitDisabled() || !environment_1.default.security.enableRateLimit) {
        return next();
    }
    if (process.env.NODE_ENV === 'production') {
        return generalLimiter(req, res, next);
    }
    logger_1.logger.debug('Rate limiting would apply in production', 'rate-limit', {
        path: req.path,
        method: req.method,
        ip: req.ip
    });
    next();
};
exports.rateLimitMiddleware = rateLimitMiddleware;
const authRateLimit = (req, res, next) => {
    if (isRateLimitDisabled() || !environment_1.default.security.enableRateLimit) {
        return next();
    }
    if (process.env.NODE_ENV === 'production') {
        return authLimiter(req, res, next);
    }
    next();
};
exports.authRateLimit = authRateLimit;
//# sourceMappingURL=rateLimit.js.map