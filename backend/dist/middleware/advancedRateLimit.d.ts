import { Request } from 'express';
export declare const createAdvancedRateLimit: (options: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    keyGenerator?: (req: Request) => string;
    skip?: (req: Request) => boolean;
    message?: any;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
}) => import("express-rate-limit").RateLimitRequestHandler;
export declare const apiRateLimits: {
    general: import("express-rate-limit").RateLimitRequestHandler;
    auth: import("express-rate-limit").RateLimitRequestHandler;
    assignments: import("express-rate-limit").RateLimitRequestHandler;
    locations: import("express-rate-limit").RateLimitRequestHandler;
    admin: import("express-rate-limit").RateLimitRequestHandler;
    upload: import("express-rate-limit").RateLimitRequestHandler;
    websocket: import("express-rate-limit").RateLimitRequestHandler;
    analytics: import("express-rate-limit").RateLimitRequestHandler;
    development: import("express-rate-limit").RateLimitRequestHandler;
};
export declare const createDynamicRateLimit: (baseLimit: number) => import("express-rate-limit").RateLimitRequestHandler;
export declare const userTierRateLimits: {
    free: import("express-rate-limit").RateLimitRequestHandler;
    premium: import("express-rate-limit").RateLimitRequestHandler;
    enterprise: import("express-rate-limit").RateLimitRequestHandler;
};
export declare const operationRateLimits: {
    busAssignment: import("express-rate-limit").RateLimitRequestHandler;
    routeCreation: import("express-rate-limit").RateLimitRequestHandler;
    driverRegistration: import("express-rate-limit").RateLimitRequestHandler;
    locationUpdate: import("express-rate-limit").RateLimitRequestHandler;
};
export declare const defaultRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const getRateLimitStats: () => {
    limits: {
        general: {
            windowMs: number;
            max: number;
        };
        auth: {
            windowMs: number;
            max: number;
        };
        assignments: {
            windowMs: number;
            max: number;
        };
        locations: {
            windowMs: number;
            max: number;
        };
        admin: {
            windowMs: number;
            max: number;
        };
        upload: {
            windowMs: number;
            max: number;
        };
    };
    userTiers: {
        free: {
            windowMs: number;
            max: number;
        };
        premium: {
            windowMs: number;
            max: number;
        };
        enterprise: {
            windowMs: number;
            max: number;
        };
    };
};
//# sourceMappingURL=advancedRateLimit.d.ts.map