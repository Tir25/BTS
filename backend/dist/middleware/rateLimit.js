"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimit = exports.rateLimitMiddleware = void 0;
const rateLimitMiddleware = (req, res, next) => {
    next();
};
exports.rateLimitMiddleware = rateLimitMiddleware;
const authRateLimit = (req, res, next) => {
    next();
};
exports.authRateLimit = authRateLimit;
//# sourceMappingURL=rateLimit.js.map