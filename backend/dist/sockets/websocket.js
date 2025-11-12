"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeWebSocket = exports.globalIO = void 0;
const locationService_1 = require("../services/locationService");
const OptimizedLocationService_1 = require("../services/OptimizedLocationService");
const RouteQueryService_1 = require("../services/routes/RouteQueryService");
const validation_1 = require("../utils/validation");
const websocketAuth_1 = require("../middleware/websocketAuth");
const logger_1 = require("../utils/logger");
exports.globalIO = null;
const initializeWebSocket = (io) => {
    exports.globalIO = io;
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
    const MAX_CONNECTIONS = parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS || '2000');
    const MAX_CONNECTIONS_PER_IP = parseInt(process.env.MAX_WEBSOCKET_CONNECTIONS_PER_IP || '25');
    const connectionCounts = new Map();
    const activeSockets = new Map();
    const connectionTimestamps = new Map();
    const heartbeatIntervals = new Map();
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
        activeSockets.set(socket.id, socket);
        connectionTimestamps.set(socket.id, Date.now());
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
        const heartbeatInterval = setInterval(() => {
            const now = Date.now();
            const lastActivity = socket.lastActivity || 0;
            const inactiveTime = now - lastActivity;
            if (inactiveTime > 5 * 60 * 1000) {
                logger_1.logger.warn('Disconnecting inactive socket', 'websocket', {
                    socketId: socket.id,
                    inactiveTime: Math.round(inactiveTime / 1000),
                    userId: socket.userId
                });
                socket.disconnect(true);
            }
        }, 60000);
        heartbeatIntervals.set(socket.id, heartbeatInterval);
        socket.on('driver:initialize', async () => {
            try {
                if (!socket.isAuthenticated || !socket.userId) {
                    logger_1.logger.websocket('Driver initialization failed: Not authenticated', {
                        socketId: socket.id
                    });
                    socket.emit('driver:initialization_failed', {
                        message: 'Authentication required',
                        code: 'NOT_AUTHENTICATED',
                    });
                    return;
                }
                if (socket.userRole !== 'driver' && socket.userRole !== 'admin') {
                    logger_1.logger.websocket('Driver initialization failed: Insufficient permissions', {
                        socketId: socket.id,
                        userRole: socket.userRole,
                        userId: socket.userId
                    });
                    socket.emit('driver:initialization_failed', {
                        message: 'Driver role required',
                        code: 'INSUFFICIENT_PERMISSIONS',
                    });
                    return;
                }
                logger_1.logger.websocket('Driver initialization', {
                    userId: socket.userId,
                    role: socket.userRole
                });
                const busInfo = await OptimizedLocationService_1.optimizedLocationService.getDriverBusInfo(socket.userId);
                logger_1.logger.websocket('Bus info retrieved', {
                    userId: socket.userId,
                    busInfo: busInfo ? {
                        id: busInfo.id,
                        bus_id: busInfo.bus_id,
                        bus_number: busInfo.bus_number,
                        route_id: busInfo.route_id
                    } : null
                });
                if (!busInfo) {
                    logger_1.logger.websocket('No bus assigned to driver', {
                        userId: socket.userId,
                        userRole: socket.userRole
                    });
                    socket.emit('driver:initialization_failed', {
                        message: 'No bus assigned to driver. Please contact your administrator.',
                        code: 'NO_BUS_ASSIGNED',
                    });
                    return;
                }
                socket.driverId = socket.userId;
                socket.busId = busInfo.id;
                socket.lastActivity = Date.now();
                socket.join(`driver:${socket.userId}`);
                socket.join(`bus:${socket.busId}`);
                logger_1.logger.websocket('Driver initialized and assigned', {
                    driverId: socket.userId,
                    busId: socket.busId,
                    busInfoFields: {
                        id: busInfo.id,
                        bus_id: busInfo.bus_id,
                        bus_number: busInfo.bus_number
                    }
                });
                const initResponse = {
                    driverId: socket.userId,
                    busId: socket.busId,
                    busInfo: busInfo,
                };
                logger_1.logger.websocket('Sending initialization response', {
                    driverId: initResponse.driverId,
                    busId: initResponse.busId,
                    busNumber: initResponse.busInfo?.bus_number
                });
                socket.emit('driver:initialized', initResponse);
                socket.emit('driver:assignmentUpdate', {
                    type: 'initial',
                    assignment: {
                        driverId: socket.userId,
                        busId: socket.busId,
                        busNumber: busInfo.bus_number,
                        routeId: busInfo.route_id,
                        routeName: busInfo.route_name,
                        driverName: busInfo.driver_name,
                        status: 'active',
                        lastUpdated: new Date().toISOString()
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Driver initialization error', 'websocket', {
                    socketId: socket.id,
                    userId: socket.userId,
                    userRole: socket.userRole,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }, error);
                socket.emit('driver:initialization_failed', {
                    message: 'Initialization failed. Please try again.',
                    code: 'INIT_ERROR',
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
                const busInfo = await OptimizedLocationService_1.optimizedLocationService.getDriverBusInfo(data.driverId);
                let etaInfo = null;
                let nearStopInfo = null;
                if (busInfo?.route_id) {
                    try {
                        etaInfo = await RouteQueryService_1.RouteQueryService.calculateETA({
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
                        nearStopInfo = await RouteQueryService_1.RouteQueryService.checkBusNearStop({
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
                const connectedClients = Array.from(io.sockets.sockets.values());
                const studentClients = connectedClients.filter(s => s.userRole === 'student' ||
                    s.userId?.startsWith('anonymous-student'));
                const driverClients = connectedClients.filter(s => s.userRole === 'driver');
                logger_1.logger.location('DETAILED DEBUG: Broadcasting to clients', {
                    totalClients: connectedClients.length,
                    studentClients: studentClients.length,
                    driverClients: driverClients.length,
                    socketBusId: socket.busId,
                    socketBusIdType: typeof socket.busId,
                    socketBusIdLength: socket.busId?.length,
                    locationDataBusId: locationData.busId,
                    locationDataBusIdType: typeof locationData.busId,
                    locationDataBusIdLength: locationData.busId?.length,
                    busIdMatch: socket.busId === locationData.busId,
                    fullLocationData: locationData,
                    driverId: data.driverId,
                    timestamp: data.timestamp
                });
                io.emit('bus:locationUpdate', locationData);
                io.to('students').emit('bus:locationUpdate', locationData);
                logger_1.logger.location('Location broadcast complete', {
                    busId: socket.busId,
                    totalClientsCount: io.engine.clientsCount,
                    studentClientsCount: studentClients.length
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
                const isAnonymousStudent = !socket.isAuthenticated && socket.userId?.startsWith('anonymous-student');
                const isAuthenticatedStudent = socket.isAuthenticated && socket.userId && (socket.userRole === 'student' || socket.userRole === 'admin' || socket.userRole === 'driver');
                if (!isAnonymousStudent && !isAuthenticatedStudent) {
                    if (socket.userRole && socket.userRole !== 'student' && socket.userRole !== 'admin' && socket.userRole !== 'driver') {
                        socket.emit('error', {
                            message: 'Valid role required for student map access',
                            code: 'INSUFFICIENT_PERMISSIONS',
                        });
                        return;
                    }
                    const allowAnonymous = process.env.ALLOW_ANONYMOUS_STUDENTS === 'true';
                    if (!socket.userRole && !socket.userId) {
                        if (!allowAnonymous && process.env.NODE_ENV === 'production') {
                            socket.emit('error', {
                                message: 'Authentication required in production mode',
                                code: 'AUTHENTICATION_REQUIRED',
                            });
                            return;
                        }
                        socket.userId = `anonymous-student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        socket.userRole = 'student';
                        socket.isAuthenticated = false;
                    }
                    else {
                        socket.emit('error', {
                            message: 'Authentication required',
                            code: 'NOT_AUTHENTICATED',
                        });
                        return;
                    }
                }
                socket.lastActivity = Date.now();
                socket.join('students');
                const isAnonymous = socket.userId?.startsWith('anonymous-student') || false;
                const responseUserId = isAnonymous ? 'anonymous' : socket.userId;
                logger_1.logger.websocket('Student connected successfully', {
                    socketId: socket.id,
                    userId: responseUserId,
                    isAnonymous: isAnonymous,
                    isAuthenticated: socket.isAuthenticated,
                    userRole: socket.userRole
                });
                socket.emit('student:connected', {
                    timestamp: new Date().toISOString(),
                    userId: responseUserId,
                    isAnonymous: isAnonymous
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
        socket.on('driver:requestAssignmentUpdate', async () => {
            try {
                if (!socket.isAuthenticated || !socket.userId || socket.userRole !== 'driver') {
                    socket.emit('error', {
                        message: 'Authentication required',
                        code: 'NOT_AUTHENTICATED',
                    });
                    return;
                }
                const busInfo = await OptimizedLocationService_1.optimizedLocationService.getDriverBusInfo(socket.userId);
                if (busInfo) {
                    socket.emit('driver:assignmentUpdate', {
                        type: 'refresh',
                        assignment: {
                            driverId: socket.userId,
                            busId: busInfo.id,
                            busNumber: busInfo.bus_number,
                            routeId: busInfo.route_id,
                            routeName: busInfo.route_name,
                            driverName: busInfo.driver_name,
                            status: 'active',
                            lastUpdated: new Date().toISOString()
                        }
                    });
                }
                else {
                    socket.emit('driver:assignmentUpdate', {
                        type: 'no_assignment',
                        assignment: null
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Error handling assignment update request', 'websocket', {
                    socketId: socket.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                socket.emit('error', {
                    message: 'Failed to get assignment update',
                    code: 'ASSIGNMENT_UPDATE_ERROR',
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
                activeSockets.delete(socket.id);
                connectionTimestamps.delete(socket.id);
                const heartbeatInterval = heartbeatIntervals.get(socket.id);
                if (heartbeatInterval) {
                    clearInterval(heartbeatInterval);
                    heartbeatIntervals.delete(socket.id);
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
                socket.userId = undefined;
                socket.userRole = undefined;
                socket.driverId = undefined;
                socket.busId = undefined;
                socket.isAuthenticated = false;
                socket.lastActivity = undefined;
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
        const staleThreshold = 10 * 60 * 1000;
        const staleConnections = [];
        activeSockets.forEach((socket, socketId) => {
            const connectionTime = connectionTimestamps.get(socketId) || 0;
            const lastActivity = socket.lastActivity || 0;
            const inactiveTime = now - lastActivity;
            const connectionAge = now - connectionTime;
            if (inactiveTime > inactiveThreshold) {
                logger_1.logger.debug('Inactive socket detected', 'websocket', {
                    socketId,
                    inactiveTime: Math.round(inactiveTime / 1000),
                    userId: socket.userId
                });
            }
            if (connectionAge > staleThreshold && inactiveTime > inactiveThreshold) {
                staleConnections.push(socketId);
            }
        });
        staleConnections.forEach(socketId => {
            const socket = activeSockets.get(socketId);
            if (socket) {
                logger_1.logger.warn('Disconnecting stale connection', 'websocket', {
                    socketId,
                    userId: socket.userId
                });
                socket.disconnect(true);
            }
        });
        if (activeConnections > 0 && totalConnections % 100 === 0) {
            logger_1.logger.info('WebSocket connection statistics', 'websocket', {
                activeConnections,
                totalConnections,
                staleConnections: staleConnections.length,
                heartbeatIntervals: heartbeatIntervals.size
            });
        }
    }, 60000);
    const broadcastAssignmentUpdate = (driverId, assignment) => {
        logger_1.logger.websocket('Broadcasting assignment update', {
            driverId,
            busId: assignment.busId,
            type: assignment.type
        });
        io.to(`driver:${driverId}`).emit('driver:assignmentUpdate', {
            type: 'admin_update',
            assignment: {
                driverId: assignment.driverId,
                busId: assignment.busId,
                busNumber: assignment.busNumber,
                routeId: assignment.routeId,
                routeName: assignment.routeName,
                driverName: assignment.driverName,
                status: assignment.status || 'active',
                lastUpdated: new Date().toISOString()
            }
        });
    };
    const broadcastAssignmentRemoval = (driverId, busId) => {
        logger_1.logger.websocket('Broadcasting assignment removal', { driverId, busId });
        io.to(`driver:${driverId}`).emit('driver:assignmentUpdate', {
            type: 'removed',
            assignment: null,
            message: 'Your bus assignment has been removed by an administrator'
        });
    };
    io.broadcastAssignmentUpdate = broadcastAssignmentUpdate;
    io.broadcastAssignmentRemoval = broadcastAssignmentRemoval;
    exports.globalIO = io;
    return io;
};
exports.initializeWebSocket = initializeWebSocket;
//# sourceMappingURL=websocket.js.map