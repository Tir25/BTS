"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitoring = exports.memoryMonitoring = exports.errorMonitoring = exports.requestMonitoring = void 0;
const MonitoringService_1 = require("../services/MonitoringService");
const logger_1 = require("../utils/logger");
const requestMonitoring = (req, res, next) => {
    const startTime = Date.now();
    const originalEnd = res.end;
    res.end = function (chunk, encoding, cb) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const isError = res.statusCode >= 400;
        MonitoringService_1.monitoringService.recordRequest(responseTime, isError);
        if (responseTime > 1000) {
            logger_1.logger.warn('Slow request detected', 'monitoring', {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                responseTime: `${responseTime}ms`,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
        }
        return originalEnd.call(this, chunk, encoding, cb);
    };
    next();
};
exports.requestMonitoring = requestMonitoring;
const errorMonitoring = (error, req, res, next) => {
    MonitoringService_1.monitoringService.recordRequest(0, true);
    logger_1.logger.error('Request error', 'monitoring', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next(error);
};
exports.errorMonitoring = errorMonitoring;
const memoryMonitoring = (req, res, next) => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    if (heapUsedMB > 300) {
        logger_1.logger.warn('High memory usage detected', 'monitoring', {
            heapUsedMB,
            path: req.path,
            method: req.method,
            memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024)
            }
        });
    }
    next();
};
exports.memoryMonitoring = memoryMonitoring;
const performanceMonitoring = (req, res, next) => {
    const startTime = process.hrtime.bigint();
    const originalEnd = res.end;
    res.end = function (chunk, encoding, cb) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        logger_1.logger.debug('Request performance', 'monitoring', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration.toFixed(2)}ms`,
            ip: req.ip
        });
        return originalEnd.call(this, chunk, encoding, cb);
    };
    next();
};
exports.performanceMonitoring = performanceMonitoring;
//# sourceMappingURL=monitoring.js.map