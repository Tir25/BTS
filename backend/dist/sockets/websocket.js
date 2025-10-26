"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeWebSocket = void 0;
const locationService_1 = require("../services/locationService");
const routeService_1 = require("../services/routeService");
const validation_1 = require("../utils/validation");
const websocketAuth_1 = require("../middleware/websocketAuth");
const logger_1 = require("../utils/logger");
const initializeWebSocket = (io) => {
    logger_1.logger.websocket('WebSocket server initialized');
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
    let totalConnections = 0;
    let activeConnections = 0;
    const MAX_CONNECTIONS = parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS || '1000');
    const MAX_CONNECTIONS_PER_IP = parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS_PER_IP || '10');
    const connectionCounts = new Map();
    io.on('connection', async (socket) => {
        const clientIP = socket.handshake.address;
        if (activeConnections >= MAX_CONNECTIONS) {
            logger_1.logger.warn('WebSocket connection limit exceeded', 'websocket', {
                activeConnections,
                maxConnections: MAX_CONNECTIONS,
                clientIP
            });
            socket.emit('error', {
                message: 'Server at capacity',
                code: 'SERVER_FULL'
            });
            socket.disconnect(true);
            return;
        }
        const ipConnections = connectionCounts.get(clientIP) || 0;
        if (ipConnections >= MAX_CONNECTIONS_PER_IP) {
            logger_1.logger.warn('WebSocket connection limit per IP exceeded', 'websocket', {
                clientIP,
                ipConnections,
                maxPerIP: MAX_CONNECTIONS_PER_IP
            });
            socket.emit('error', {
                message: 'Too many connections from this IP',
                code: 'IP_LIMIT_EXCEEDED'
            });
            socket.disconnect(true);
            return;
        }
        totalConnections++;
        activeConnections++;
        connectionCounts.set(clientIP, ipConnections + 1);
        socket.lastActivity = Date.now();
        logger_1.logger.wsConnection(socket.id, socket.userId, {
            totalConnections,
            activeConnections,
            clientIP,
            ipConnections: ipConnections + 1
        });
        socket.conn.on('packet', ({ type }) => {
            if (type === 'pong') {
                logger_1.logger.debug('Pong received', 'websocket', { socketId: socket.id });
                socket.lastActivity = Date.now();
            }
        });
        socket.on('ping', () => {
            socket.emit('pong');
            socket.lastActivity = Date.now();
            logger_1.logger.debug('Ping received', 'websocket', { socketId: socket.id });
        });
        socket.on('driver:authenticate', async (data) => {
            try {
                if (!socket.isAuthenticated || !socket.userId) {
                    socket.emit('driver:authentication_failed', {
                        message: 'Authentication required',
                        code: 'NOT_AUTHENTICATED',
                    });
                    return;
                }
                if (socket.userRole !== 'driver' && socket.userRole !== 'admin') {
                    socket.emit('driver:authentication_failed', {
                        message: 'Driver role required',
                        code: 'INSUFFICIENT_PERMISSIONS',
                    });
                    return;
                }
                logger_1.logger.websocket('Driver authentication', {
                    userId: socket.userId,
                    role: socket.userRole
                });
                const busInfo = await (0, locationService_1.getDriverBusInfo)(socket.userId);
                logger_1.logger.websocket('Bus info retrieved', { userId: socket.userId, busInfo });
                if (!busInfo) {
                    logger_1.logger.websocket('No bus assigned to driver', { userId: socket.userId });
                    socket.emit('driver:authentication_failed', {
                        message: 'No bus assigned to driver',
                        code: 'NO_BUS_ASSIGNED',
                    });
                    return;
                }
                socket.driverId = socket.userId;
                socket.busId = busInfo.bus_id;
                socket.lastActivity = Date.now();
                socket.join(`driver:${socket.userId}`);
                socket.join(`bus:${busInfo.bus_id}`);
                logger_1.logger.websocket('Driver authenticated and assigned', {
                    driverId: socket.userId,
                    busId: busInfo.bus_id
                });
                const authResponse = {
                    driverId: socket.userId,
                    busId: busInfo.bus_id,
                    busInfo: busInfo,
                };
                logger_1.logger.websocket('Sending authentication response', { authResponse });
                socket.emit('driver:authenticated', authResponse);
            }
            catch (error) {
                logger_1.logger.error('Driver authentication error', 'websocket', { socketId: socket.id }, error);
                socket.emit('driver:authentication_failed', {
                    message: 'Authentication failed',
                    code: 'AUTH_ERROR',
                });
            }
        });
        socket.on('driver:locationUpdate', async (data) => {
            try {
                socket.lastActivity = Date.now();
                logger_1.logger.location('Received location update', {
                    driverId: data.driverId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timestamp: data.timestamp,
                    socketDriverId: socket.driverId,
                    socketBusId: socket.busId,
                });
                if (!socket.driverId || !socket.busId || !socket.isAuthenticated) {
                    socket.emit('error', {
                        message: 'Driver not authenticated',
                        code: 'NOT_AUTHENTICATED',
                    });
                    return;
                }
                const validationError = (0, validation_1.validateLocationData)(data);
                if (validationError) {
                    socket.emit('error', {
                        message: validationError,
                        code: 'VALIDATION_ERROR',
                    });
                    return;
                }
                if (data.driverId !== socket.driverId) {
                    socket.emit('error', {
                        message: 'Unauthorized location update',
                        code: 'UNAUTHORIZED',
                    });
                    return;
                }
                const savedLocation = await (0, locationService_1.saveLocationUpdate)({
                    driverId: data.driverId,
                    busId: socket.busId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timestamp: data.timestamp,
                    speed: data.speed,
                    heading: data.heading,
                });
                if (!savedLocation) {
                    socket.emit('error', {
                        message: 'Failed to save location update',
                        code: 'SAVE_ERROR',
                    });
                    return;
                }
                const busInfo = await (0, locationService_1.getDriverBusInfo)(data.driverId);
                let etaInfo = null;
                let nearStopInfo = null;
                if (busInfo?.route_id) {
                    try {
                        etaInfo = await routeService_1.RouteService.calculateETA({
                            bus_id: socket.busId,
                            latitude: data.latitude,
                            longitude: data.longitude,
                            timestamp: data.timestamp,
                        }, busInfo.route_id);
                    }
                    catch (etaError) {
                        logger_1.logger.error('Error calculating ETA', 'route', undefined, etaError);
                    }
                    try {
                        nearStopInfo = await routeService_1.RouteService.checkBusNearStop({
                            bus_id: socket.busId,
                            latitude: data.latitude,
                            longitude: data.longitude,
                            timestamp: data.timestamp,
                        }, busInfo.route_id);
                    }
                    catch (stopError) {
                        logger_1.logger.error('Error checking near stop', 'route', undefined, stopError);
                    }
                }
                const locationData = {
                    busId: socket.busId,
                    driverId: data.driverId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timestamp: data.timestamp,
                    speed: data.speed,
                    heading: data.heading,
                    eta: etaInfo,
                    nearStop: nearStopInfo,
                };
                logger_1.logger.location('Broadcasting location update', { locationData });
                io.emit('bus:locationUpdate', locationData);
                logger_1.logger.location('Location broadcast complete', {
                    busId: socket.busId,
                    clientsCount: io.engine.clientsCount
                });
                if (nearStopInfo?.is_near_stop) {
                    io.emit('bus:arriving', {
                        busId: socket.busId,
                        routeId: busInfo?.route_id,
                        location: [data.longitude, data.latitude],
                        timestamp: data.timestamp,
                    });
                }
                socket.emit('driver:locationConfirmed', {
                    timestamp: data.timestamp,
                    locationId: savedLocation.id,
                });
                logger_1.logger.location('Location update processed', {
                    driverId: data.driverId,
                    busId: socket.busId
                });
            }
            catch (error) {
                logger_1.logger.error('Location update error', 'websocket', { socketId: socket.id }, error);
                socket.emit('error', {
                    message: 'Failed to process location update',
                    code: 'PROCESSING_ERROR',
                });
            }
        });
        socket.on('student:connect', () => {
            try {
                if (!socket.isAuthenticated || !socket.userId) {
                    socket.emit('error', {
                        message: 'Authentication required',
                        code: 'NOT_AUTHENTICATED',
                    });
                    return;
                }
                if (socket.userRole !== 'student' && socket.userRole !== 'admin') {
                    socket.emit('error', {
                        message: 'Student role required',
                        code: 'INSUFFICIENT_PERMISSIONS',
                    });
                    return;
                }
                socket.lastActivity = Date.now();
                socket.join('students');
                logger_1.logger.websocket('Student connected', { socketId: socket.id, userId: socket.userId });
                socket.emit('student:connected', {
                    timestamp: new Date().toISOString(),
                    userId: socket.userId
                });
            }
            catch (error) {
                logger_1.logger.error('Error handling student connection', 'websocket', { socketId: socket.id }, error);
                socket.emit('error', {
                    message: 'Failed to process student connection',
                    code: 'CONNECTION_ERROR',
                });
            }
        });
        socket.on('disconnect', (reason) => {
            try {
                activeConnections--;
                const clientIP = socket.handshake.address;
                const ipConnections = connectionCounts.get(clientIP) || 0;
                if (ipConnections > 0) {
                    connectionCounts.set(clientIP, ipConnections - 1);
                }
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
                        busId: socket.busId
                    });
                }
                socket.removeAllListeners();
            }
            catch (error) {
                logger_1.logger.error('Error handling disconnect', 'websocket', { socketId: socket.id }, error);
            }
        });
        socket.on('error', (error) => {
            logger_1.logger.error('Socket error', 'websocket', { socketId: socket.id }, error);
            socket.lastActivity = Date.now();
        });
        socket.onAny(() => {
            socket.lastActivity = Date.now();
        });
    });
    setInterval(() => {
        const now = Date.now();
        const inactiveThreshold = 5 * 60 * 1000;
        io.sockets.sockets.forEach((socket) => {
            if (socket.lastActivity &&
                now - socket.lastActivity > inactiveThreshold) {
                logger_1.logger.debug('Inactive socket detected', 'websocket', {
                    socketId: socket.id,
                    lastActivity: new Date(socket.lastActivity).toISOString()
                });
            }
        });
    }, 60000);
    return io;
};
exports.initializeWebSocket = initializeWebSocket;
//# sourceMappingURL=websocket.js.map