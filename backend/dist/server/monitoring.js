"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMemoryMonitoring = setupMemoryMonitoring;
const logger_1 = require("../utils/logger");
const serverConfig_1 = require("./config/serverConfig");
function setupMemoryMonitoring() {
    setInterval(() => {
        const memoryUsage = process.memoryUsage();
        const heapUsed = memoryUsage.heapUsed;
        const memoryMB = Math.round(heapUsed / 1024 / 1024);
        if (heapUsed > serverConfig_1.SERVER_CONFIG.MEMORY_WARNING_THRESHOLD) {
            logger_1.logger.warn('Memory usage warning', 'server', {
                memoryMB,
                heapUsed,
                heapTotal: memoryUsage.heapTotal,
                external: memoryUsage.external,
                rss: memoryUsage.rss,
                threshold: 'WARNING'
            });
        }
        if (heapUsed > serverConfig_1.SERVER_CONFIG.MEMORY_CRITICAL_THRESHOLD && global.gc) {
            logger_1.logger.warn('Memory usage critical - triggering garbage collection', 'server', {
                memoryMB,
                threshold: 'CRITICAL'
            });
            global.gc();
            const postGcMemory = process.memoryUsage();
            const postGcMB = Math.round(postGcMemory.heapUsed / 1024 / 1024);
            logger_1.logger.info('Garbage collection completed', 'server', {
                beforeMB: memoryMB,
                afterMB: postGcMB,
                reduction: memoryMB - postGcMB
            });
        }
        if (heapUsed > serverConfig_1.SERVER_CONFIG.MEMORY_EMERGENCY_THRESHOLD) {
            logger_1.logger.error('Memory usage emergency - considering restart', 'server', {
                memoryMB,
                threshold: 'EMERGENCY'
            });
            if (process.env.NODE_ENV === 'production') {
                logger_1.logger.error('Emergency memory threshold exceeded - graceful shutdown initiated', 'server');
                process.kill(process.pid, 'SIGTERM');
            }
        }
    }, serverConfig_1.SERVER_CONFIG.MEMORY_CHECK_INTERVAL);
}
//# sourceMappingURL=monitoring.js.map