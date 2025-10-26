"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryOptimizer = exports.forceGarbageCollection = exports.getMemoryStats = exports.memoryLeakDetection = exports.memoryOptimizationMiddleware = void 0;
const logger_1 = require("../utils/logger");
const defaultMemoryConfig = {
    warningThreshold: 300 * 1024 * 1024,
    criticalThreshold: 400 * 1024 * 1024,
    emergencyThreshold: 500 * 1024 * 1024,
    gcInterval: 2 * 60 * 1000,
    cleanupInterval: 5 * 60 * 1000
};
class MemoryOptimizer {
    constructor(config = defaultMemoryConfig) {
        this.gcTimer = null;
        this.cleanupTimer = null;
        this.memoryHistory = [];
        this.maxHistorySize = 100;
        this.config = config;
        this.startMonitoring();
    }
    startMonitoring() {
        this.gcTimer = setInterval(() => {
            this.performGarbageCollection();
        }, this.config.gcInterval);
        this.cleanupTimer = setInterval(() => {
            this.performCleanup();
        }, this.config.cleanupInterval);
        logger_1.logger.info('Memory optimization monitoring started', 'memory-optimizer');
    }
    performGarbageCollection() {
        const memoryUsage = process.memoryUsage();
        const heapUsed = memoryUsage.heapUsed;
        this.recordMemoryUsage(heapUsed);
        if (heapUsed > this.config.emergencyThreshold) {
            logger_1.logger.error('Emergency memory threshold exceeded', 'memory-optimizer', {
                heapUsed: Math.round(heapUsed / 1024 / 1024),
                threshold: 'EMERGENCY'
            });
            if (global.gc) {
                global.gc();
                logger_1.logger.info('Emergency garbage collection triggered', 'memory-optimizer');
            }
        }
        else if (heapUsed > this.config.criticalThreshold) {
            logger_1.logger.warn('Critical memory threshold exceeded', 'memory-optimizer', {
                heapUsed: Math.round(heapUsed / 1024 / 1024),
                threshold: 'CRITICAL'
            });
            if (global.gc) {
                global.gc();
                logger_1.logger.info('Critical garbage collection triggered', 'memory-optimizer');
            }
        }
        else if (heapUsed > this.config.warningThreshold) {
            logger_1.logger.warn('Memory usage warning', 'memory-optimizer', {
                heapUsed: Math.round(heapUsed / 1024 / 1024),
                threshold: 'WARNING'
            });
        }
    }
    performCleanup() {
        if (this.memoryHistory.length > this.maxHistorySize) {
            this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
        }
        this.cleanupCaches();
        this.logMemoryStatistics();
    }
    recordMemoryUsage(heapUsed) {
        this.memoryHistory.push({
            timestamp: Date.now(),
            usage: heapUsed
        });
        if (this.memoryHistory.length > this.maxHistorySize) {
            this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
        }
    }
    cleanupCaches() {
        logger_1.logger.debug('Performing cache cleanup', 'memory-optimizer');
    }
    logMemoryStatistics() {
        const memoryUsage = process.memoryUsage();
        const stats = {
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024),
            arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024)
        };
        logger_1.logger.info('Memory statistics', 'memory-optimizer', stats);
    }
    getMemoryStats() {
        const memoryUsage = process.memoryUsage();
        const history = this.memoryHistory.slice(-10);
        return {
            current: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024),
                arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024)
            },
            history: history.map(h => ({
                timestamp: new Date(h.timestamp).toISOString(),
                usage: Math.round(h.usage / 1024 / 1024)
            })),
            thresholds: {
                warning: Math.round(this.config.warningThreshold / 1024 / 1024),
                critical: Math.round(this.config.criticalThreshold / 1024 / 1024),
                emergency: Math.round(this.config.emergencyThreshold / 1024 / 1024)
            }
        };
    }
    stop() {
        if (this.gcTimer) {
            clearInterval(this.gcTimer);
            this.gcTimer = null;
        }
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        logger_1.logger.info('Memory optimization monitoring stopped', 'memory-optimizer');
    }
}
const memoryOptimizer = new MemoryOptimizer();
exports.memoryOptimizer = memoryOptimizer;
const memoryOptimizationMiddleware = (req, res, next) => {
    const startMemory = process.memoryUsage();
    const originalEnd = res.end;
    res.end = function (chunk, encoding, cb) {
        const endMemory = process.memoryUsage();
        const memoryDelta = {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            external: endMemory.external - startMemory.external
        };
        if (memoryDelta.heapUsed > 10 * 1024 * 1024) {
            logger_1.logger.warn('High memory usage request', 'memory-optimizer', {
                path: req.path,
                method: req.method,
                memoryDelta: {
                    rss: Math.round(memoryDelta.rss / 1024 / 1024),
                    heapUsed: Math.round(memoryDelta.heapUsed / 1024 / 1024),
                    external: Math.round(memoryDelta.external / 1024 / 1024)
                }
            });
        }
        return originalEnd.call(this, chunk, encoding, cb);
    };
    next();
};
exports.memoryOptimizationMiddleware = memoryOptimizationMiddleware;
const memoryLeakDetection = (req, res, next) => {
    const startMemory = process.memoryUsage();
    const checkMemoryLeak = () => {
        const currentMemory = process.memoryUsage();
        const memoryGrowth = currentMemory.heapUsed - startMemory.heapUsed;
        if (memoryGrowth > 50 * 1024 * 1024) {
            logger_1.logger.warn('Potential memory leak detected', 'memory-optimizer', {
                path: req.path,
                method: req.method,
                memoryGrowth: Math.round(memoryGrowth / 1024 / 1024),
                currentHeap: Math.round(currentMemory.heapUsed / 1024 / 1024)
            });
        }
    };
    res.on('finish', checkMemoryLeak);
    res.on('close', checkMemoryLeak);
    next();
};
exports.memoryLeakDetection = memoryLeakDetection;
const getMemoryStats = (req, res) => {
    try {
        const stats = memoryOptimizer.getMemoryStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting memory stats', 'memory-optimizer', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to get memory statistics'
        });
    }
};
exports.getMemoryStats = getMemoryStats;
const forceGarbageCollection = (req, res) => {
    try {
        if (global.gc) {
            const beforeMemory = process.memoryUsage();
            global.gc();
            const afterMemory = process.memoryUsage();
            const freed = beforeMemory.heapUsed - afterMemory.heapUsed;
            logger_1.logger.info('Manual garbage collection performed', 'memory-optimizer', {
                freed: Math.round(freed / 1024 / 1024)
            });
            res.json({
                success: true,
                message: 'Garbage collection completed',
                freed: Math.round(freed / 1024 / 1024),
                before: Math.round(beforeMemory.heapUsed / 1024 / 1024),
                after: Math.round(afterMemory.heapUsed / 1024 / 1024)
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: 'Garbage collection not available (run with --expose-gc)'
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Error during garbage collection', 'memory-optimizer', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to perform garbage collection'
        });
    }
};
exports.forceGarbageCollection = forceGarbageCollection;
process.on('SIGTERM', () => {
    memoryOptimizer.stop();
});
process.on('SIGINT', () => {
    memoryOptimizer.stop();
});
//# sourceMappingURL=memoryOptimization.js.map