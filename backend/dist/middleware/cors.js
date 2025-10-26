"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePreflight = exports.corsMiddleware = void 0;
const cors_1 = __importDefault(require("cors"));
const corsOptions = {
    origin: function (origin, callback) {
        return callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 204,
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
        'X-Request-ID',
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
        let corsOrigin = req.headers.origin || '*';
        if (corsOrigin === '*' && req.headers.origin) {
            corsOrigin = req.headers.origin;
        }
        res.header('Access-Control-Allow-Origin', corsOrigin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Info, X-Client-Version, Cache-Control, Pragma, X-Request-ID');
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