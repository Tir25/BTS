"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRateLimitStats = exports.defaultRateLimit = exports.operationRateLimits = exports.userTierRateLimits = exports.createDynamicRateLimit = exports.apiRateLimits = exports.createAdvancedRateLimit = void 0;
const passthroughMiddleware = (req, res, next) => {
    next();
};
const createAdvancedRateLimit = (options) => {
    return passthroughMiddleware;
};
exports.createAdvancedRateLimit = createAdvancedRateLimit;
exports.apiRateLimits = {
    general: passthroughMiddleware,
    auth: passthroughMiddleware,
    assignments: passthroughMiddleware,
    locations: passthroughMiddleware,
    admin: passthroughMiddleware,
    upload: passthroughMiddleware,
    websocket: passthroughMiddleware,
    analytics: passthroughMiddleware,
    development: passthroughMiddleware
};
const createDynamicRateLimit = (baseLimit) => {
    return passthroughMiddleware;
};
exports.createDynamicRateLimit = createDynamicRateLimit;
exports.userTierRateLimits = {
    free: passthroughMiddleware,
    premium: passthroughMiddleware,
    enterprise: passthroughMiddleware
};
exports.operationRateLimits = {
    busAssignment: passthroughMiddleware,
    routeCreation: passthroughMiddleware,
    driverRegistration: passthroughMiddleware,
    locationUpdate: passthroughMiddleware
};
exports.defaultRateLimit = passthroughMiddleware;
const getRateLimitStats = () => {
    return {
        limits: {
            general: { windowMs: 0, max: 0 },
            auth: { windowMs: 0, max: 0 },
            assignments: { windowMs: 0, max: 0 },
            locations: { windowMs: 0, max: 0 },
            admin: { windowMs: 0, max: 0 },
            upload: { windowMs: 0, max: 0 }
        },
        userTiers: {
            free: { windowMs: 0, max: 0 },
            premium: { windowMs: 0, max: 0 },
            enterprise: { windowMs: 0, max: 0 }
        },
        note: 'Rate limiting is disabled - system configured for high-volume traffic'
    };
};
exports.getRateLimitStats = getRateLimitStats;
//# sourceMappingURL=advancedRateLimit.js.map