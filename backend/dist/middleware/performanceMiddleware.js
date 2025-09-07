"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketPerformanceMiddleware = exports.databasePerformanceMiddleware = exports.performanceMiddleware = void 0;
const PerformanceMonitor_1 = require("../services/PerformanceMonitor");
const performanceMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const operation = `${req.method} ${req.path}`;
    PerformanceMonitor_1.performanceMonitor.trackOperation(operation, async () => {
        const originalEnd = res.end;
        res.end = function (chunk, encoding, cb) {
            const duration = Date.now() - startTime;
            if (duration > 1000) {
                console.warn(`🐌 Slow API request: ${operation} took ${duration}ms`);
            }
            return originalEnd.call(this, chunk, encoding, cb);
        };
        next();
    }, {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
    }).catch((error) => {
        console.error(`❌ Performance monitoring error for ${operation}:`, error);
        next(error);
    });
};
exports.performanceMiddleware = performanceMiddleware;
const databasePerformanceMiddleware = (operation) => {
    return async (queryFn) => {
        return PerformanceMonitor_1.performanceMonitor.trackOperation(`database:${operation}`, queryFn, {
            type: 'database',
            operation,
        });
    };
};
exports.databasePerformanceMiddleware = databasePerformanceMiddleware;
const websocketPerformanceMiddleware = (event) => {
    return async (handlerFn) => {
        return PerformanceMonitor_1.performanceMonitor.trackOperation(`websocket:${event}`, handlerFn, {
            type: 'websocket',
            event,
        });
    };
};
exports.websocketPerformanceMiddleware = websocketPerformanceMiddleware;
//# sourceMappingURL=performanceMiddleware.js.map