"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsMiddleware = void 0;
const cors_1 = __importDefault(require("cors"));
const environment_1 = __importDefault(require("../config/environment"));
const environment = (0, environment_1.default)();
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
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
            callback(null, true);
        }
        else {
            console.error(`❌ CORS blocked origin: ${origin}`);
            callback(new Error(`Origin ${origin} not allowed by CORS policy`));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};
exports.corsMiddleware = (0, cors_1.default)(corsOptions);
//# sourceMappingURL=cors.js.map