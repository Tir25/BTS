"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipWhitelist = exports.fileUploadValidator = exports.securityHeaders = exports.requestValidator = exports.requestSizeValidator = exports.securityManager = exports.SecurityManager = void 0;
const helmet_1 = __importDefault(require("helmet"));
const logger_1 = require("../utils/logger");
const environment_1 = __importDefault(require("../config/environment"));
class SecurityManager {
    constructor() {
        this.requestSizeValidator = (req, res, next) => {
            const contentLength = parseInt(req.headers['content-length'] || '0');
            if (contentLength > this.config.maxRequestSize) {
                logger_1.logger.warn('Request size exceeded', 'security', {
                    contentLength,
                    maxSize: this.config.maxRequestSize,
                    ip: req.ip,
                    path: req.path
                });
                res.status(413).json({
                    error: 'Request entity too large',
                    maxSize: this.config.maxRequestSize
                });
                return;
            }
            next();
        };
        this.requestValidator = (req, res, next) => {
            const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
            if (!allowedMethods.includes(req.method)) {
                logger_1.logger.warn('Invalid request method', 'security', {
                    method: req.method,
                    ip: req.ip,
                    path: req.path
                });
                res.status(405).json({
                    error: 'Method not allowed',
                    allowedMethods
                });
                return;
            }
            if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                const contentType = req.headers['content-type'];
                const allowedContentTypes = [
                    'application/json',
                    'application/x-www-form-urlencoded',
                    'multipart/form-data'
                ];
                if (contentType && !allowedContentTypes.some(type => contentType.includes(type))) {
                    logger_1.logger.warn('Invalid content type', 'security', {
                        contentType,
                        ip: req.ip,
                        path: req.path
                    });
                    res.status(415).json({
                        error: 'Unsupported media type',
                        allowedContentTypes
                    });
                    return;
                }
            }
            next();
        };
        this.securityHeaders = (req, res, next) => {
            res.removeHeader('X-Powered-By');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
            const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            res.setHeader('X-Request-ID', requestId);
            next();
        };
        this.fileUploadValidator = (req, res, next) => {
            if (req.file) {
                if (!this.config.allowedFileTypes.includes(req.file.mimetype)) {
                    logger_1.logger.warn('Invalid file type uploaded', 'security', {
                        mimetype: req.file.mimetype,
                        allowedTypes: this.config.allowedFileTypes,
                        ip: req.ip
                    });
                    res.status(400).json({
                        error: 'Invalid file type',
                        allowedTypes: this.config.allowedFileTypes
                    });
                    return;
                }
                if (req.file.size > this.config.maxFileSize) {
                    logger_1.logger.warn('File size exceeded', 'security', {
                        fileSize: req.file.size,
                        maxSize: this.config.maxFileSize,
                        ip: req.ip
                    });
                    res.status(400).json({
                        error: 'File too large',
                        maxSize: this.config.maxFileSize
                    });
                    return;
                }
            }
            next();
        };
        this.ipWhitelist = (allowedIPs) => {
            return (req, res, next) => {
                const clientIP = req.ip || req.connection.remoteAddress;
                if (!allowedIPs.includes(clientIP || '')) {
                    logger_1.logger.warn('IP not in whitelist', 'security', {
                        ip: clientIP,
                        allowedIPs,
                        path: req.path
                    });
                    res.status(403).json({
                        error: 'Access denied',
                        message: 'Your IP address is not authorized'
                    });
                    return;
                }
                next();
            };
        };
        this.config = {
            enableHelmet: environment_1.default.security.enableHelmet,
            enableCors: environment_1.default.security.enableCors,
            enableRateLimit: environment_1.default.security.enableRateLimit,
            enableRequestValidation: true,
            enableSecurityHeaders: true,
            maxRequestSize: 10 * 1024 * 1024,
            allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            maxFileSize: 5 * 1024 * 1024
        };
    }
    static getInstance() {
        if (!SecurityManager.instance) {
            SecurityManager.instance = new SecurityManager();
        }
        return SecurityManager.instance;
    }
    getHelmetConfig() {
        return (0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                    imgSrc: ["'self'", "data:", "https:", "blob:"],
                    connectSrc: ["'self'", "ws:", "wss:", "https:"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                    upgradeInsecureRequests: []
                }
            },
            crossOriginEmbedderPolicy: false,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            noSniff: true,
            xssFilter: true,
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
        });
    }
    getRateLimitConfig() {
        return (req, res, next) => {
            next();
        };
    }
    getAuthRateLimitConfig() {
        return (req, res, next) => {
            next();
        };
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        logger_1.logger.info('Security configuration updated', 'security', { config: this.config });
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.SecurityManager = SecurityManager;
exports.securityManager = SecurityManager.getInstance();
exports.requestSizeValidator = exports.securityManager.requestSizeValidator;
exports.requestValidator = exports.securityManager.requestValidator;
exports.securityHeaders = exports.securityManager.securityHeaders;
exports.fileUploadValidator = exports.securityManager.fileUploadValidator;
exports.ipWhitelist = exports.securityManager.ipWhitelist;
//# sourceMappingURL=securityEnhanced.js.map