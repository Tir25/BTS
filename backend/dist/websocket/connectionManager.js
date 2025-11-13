"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupConnectionManager = setupConnectionManager;
const logger_1 = require("../utils/logger");
const socketEvents_1 = require("./socketEvents");
const socketUtils_1 = require("./socketUtils");
function setupConnectionManager(io, connectionStats) {
    io.on(socketEvents_1.SocketEvents.CONNECTION, async (socket) => {
        const clientIP = socket.handshake.address;
        if (connectionStats.activeConnections >= parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS || '2000')) {
            logger_1.logger.warn('WebSocket connection limit exceeded', 'websocket', {
                activeConnections: connectionStats.activeConnections,
                maxConnections: parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS || '2000'),
                clientIP,
            });
            (0, socketUtils_1.emitError)(socket, 'Server at capacity', socketEvents_1.SocketErrorCodes.SERVER_FULL);
            socket.disconnect(true);
            return;
        }
        const ipConnections = connectionStats.connectionCounts.get(clientIP) || 0;
        const MAX_CONNECTIONS_PER_IP = parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS_PER_IP || '25');
        if (ipConnections >= MAX_CONNECTIONS_PER_IP) {
            logger_1.logger.warn('WebSocket connection limit per IP exceeded', 'websocket', {
                clientIP,
                ipConnections,
                maxPerIP: MAX_CONNECTIONS_PER_IP,
            });
            (0, socketUtils_1.emitError)(socket, 'Too many connections from this IP', socketEvents_1.SocketErrorCodes.IP_LIMIT_EXCEEDED);
            socket.disconnect(true);
            return;
        }
        connectionStats.totalConnections++;
        connectionStats.activeConnections++;
        connectionStats.connectionCounts.set(clientIP, ipConnections + 1);
        socket.lastActivity = Date.now();
        connectionStats.activeSockets.set(socket.id, socket);
        connectionStats.connectionTimestamps.set(socket.id, Date.now());
        logger_1.logger.wsConnection(socket.id, socket.userId, {
            totalConnections: connectionStats.totalConnections,
            activeConnections: connectionStats.activeConnections,
            clientIP,
            ipConnections: ipConnections + 1,
            userRole: socket.userRole,
            clientType: socket.handshake.query?.clientType || 'unknown',
            isAuthenticated: socket.isAuthenticated,
        });
        setupSocketEventHandlers(socket, connectionStats, clientIP);
        setupDisconnectHandler(socket, connectionStats, clientIP);
    });
    setupServerMonitoring(io, connectionStats);
}
function setupSocketEventHandlers(socket, connectionStats, clientIP) {
    socket.conn.on('packet', ({ type }) => {
        if (type === 'pong') {
            logger_1.logger.debug('Pong received', 'websocket', { socketId: socket.id });
            socket.lastActivity = Date.now();
        }
    });
    socket.on(socketEvents_1.SocketEvents.PING, () => {
        socket.emit(socketEvents_1.SocketEvents.PONG);
        socket.lastActivity = Date.now();
        logger_1.logger.debug('Ping received', 'websocket', { socketId: socket.id });
    });
    const heartbeatInterval = setInterval(() => {
        const now = Date.now();
        const lastActivity = socket.lastActivity || 0;
        const inactiveTime = now - lastActivity;
        if (inactiveTime > 5 * 60 * 1000) {
            logger_1.logger.warn('Disconnecting inactive socket', 'websocket', {
                socketId: socket.id,
                inactiveTime: Math.round(inactiveTime / 1000),
                userId: socket.userId,
            });
            socket.disconnect(true);
        }
    }, 60000);
    connectionStats.heartbeatIntervals.set(socket.id, heartbeatInterval);
    socket.on(socketEvents_1.SocketEvents.ERROR, (error) => {
        logger_1.logger.error('Socket error', 'websocket', { socketId: socket.id }, error);
        socket.lastActivity = Date.now();
    });
    socket.onAny(() => {
        socket.lastActivity = Date.now();
    });
}
function setupDisconnectHandler(socket, connectionStats, clientIP) {
    socket.on(socketEvents_1.SocketEvents.DISCONNECT, (reason) => {
        try {
            connectionStats.activeConnections--;
            const ipConnections = connectionStats.connectionCounts.get(clientIP) || 0;
            if (ipConnections > 0) {
                connectionStats.connectionCounts.set(clientIP, ipConnections - 1);
            }
            (0, socketUtils_1.cleanupSocket)(socket, {
                activeSockets: connectionStats.activeSockets,
                connectionTimestamps: connectionStats.connectionTimestamps,
                heartbeatIntervals: connectionStats.heartbeatIntervals,
            });
            logger_1.logger.wsDisconnection(socket.id, reason, socket.userId);
            if (reason === 'transport close') {
                logger_1.logger.debug('Mobile client disconnection', 'websocket', { socketId: socket.id, reason });
            }
            else if (reason === 'ping timeout') {
                logger_1.logger.debug('Ping timeout', 'websocket', { socketId: socket.id });
            }
            else if (reason === 'transport error') {
                logger_1.logger.debug('Transport error', 'websocket', { socketId: socket.id });
            }
            if (socket.isAuthenticated && socket.driverId) {
                logger_1.logger.websocket('Driver disconnected', {
                    driverId: socket.driverId,
                    busId: socket.busId,
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error handling disconnect', 'websocket', { socketId: socket.id }, error);
        }
    });
}
function setupServerMonitoring(io, connectionStats) {
    setInterval(() => {
        const now = Date.now();
        const inactiveThreshold = 5 * 60 * 1000;
        const staleThreshold = 10 * 60 * 1000;
        const staleConnections = [];
        connectionStats.activeSockets.forEach((socket, socketId) => {
            const connectionTime = connectionStats.connectionTimestamps.get(socketId) || 0;
            const lastActivity = socket.lastActivity || 0;
            const inactiveTime = now - lastActivity;
            const connectionAge = now - connectionTime;
            if (inactiveTime > inactiveThreshold) {
                logger_1.logger.debug('Inactive socket detected', 'websocket', {
                    socketId,
                    inactiveTime: Math.round(inactiveTime / 1000),
                    userId: socket.userId,
                });
            }
            if (connectionAge > staleThreshold && inactiveTime > inactiveThreshold) {
                staleConnections.push(socketId);
            }
        });
        staleConnections.forEach((socketId) => {
            const socket = connectionStats.activeSockets.get(socketId);
            if (socket) {
                logger_1.logger.warn('Disconnecting stale connection', 'websocket', {
                    socketId,
                    userId: socket.userId,
                });
                socket.disconnect(true);
            }
        });
        if (connectionStats.activeConnections > 0 && connectionStats.totalConnections % 100 === 0) {
            logger_1.logger.info('WebSocket connection statistics', 'websocket', {
                activeConnections: connectionStats.activeConnections,
                totalConnections: connectionStats.totalConnections,
                staleConnections: staleConnections.length,
                heartbeatIntervals: connectionStats.heartbeatIntervals.size,
            });
        }
    }, 60000);
}
//# sourceMappingURL=connectionManager.js.map