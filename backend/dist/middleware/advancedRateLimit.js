"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRateLimitStats = exports.defaultRateLimit = exports.operationRateLimits = exports.userTierRateLimits = exports.createDynamicRateLimit = exports.apiRateLimits = exports.createAdvancedRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("../utils/logger");
const createAdvancedRateLimit = (options) => {
    return (0, express_rate_limit_1.default)({
        ...options,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger_1.logger.warn('Rate limit exceeded', 'rate-limit', {
                ip: req.ip,
                path: req.path,
                method: req.method,
                userAgent: req.get('User-Agent'),
                limit: options.max,
                windowMs: options.windowMs
            });
            res.status(429).json({
                error: 'Too many requests',
                message: options.message || 'Rate limit exceeded',
                retryAfter: Math.ceil(options.windowMs / 1000),
                limit: options.max,
                windowMs: options.windowMs
            });
        }
    });
};
exports.createAdvancedRateLimit = createAdvancedRateLimit;
exports.apiRateLimits = {
    general: (0, exports.createAdvancedRateLimit)({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        skip: (req) => {
            if (req.path.startsWith('/health'))
                return true;
            if (req.path.startsWith('/monitoring'))
                return true;
            if (req.path.startsWith('/admin'))
                return true;
            if (req.path.startsWith('/production-assignments'))
                return true;
            if (req.path.startsWith('/assignments'))
                return true;
            return false;
        }
    }),
    auth: (0, exports.createAdvancedRateLimit)({
        windowMs: 15 * 60 * 1000,
        max: 5,
        skipSuccessfulRequests: true,
        skipFailedRequests: false,
        message: 'Too many authentication attempts. Please try again later.'
    }),
    assignments: (0, exports.createAdvancedRateLimit)({
        windowMs: 1 * 60 * 1000,
        max: 1000000,
        skipSuccessfulRequests: true,
        skipFailedRequests: true,
        skip: (req) => {
            return true;
        },
        message: 'Too many assignment requests. Please slow down.'
    }),
    locations: (0, exports.createAdvancedRateLimit)({
        windowMs: 1 * 60 * 1000,
        max: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        message: 'Too many location requests. Please reduce frequency.'
    }),
    admin: (0, exports.createAdvancedRateLimit)({
        windowMs: 1 * 60 * 1000,
        max: process.env.NODE_ENV === 'development' ? 2000 : 500,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        skip: (req) => {
            if (process.env.NODE_ENV === 'development') {
                return true;
            }
            return false;
        },
        message: 'Too many admin requests. Please slow down.'
    }),
    upload: (0, exports.createAdvancedRateLimit)({
        windowMs: 10 * 60 * 1000,
        max: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        message: 'Too many file uploads. Please wait before uploading again.'
    }),
    websocket: (0, exports.createAdvancedRateLimit)({
        windowMs: 1 * 60 * 1000,
        max: 10,
        skipSuccessfulRequests: true,
        skipFailedRequests: false,
        message: 'Too many WebSocket connection attempts.'
    }),
    analytics: (0, exports.createAdvancedRateLimit)({
        windowMs: 10 * 60 * 1000,
        max: 30,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        message: 'Too many analytics requests. Please reduce frequency.'
    }),
    development: (0, exports.createAdvancedRateLimit)({
        windowMs: 1 * 60 * 1000,
        max: 200,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        skip: (req) => {
            return process.env.NODE_ENV !== 'development';
        }
    })
};
const createDynamicRateLimit = (baseLimit) => {
    return (0, exports.createAdvancedRateLimit)({
        windowMs: 15 * 60 * 1000,
        max: baseLimit,
        keyGenerator: (req) => {
            const userId = req.user?.id;
            return userId ? `user:${userId}` : `ip:${req.ip}`;
        },
        skip: (req) => {
            if (req.path.startsWith('/health') || req.path.startsWith('/monitoring')) {
                return true;
            }
            return false;
        }
    });
};
exports.createDynamicRateLimit = createDynamicRateLimit;
exports.userTierRateLimits = {
    free: (0, exports.createAdvancedRateLimit)({
        windowMs: 15 * 60 * 1000,
        max: 100,
        keyGenerator: (req) => {
            const userId = req.user?.id;
            return userId ? `free:${userId}` : `free:${req.ip}`;
        }
    }),
    premium: (0, exports.createAdvancedRateLimit)({
        windowMs: 15 * 60 * 1000,
        max: 500,
        keyGenerator: (req) => {
            const userId = req.user?.id;
            return userId ? `premium:${userId}` : `premium:${req.ip}`;
        }
    }),
    enterprise: (0, exports.createAdvancedRateLimit)({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        keyGenerator: (req) => {
            const userId = req.user?.id;
            return userId ? `enterprise:${userId}` : `enterprise:${req.ip}`;
        }
    })
};
exports.operationRateLimits = {
    busAssignment: (0, exports.createAdvancedRateLimit)({
        windowMs: 5 * 60 * 1000,
        max: 20,
        message: 'Too many bus assignment operations. Please slow down.'
    }),
    routeCreation: (0, exports.createAdvancedRateLimit)({
        windowMs: 10 * 60 * 1000,
        max: 10,
        message: 'Too many route creation operations. Please slow down.'
    }),
    driverRegistration: (0, exports.createAdvancedRateLimit)({
        windowMs: 30 * 60 * 1000,
        max: 5,
        message: 'Too many driver registration attempts. Please wait.'
    }),
    locationUpdate: (0, exports.createAdvancedRateLimit)({
        windowMs: 1 * 60 * 1000,
        max: 60,
        message: 'Too many location updates. Please reduce frequency.'
    })
};
exports.defaultRateLimit = exports.apiRateLimits.general;
const getRateLimitStats = () => {
    return {
        limits: {
            general: { windowMs: 15 * 60 * 1000, max: 1000 },
            auth: { windowMs: 15 * 60 * 1000, max: 5 },
            assignments: { windowMs: 5 * 60 * 1000, max: 50 },
            locations: { windowMs: 1 * 60 * 1000, max: 100 },
            admin: { windowMs: 5 * 60 * 1000, max: 20 },
            upload: { windowMs: 10 * 60 * 1000, max: 10 }
        },
        userTiers: {
            free: { windowMs: 15 * 60 * 1000, max: 100 },
            premium: { windowMs: 15 * 60 * 1000, max: 500 },
            enterprise: { windowMs: 15 * 60 * 1000, max: 1000 }
        }
    };
};
exports.getRateLimitStats = getRateLimitStats;
//# sourceMappingURL=advancedRateLimit.js.map