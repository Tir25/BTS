"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncAdminHandler = exports.asyncRouteHandler = exports.asyncBusHandler = exports.asyncLocationHandler = exports.asyncAuthHandler = exports.asyncFileHandler = exports.asyncApiHandler = exports.asyncDbHandler = exports.asyncWebSocketHandler = exports.asyncHandler = void 0;
const logger_1 = require("../utils/logger");
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            logger_1.logger.error('Async handler error', 'asyncHandler', {
                method: req.method,
                url: req.originalUrl,
                error: error.message
            }, error, req);
            next(error);
        });
    };
};
exports.asyncHandler = asyncHandler;
const asyncWebSocketHandler = (fn) => {
    return (socket, data) => {
        Promise.resolve(fn(socket, data)).catch((error) => {
            logger_1.logger.error('WebSocket async handler error', 'websocket', {
                socketId: socket.id,
                event: socket.event,
                error: error.message
            }, error);
            socket.emit('error', {
                message: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        });
    };
};
exports.asyncWebSocketHandler = asyncWebSocketHandler;
const asyncDbHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            logger_1.logger.error('Database operation error', 'database', {
                method: req.method,
                url: req.originalUrl,
                error: error.message
            }, error, req);
            next(error);
        });
    };
};
exports.asyncDbHandler = asyncDbHandler;
const asyncApiHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            logger_1.logger.error('External API call error', 'api', {
                method: req.method,
                url: req.originalUrl,
                error: error.message
            }, error, req);
            next(error);
        });
    };
};
exports.asyncApiHandler = asyncApiHandler;
const asyncFileHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            logger_1.logger.error('File operation error', 'file', {
                method: req.method,
                url: req.originalUrl,
                error: error.message
            }, error, req);
            next(error);
        });
    };
};
exports.asyncFileHandler = asyncFileHandler;
const asyncAuthHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            logger_1.logger.error('Authentication error', 'auth', {
                method: req.method,
                url: req.originalUrl,
                error: error.message
            }, error, req);
            next(error);
        });
    };
};
exports.asyncAuthHandler = asyncAuthHandler;
const asyncLocationHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            logger_1.logger.error('Location operation error', 'location', {
                method: req.method,
                url: req.originalUrl,
                error: error.message
            }, error, req);
            next(error);
        });
    };
};
exports.asyncLocationHandler = asyncLocationHandler;
const asyncBusHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            logger_1.logger.error('Bus operation error', 'bus', {
                method: req.method,
                url: req.originalUrl,
                error: error.message
            }, error, req);
            next(error);
        });
    };
};
exports.asyncBusHandler = asyncBusHandler;
const asyncRouteHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            logger_1.logger.error('Route operation error', 'route', {
                method: req.method,
                url: req.originalUrl,
                error: error.message
            }, error, req);
            next(error);
        });
    };
};
exports.asyncRouteHandler = asyncRouteHandler;
const asyncAdminHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            logger_1.logger.error('Admin operation error', 'admin', {
                method: req.method,
                url: req.originalUrl,
                error: error.message
            }, error, req);
            next(error);
        });
    };
};
exports.asyncAdminHandler = asyncAdminHandler;
//# sourceMappingURL=asyncHandler.js.map