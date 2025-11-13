"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const securityEnhanced_1 = require("../middleware/securityEnhanced");
const redisCache_1 = require("../middleware/redisCache");
const rateLimit_1 = require("../middleware/rateLimit");
const environment_1 = __importDefault(require("../config/environment"));
const health_1 = __importDefault(require("../routes/health"));
const auth_1 = __importDefault(require("../routes/auth"));
const buses_1 = __importDefault(require("../routes/buses"));
const routes_1 = __importDefault(require("../routes/routes"));
const admin_1 = __importDefault(require("../routes/admin"));
const productionAssignments_1 = __importDefault(require("../routes/productionAssignments"));
const optimizedAssignments_1 = __importDefault(require("../routes/optimizedAssignments"));
const storage_1 = __importDefault(require("../routes/storage"));
const tracking_1 = __importDefault(require("../routes/tracking"));
const student_1 = __importDefault(require("../routes/student"));
const locations_1 = __importDefault(require("../routes/locations"));
const sse_1 = __importDefault(require("../routes/sse"));
const monitoring_1 = __importDefault(require("../routes/monitoring"));
function registerRoutes(app) {
    const rateLimitingEnabled = process.env.DISABLE_RATE_LIMIT?.toLowerCase() !== 'true' &&
        environment_1.default.security.enableRateLimit;
    app.use('/health', health_1.default);
    app.use('/auth', process.env.NODE_ENV === 'production' && rateLimitingEnabled
        ? rateLimit_1.authRateLimit
        : (req, _res, next) => next(), auth_1.default);
    app.use('/admin', securityEnhanced_1.fileUploadValidator, admin_1.default);
    app.use('/assignments', productionAssignments_1.default);
    app.use('/production-assignments', productionAssignments_1.default);
    app.use('/assignments-optimized', optimizedAssignments_1.default);
    app.use('/buses', (0, redisCache_1.smartCacheMiddleware)({
        dataTypeTTL: { 'buses': 600 }
    }), buses_1.default);
    app.use('/routes', (0, redisCache_1.smartCacheMiddleware)({
        dataTypeTTL: { 'routes': 1800 }
    }), routes_1.default);
    app.use('/storage', securityEnhanced_1.fileUploadValidator, storage_1.default);
    app.use('/locations', (0, redisCache_1.smartCacheMiddleware)({
        dataTypeTTL: { 'locations': 60 }
    }), locations_1.default);
    app.use('/tracking', tracking_1.default);
    app.use('/student', student_1.default);
    app.use('/sse', sse_1.default);
    app.use('/monitoring', monitoring_1.default);
}
//# sourceMappingURL=routes.js.map