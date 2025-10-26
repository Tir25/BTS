"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressionMonitor = exports.requestSizeLimit = exports.memoryMonitor = exports.performanceMonitor = void 0;
const logger_1 = require("../utils/logger");
const performanceMonitor = (req, res, next) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    const originalEnd = res.end;
    res.end = function (chunk, encoding, cb) {
        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        const responseTime = endTime - startTime;
        logger_1.logger.info('Request completed', 'performance', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            memoryUsage: {
                rss: `${Math.round((endMemory.rss - startMemory.rss) / 1024 / 1024)}MB`,
                heapUsed: `${Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024)}MB`
            },
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        return originalEnd.call(this, chunk, encoding, cb);
    };
    next();
};
exports.performanceMonitor = performanceMonitor;
const memoryMonitor = (req, res, next) => {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
    };
    if (memoryUsageMB.heapUsed > 300) {
        logger_1.logger.warn('High memory usage detected in request', 'performance', {
            ...memoryUsageMB,
            path: req.path,
            method: req.method
        });
    }
    res.setHeader('X-Memory-Usage', JSON.stringify(memoryUsageMB));
    next();
};
exports.memoryMonitor = memoryMonitor;
const requestSizeLimit = (maxSize) => {
    return (req, res, next) => {
        const contentLength = parseInt(req.get('Content-Length') || '0');
        if (contentLength > maxSize) {
            logger_1.logger.warn('Request size exceeded', 'performance', {
                contentLength,
                maxSize,
                ip: req.ip,
                path: req.path
            });
            return res.status(413).json({ error: 'Request entity too large' });
        }
        next();
    };
};
exports.requestSizeLimit = requestSizeLimit;
const compressionMonitor = (req, res, next) => {
    const originalWrite = res.write;
    const originalEnd = res.end;
    let responseSize = 0;
    res.write = function (chunk, encoding, cb) {
        if (chunk) {
            responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
        }
        return originalWrite.call(this, chunk, encoding, cb);
    };
    res.end = function (chunk, encoding, cb) {
        if (chunk) {
            responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
        }
        if (responseSize > 1024 * 1024) {
            logger_1.logger.warn('Large response detected', 'performance', {
                path: req.path,
                responseSize: `${Math.round(responseSize / 1024)}KB`,
                statusCode: res.statusCode
            });
        }
        return originalEnd.call(this, chunk, encoding, cb);
    };
    next();
};
exports.compressionMonitor = compressionMonitor;
//# sourceMappingURL=performance.js.map