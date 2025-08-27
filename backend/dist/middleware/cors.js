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
    origin: function (origin, callback) {
        if (!origin) {
            console.log('🔄 CORS: Request with no origin (mobile app, curl, etc.)');
            return callback(null, true);
        }
        const allowedOrigins = environment.cors.allowedOrigins;
        const isAllowed = allowedOrigins.some((allowedOrigin) => {
            if (typeof allowedOrigin === 'string') {
                return allowedOrigin === origin;
            }
            else if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });
        if (isAllowed) {
            console.log(`✅ CORS: Allowed origin: ${origin}`);
            callback(null, true);
        }
        else {
            console.error(`❌ CORS blocked origin: ${origin}`);
            console.log('🔍 Allowed origins:', allowedOrigins);
            callback(new Error(`Origin ${origin} not allowed by CORS policy`));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Client-Info',
        'X-Client-Version',
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
        console.log('🔄 CORS: Handling preflight request');
        res.status(200).end();
        return;
    }
    next();
};
exports.handlePreflight = handlePreflight;
//# sourceMappingURL=cors.js.map