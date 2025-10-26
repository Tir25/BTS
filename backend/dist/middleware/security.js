"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsSecurity = exports.validateRequest = exports.ipWhitelist = exports.uploadRateLimit = exports.authRateLimit = exports.apiRateLimit = exports.createRateLimit = exports.securityMiddleware = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("../utils/logger");
const securityMiddleware = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.removeHeader('X-Powered-By');
    next();
};
exports.securityMiddleware = securityMiddleware;
const createRateLimit = (windowMs, max, message) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: message || 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            if (process.env.NODE_ENV === 'development')
                return true;
            if (req.path.startsWith('/health'))
                return true;
            return false;
        },
        handler: (req, res) => {
            logger_1.logger.warn('Rate limit exceeded', 'security', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method
            });
            res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    });
};
exports.createRateLimit = createRateLimit;
exports.apiRateLimit = (0, exports.createRateLimit)(15 * 60 * 1000, 5000, 'API rate limit exceeded');
exports.authRateLimit = (0, exports.createRateLimit)(15 * 60 * 1000, 5, 'Authentication rate limit exceeded');
exports.uploadRateLimit = (0, exports.createRateLimit)(60 * 1000, 10, 'Upload rate limit exceeded');
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