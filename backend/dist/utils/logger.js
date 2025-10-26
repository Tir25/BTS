"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDebug = exports.logInfo = exports.logWarn = exports.logError = exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.isProduction = process.env.NODE_ENV === 'production';
    }
    formatLogEntry(entry) {
        if (this.isDevelopment) {
            const timestamp = new Date(entry.timestamp).toISOString();
            const level = entry.level.toUpperCase().padEnd(5);
            const service = entry.service.padEnd(10);
            const requestId = entry.requestId ? `[${entry.requestId}]` : '';
            const userId = entry.userId ? `[User:${entry.userId}]` : '';
            let logLine = `${timestamp} ${level} ${service} ${requestId} ${userId} ${entry.message}`;
            if (entry.metadata && Object.keys(entry.metadata).length > 0) {
                logLine += ` | Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
            }
            if (entry.error) {
                logLine += ` | Error: ${entry.error.name}: ${entry.error.message}`;
                if (entry.error.stack) {
                    logLine += `\nStack: ${entry.error.stack}`;
                }
            }
            return logLine;
        }
        else {
            return JSON.stringify(entry);
        }
    }
    log(level, message, service, metadata, error, req) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            service,
            requestId: req?.id || req?.headers['x-request-id'],
            userId: req?.user?.id,
            metadata,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: this.isDevelopment ? error.stack : undefined
            } : undefined
        };
        const formattedLog = this.formatLogEntry(entry);
        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedLog);
                break;
            case LogLevel.WARN:
                console.warn(formattedLog);
                break;
            case LogLevel.INFO:
                console.info(formattedLog);
                break;
            case LogLevel.DEBUG:
                if (this.isDevelopment) {
                    console.debug(formattedLog);
                }
                break;
        }
    }
    error(message, service, metadata, error, req) {
        this.log(LogLevel.ERROR, message, service, metadata, error, req);
    }
    warn(message, service, metadata, req) {
        this.log(LogLevel.WARN, message, service, metadata, undefined, req);
    }
    info(message, service, metadata, req) {
        this.log(LogLevel.INFO, message, service, metadata, undefined, req);
    }
    debug(message, service, metadata, req) {
        this.log(LogLevel.DEBUG, message, service, metadata, undefined, req);
    }
    auth(message, metadata, error, req) {
        this.info(message, 'auth', metadata, req);
    }
    cors(message, metadata, req) {
        this.info(message, 'cors', metadata, req);
    }
    websocket(message, metadata, error, req) {
        this.info(message, 'websocket', metadata, req);
    }
    database(message, metadata, error, req) {
        this.info(message, 'database', metadata, req);
    }
    location(message, metadata, error, req) {
        this.info(message, 'location', metadata, req);
    }
    bus(message, metadata, error, req) {
        this.info(message, 'bus', metadata, req);
    }
    route(message, metadata, error, req) {
        this.info(message, 'route', metadata, req);
    }
    admin(message, metadata, error, req) {
        this.info(message, 'admin', metadata, req);
    }
    security(message, metadata, error, req) {
        this.warn(message, 'security', metadata, req);
    }
    performance(message, metadata, req) {
        this.info(message, 'performance', metadata, req);
    }
    httpRequest(req, res, responseTime) {
        const metadata = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            responseTime: responseTime ? `${responseTime}ms` : undefined
        };
        const level = res.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
        this.log(level, `HTTP ${req.method} ${req.originalUrl}`, 'http', metadata, undefined, req);
    }
    dbQuery(query, duration, metadata, req) {
        this.database(`Database query executed`, {
            query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
            duration: duration ? `${duration}ms` : undefined,
            ...metadata
        }, undefined, req);
    }
    wsConnection(socketId, userId, metadata) {
        this.websocket(`WebSocket connection established`, {
            socketId,
            userId,
            ...metadata
        });
    }
    wsDisconnection(socketId, reason, userId) {
        this.websocket(`WebSocket connection closed`, {
            socketId,
            reason,
            userId
        });
    }
    securityEvent(event, metadata, req) {
        this.security(`Security event: ${event}`, metadata, undefined, req);
    }
    performanceMetric(metric, value, unit, metadata, req) {
        this.performance(`Performance metric: ${metric}`, {
            value,
            unit,
            ...metadata
        }, req);
    }
    serverStart(port, environment) {
        this.info(`Server starting on port ${port} in ${environment} mode`, 'server');
    }
    serverReady(port) {
        this.info(`Server ready on port ${port}`, 'server');
    }
    databaseConnected() {
        this.info('Database connection established', 'database');
    }
    databaseError(error) {
        this.error('Database connection failed', 'database', undefined, error);
    }
}
exports.logger = new Logger();
const logError = (message, service, metadata, error, req) => exports.logger.error(message, service, metadata, error, req);
exports.logError = logError;
const logWarn = (message, service, metadata, req) => exports.logger.warn(message, service, metadata, req);
exports.logWarn = logWarn;
const logInfo = (message, service, metadata, req) => exports.logger.info(message, service, metadata, req);
exports.logInfo = logInfo;
const logDebug = (message, service, metadata, req) => exports.logger.debug(message, service, metadata, req);
exports.logDebug = logDebug;
//# sourceMappingURL=logger.js.map