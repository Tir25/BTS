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
        console.log(`🔍 CORS: Checking origin: ${origin}`);
        console.log(`🔍 CORS: Allowed origins count: ${allowedOrigins.length}`);
        let isAllowed = false;
        isAllowed = allowedOrigins.some((allowedOrigin) => {
            if (typeof allowedOrigin === 'string') {
                const matches = allowedOrigin === origin;
                if (matches) {
                    console.log(`✅ CORS: String match found for: ${origin}`);
                }
                return matches;
            }
            else if (allowedOrigin instanceof RegExp) {
                const matches = allowedOrigin.test(origin);
                if (matches) {
                    console.log(`✅ CORS: Regex match found for: ${origin} with pattern: ${allowedOrigin}`);
                }
                return matches;
            }
            return false;
        });
        if (!isAllowed && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
            console.log(`🦊 CORS: Firefox compatibility - allowing localhost origin: ${origin}`);
            isAllowed = true;
        }
        if (!isAllowed && process.env.NODE_ENV !== 'production') {
            console.log(`🦊 CORS: Development mode - allowing all origins: ${origin}`);
            isAllowed = true;
        }
        if (isAllowed) {
            console.log(`✅ CORS: Allowed origin: ${origin}`);
            callback(null, true);
        }
        else {
            console.error(`❌ CORS blocked origin: ${origin}`);
            console.log('🔍 Allowed origins:', allowedOrigins);
            console.log('🔍 Environment:', process.env.NODE_ENV);
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
        'Cache-Control',
        'Pragma',
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
        console.log('🔄 CORS: Handling preflight request from:', req.headers.origin);
        let corsOrigin = req.headers.origin || '*';
        if (corsOrigin === '*' && req.headers.origin) {
            corsOrigin = req.headers.origin;
        }
        res.header('Access-Control-Allow-Origin', corsOrigin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Info, X-Client-Version, Cache-Control, Pragma');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400');
        res.header('X-Content-Type-Options', 'nosniff');
        res.header('X-Frame-Options', 'DENY');
        res.status(200).end();
        return;
    }
    next();
};
exports.handlePreflight = handlePreflight;
//# sourceMappingURL=cors.js.map