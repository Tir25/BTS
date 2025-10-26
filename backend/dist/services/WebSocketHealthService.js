"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSocketHealth = exports.WebSocketHealthService = void 0;
const logger_1 = require("../utils/logger");
class WebSocketHealthService {
    constructor() {
        this.io = null;
        this.startTime = Date.now();
        this.eventCount = 0;
        this.errorCount = 0;
        this.bytesTransferred = 0;
        this.lastActivity = Date.now();
        this.performanceInterval = null;
        this.eventsPerSecond = 0;
        this.bytesPerSecond = 0;
        this.startPerformanceMonitoring();
    }
    initialize(io) {
        this.io = io;
        this.startTime = Date.now();
        io.on('connection', (socket) => {
            this.lastActivity = Date.now();
            this.monitorSocket(socket);
        });
        io.on('disconnect', () => {
            this.lastActivity = Date.now();
        });
        logger_1.logger.info('WebSocket health monitoring initialized', 'websocket-health');
    }
    getHealth() {
        if (!this.io) {
            return {
                connected: false,
                activeConnections: 0,
                totalConnections: 0,
                driverConnections: 0,
                studentConnections: 0,
                adminConnections: 0,
                averageLatency: 0,
                errorRate: 0,
                uptime: 0,
                lastActivity: new Date(this.lastActivity).toISOString(),
                performance: {
                    eventsPerSecond: 0,
                    bytesPerSecond: 0,
                    memoryUsage: 0
                }
            };
        }
        const sockets = this.io.sockets.sockets;
        const totalConnections = sockets.size;
        let driverConnections = 0;
        let studentConnections = 0;
        let adminConnections = 0;
        sockets.forEach((socket) => {
            if (socket.userRole === 'driver')
                driverConnections++;
            else if (socket.userRole === 'student')
                studentConnections++;
            else if (socket.userRole === 'admin')
                adminConnections++;
        });
        const uptime = Date.now() - this.startTime;
        const errorRate = this.eventCount > 0 ? (this.errorCount / this.eventCount) * 100 : 0;
        return {
            connected: true,
            activeConnections: totalConnections,
            totalConnections,
            driverConnections,
            studentConnections,
            adminConnections,
            averageLatency: this.calculateAverageLatency(),
            errorRate: Math.round(errorRate * 100) / 100,
            uptime: Math.round(uptime / 1000),
            lastActivity: new Date(this.lastActivity).toISOString(),
            performance: {
                eventsPerSecond: this.eventsPerSecond,
                bytesPerSecond: this.bytesPerSecond,
                memoryUsage: this.getMemoryUsage()
            }
        };
    }
    getStats() {
        if (!this.io) {
            return {
                connections: {
                    total: 0,
                    drivers: 0,
                    students: 0,
                    admins: 0,
                    anonymous: 0
                },
                performance: {
                    eventsPerSecond: 0,
                    bytesPerSecond: 0,
                    averageLatency: 0,
                    errorRate: 0
                },
                memory: {
                    used: 0,
                    peak: 0
                }
            };
        }
        const sockets = this.io.sockets.sockets;
        const totalConnections = sockets.size;
        let drivers = 0;
        let students = 0;
        let admins = 0;
        let anonymous = 0;
        sockets.forEach((socket) => {
            if (socket.userRole === 'driver')
                drivers++;
            else if (socket.userRole === 'student')
                students++;
            else if (socket.userRole === 'admin')
                admins++;
            else
                anonymous++;
        });
        const errorRate = this.eventCount > 0 ? (this.errorCount / this.eventCount) * 100 : 0;
        return {
            connections: {
                total: totalConnections,
                drivers,
                students,
                admins,
                anonymous
            },
            performance: {
                eventsPerSecond: this.eventsPerSecond,
                bytesPerSecond: this.bytesPerSecond,
                averageLatency: this.calculateAverageLatency(),
                errorRate: Math.round(errorRate * 100) / 100
            },
            memory: {
                used: this.getMemoryUsage(),
                peak: this.getPeakMemoryUsage()
            }
        };
    }
    recordEvent(bytes = 0) {
        this.eventCount++;
        this.bytesTransferred += bytes;
        this.lastActivity = Date.now();
    }
    recordError() {
        this.errorCount++;
        this.lastActivity = Date.now();
    }
    isHealthy() {
        if (!this.io)
            return false;
        const health = this.getHealth();
        const uptime = Date.now() - this.startTime;
        const noConnectionsTooLong = health.activeConnections === 0 && uptime > 5 * 60 * 1000;
        const errorRateTooHigh = health.errorRate > 50;
        const noActivityTooLong = Date.now() - this.lastActivity > 10 * 60 * 1000;
        return !noConnectionsTooLong && !errorRateTooHigh && !noActivityTooLong;
    }
    getConnectionMetrics() {
        if (!this.io)
            return null;
        const sockets = this.io.sockets.sockets;
        const metrics = {
            totalConnections: sockets.size,
            connectionTypes: {
                drivers: 0,
                students: 0,
                admins: 0,
                anonymous: 0
            },
            averageConnectionAge: 0,
            oldestConnection: 0,
            newestConnection: 0
        };
        let totalAge = 0;
        let oldestTime = Date.now();
        let newestTime = 0;
        sockets.forEach((socket) => {
            const connectionTime = socket.connectedAt || Date.now();
            const age = Date.now() - connectionTime;
            totalAge += age;
            oldestTime = Math.min(oldestTime, connectionTime);
            newestTime = Math.max(newestTime, connectionTime);
            if (socket.userRole === 'driver')
                metrics.connectionTypes.drivers++;
            else if (socket.userRole === 'student')
                metrics.connectionTypes.students++;
            else if (socket.userRole === 'admin')
                metrics.connectionTypes.admins++;
            else
                metrics.connectionTypes.anonymous++;
        });
        if (sockets.size > 0) {
            metrics.averageConnectionAge = Math.round(totalAge / sockets.size);
            metrics.oldestConnection = Date.now() - oldestTime;
            metrics.newestConnection = Date.now() - newestTime;
        }
        return metrics;
    }
    monitorSocket(socket) {
        socket.connectedAt = Date.now();
        const originalEmit = socket.emit;
        socket.emit = function (event, ...args) {
            try {
                const result = originalEmit.call(this, event, ...args);
                if (this.healthService) {
                    this.healthService.recordEvent();
                }
                return result;
            }
            catch (error) {
                if (this.healthService) {
                    this.healthService.recordError();
                }
                throw error;
            }
        };
        socket.on('disconnect', () => {
            this.lastActivity = Date.now();
        });
        socket.on('error', (error) => {
            this.recordError();
            logger_1.logger.error('WebSocket socket error', 'websocket-health', {
                socketId: socket.id,
                error: error.message
            });
        });
    }
    startPerformanceMonitoring() {
        this.performanceInterval = setInterval(() => {
            const now = Date.now();
            const timeDiff = (now - this.startTime) / 1000;
            if (timeDiff > 0) {
                this.eventsPerSecond = Math.round(this.eventCount / timeDiff);
                this.bytesPerSecond = Math.round(this.bytesTransferred / timeDiff);
            }
        }, 5000);
    }
    calculateAverageLatency() {
        return 0;
    }
    getMemoryUsage() {
        const memoryUsage = process.memoryUsage();
        return Math.round(memoryUsage.heapUsed / 1024 / 1024);
    }
    getPeakMemoryUsage() {
        const memoryUsage = process.memoryUsage();
        return Math.round(memoryUsage.heapTotal / 1024 / 1024);
    }
    stop() {
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
            this.performanceInterval = null;
        }
    }
}
exports.WebSocketHealthService = WebSocketHealthService;
exports.webSocketHealth = new WebSocketHealthService();
//# sourceMappingURL=WebSocketHealthService.js.map