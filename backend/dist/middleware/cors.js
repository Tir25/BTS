"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePreflight = exports.corsMiddleware = void 0;
const cors_1 = __importDefault(require("cors"));
const environment_1 = __importDefault(require("../config/environment"));
const environment = (0, environment_1.default)();
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        const allowedOrigins = environment.cors.allowedOrigins;
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (typeof allowedOrigin === 'string') {
                return allowedOrigin === origin;
            }
            else if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });
        if (isAllowed) {
            callback(null, true);
        }
        else {
            console.warn(`🚫 CORS: Blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true,
    optionsSuccessStatus: 204,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'User-Agent',
        'Cache-Control',
        'Pragma'
    ],
    exposedHeaders: [
        'X-Total-Count',
        'X-Page-Count',
        'X-Current-Page',
        'X-Per-Page',
    ],
};
exports.corsMiddleware = (0, cors_1.default)(corsOptions);
const handlePreflight = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        console.log('🔄 CORS: Handling preflight request from:', origin);
        const allowedOrigins = environment.cors.allowedOrigins;
        let isOriginAllowed = false;
        let allowedOrigin = null;
        if (!origin) {
            isOriginAllowed = true;
        }
        else {
            for (const allowed of allowedOrigins) {
                if (typeof allowed === 'string' && allowed === origin) {
                    isOriginAllowed = true;
                    allowedOrigin = origin;
                    break;
                }
                else if (allowed instanceof RegExp && allowed.test(origin)) {
                    isOriginAllowed = true;
                    allowedOrigin = origin;
                    break;
                }
            }
        }
        if (isOriginAllowed) {
            res.header('Access-Control-Allow-Origin', allowedOrigin || '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent, Cache-Control, Pragma');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', '86400');
            res.header('X-Content-Type-Options', 'nosniff');
            res.header('X-Frame-Options', 'DENY');
            res.header('X-XSS-Protection', '1; mode=block');
            res.status(200).end();
            return;
        }
        else {
            console.warn(`🚫 CORS: Blocked preflight request from origin: ${origin}`);
            res.status(403).json({
                error: 'CORS policy violation',
                message: 'Origin not allowed',
                origin: origin
            });
            return;
        }
    }
    next();
};
exports.handlePreflight = handlePreflight;
//# sourceMappingURL=cors.js.map