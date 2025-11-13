"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalIO = void 0;
exports.initializeWebSocket = initializeWebSocket;
const websocketAuth_1 = require("../middleware/websocketAuth");
const logger_1 = require("../utils/logger");
const connectionManager_1 = require("./connectionManager");
const busLocationHandler_1 = require("./busLocationHandler");
const driverHandler_1 = require("./driverHandler");
const studentHandler_1 = require("./studentHandler");
const adminHandler_1 = require("./adminHandler");
exports.globalIO = null;
function initializeWebSocket(io) {
    exports.globalIO = io;
    logger_1.logger.websocket('WebSocket server initialized', {
        pingTimeout: 60000,
        pingInterval: 25000,
        upgradeTimeout: 10000,
        maxHttpBufferSize: '1MB',
        allowEIO3: true,
    });
    io.engine.opts.pingTimeout = 60000;
    io.engine.opts.pingInterval = 25000;
    io.engine.opts.upgradeTimeout = 10000;
    io.engine.opts.maxHttpBufferSize = 1e6;
    io.engine.opts.allowEIO3 = true;
    io.engine.opts.cors = {
        origin: true,
        credentials: true,
    };
    io.use(websocketAuth_1.websocketAuthMiddleware);
    logger_1.logger.websocket('WebSocket authentication middleware applied');
    const connectionStats = {
        totalConnections: 0,
        activeConnections: 0,
        connectionCounts: new Map(),
        activeSockets: new Map(),
        connectionTimestamps: new Map(),
        heartbeatIntervals: new Map(),
    };
    (0, connectionManager_1.setupConnectionManager)(io, connectionStats);
    io.on('connection', (socket) => {
        (0, driverHandler_1.setupDriverHandler)(socket);
        (0, busLocationHandler_1.setupBusLocationHandler)(io, socket);
        (0, studentHandler_1.setupStudentHandler)(socket);
        socket.on('disconnect', () => {
            (0, busLocationHandler_1.cleanupLocationRateLimiter)(socket.id);
        });
    });
    (0, adminHandler_1.attachAdminBroadcastFunctions)(io);
    exports.globalIO = io;
    return io;
}
//# sourceMappingURL=socketServer.js.map