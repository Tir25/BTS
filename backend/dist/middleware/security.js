"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsSecurity = exports.validateRequest = exports.ipWhitelist = exports.uploadRateLimit = exports.authRateLimit = exports.apiRateLimit = exports.createRateLimit = exports.securityMiddleware = void 0;
const logger_1 = require("../utils/logger");
const securityMiddleware = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
    res.removeHeader('X-Powered-By');
    next();
};
exports.securityMiddleware = securityMiddleware;
const createRateLimit = (windowMs, max, message) => {
    return (req, res, next) => {
        next();
    };
};
exports.createRateLimit = createRateLimit;
const apiRateLimit = (req, res, next) => {
    next();
};
exports.apiRateLimit = apiRateLimit;
const authRateLimit = (req, res, next) => {
    next();
};
exports.authRateLimit = authRateLimit;
const uploadRateLimit = (req, res, next) => {
    next();
};
exports.uploadRateLimit = uploadRateLimit;
const ipWhitelist = (allowedIPs) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        if (allowedIPs.includes(clientIP || '')) {
            next();
        }
        else {
            logger_1.logger.warn('IP not whitelisted', 'security', { ip: clientIP });
            res.status(403).json({ error: 'Access denied' });
        }
    };
};
exports.ipWhitelist = ipWhitelist;
const validateRequest = (req, res, next) => {
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /union\s+select/i,
        /drop\s+table/i,
        /delete\s+from/i,
        /insert\s+into/i,
        /update\s+set/i
    ];
    const requestBody = JSON.stringify(req.body);
    const requestQuery = JSON.stringify(req.query);
    const requestParams = JSON.stringify(req.params);
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestBody) || pattern.test(requestQuery) || pattern.test(requestParams)) {
            logger_1.logger.warn('Suspicious request detected', 'security', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method,
                body: req.body,
                query: req.query
            });
            return res.status(400).json({ error: 'Invalid request' });
        }
    }
    next();
};
exports.validateRequest = validateRequest;
const corsSecurity = (req, res, next) => {
    const origin = req.get('Origin');
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    next();
};
exports.corsSecurity = corsSecurity;
//# sourceMappingURL=security.js.map