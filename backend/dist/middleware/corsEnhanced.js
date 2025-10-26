"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketCors = exports.corsMiddleware = exports.corsManager = exports.CorsManager = void 0;
const logger_1 = require("../utils/logger");
const environment_1 = __importDefault(require("../config/environment"));
class CorsManager {
    constructor() {
        this.corsMiddleware = (req, res, next) => {
            const origin = req.headers.origin;
            const method = req.method;
            if (environment_1.default.logging.enableDebugLogs) {
                logger_1.logger.debug('CORS request', 'cors', {
                    origin,
                    method,
                    userAgent: req.headers['user-agent'],
                    ip: req.ip
                });
            }
            if (origin) {
                res.setHeader('Access-Control-Allow-Origin', origin);
            }
            else {
                res.setHeader('Access-Control-Allow-Origin', '*');
            }
            res.setHeader('Access-Control-Allow-Credentials', this.options.credentials.toString());
            res.setHeader('Access-Control-Allow-Methods', this.options.methods.join(', '));
            res.setHeader('Access-Control-Allow-Headers', this.options.allowedHeaders.join(', '));
            res.setHeader('Access-Control-Expose-Headers', this.options.exposedHeaders.join(', '));
            res.setHeader('Access-Control-Max-Age', this.options.maxAge.toString());
            if (method === 'OPTIONS') {
                res.status(200).end();
                return;
            }
            next();
        };
        this.websocketCors = (req, res, next) => {
            const origin = req.headers.origin;
            next();
        };
        this.options = {
            origin: environment_1.default.cors.allowedOrigins,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
            credentials: environment_1.default.cors.credentials,
            allowedHeaders: [
                'Origin',
                'X-Requested-With',
                'Content-Type',
                'Accept',
                'Authorization',
                'Cache-Control',
                'Pragma',
                'X-Request-ID',
                'X-API-Key'
            ],
            exposedHeaders: [
                'X-Request-ID',
                'X-Rate-Limit-Remaining',
                'X-Rate-Limit-Reset'
            ],
            maxAge: 86400
        };
    }
    static getInstance() {
        if (!CorsManager.instance) {
            CorsManager.instance = new CorsManager();
        }
        return CorsManager.instance;
    }
    isOriginAllowed(origin) {
        if (!origin)
            return false;
        return this.options.origin.some(allowedOrigin => {
            if (typeof allowedOrigin === 'string') {
                return allowedOrigin === origin;
            }
            else if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });
    }
    updateConfig(newOptions) {
        this.options = { ...this.options, ...newOptions };
        logger_1.logger.info('CORS configuration updated', 'cors', { options: this.options });
    }
    getConfig() {
        return { ...this.options };
    }
}
exports.CorsManager = CorsManager;
exports.corsManager = CorsManager.getInstance();
exports.corsMiddleware = exports.corsManager.corsMiddleware;
exports.websocketCors = exports.corsManager.websocketCors;
//# sourceMappingURL=corsEnhanced.js.map