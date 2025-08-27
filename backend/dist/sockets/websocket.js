"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeWebSocket = void 0;
const supabase_1 = require("../config/supabase");
const locationService_1 = require("../services/locationService");
const routeService_1 = require("../services/routeService");
const validation_1 = require("../utils/validation");
const initializeWebSocket = (io) => {
    console.log('🔌 WebSocket server initialized');
    io.engine.opts.pingTimeout = 60000;
    io.engine.opts.pingInterval = 25000;
    io.engine.opts.upgradeTimeout = 10000;
    io.engine.opts.maxHttpBufferSize = 1e6;
    io.engine.opts.allowEIO3 = true;
    io.engine.opts.cors = {
        origin: true,
        credentials: true,
    };
    let totalConnections = 0;
    let activeConnections = 0;
    io.on('connection', async (socket) => {
        totalConnections++;
        activeConnections++;
        socket.lastActivity = Date.now();
        console.log(`🔌 New client connected: ${socket.id} (Total: ${totalConnections}, Active: ${activeConnections})`);
        socket.conn.on('packet', ({ type }) => {
            if (type === 'pong') {
                console.log(`💓 Pong received from ${socket.id}`);
                socket.lastActivity = Date.now();
            }
        });
        socket.on('ping', () => {
            socket.emit('pong');
            socket.lastActivity = Date.now();
            console.log(`💓 Ping received from ${socket.id}`);
        });
        socket.on('driver:authenticate', async (data) => {
            try {
                const { token } = data;
                if (!token) {
                    socket.emit('driver:authentication_failed', {
                        message: 'Authentication token required',
                        code: 'MISSING_TOKEN'
                    });
                    return;
                }
                if (typeof token !== 'string' || token.length < 10) {
                    socket.emit('driver:authentication_failed', {
                        message: 'Invalid token format',
                        code: 'INVALID_TOKEN_FORMAT'
                    });
                    return;
                }
                const { data: { user }, error, } = await supabase_1.supabaseAdmin.auth.getUser(token);
                if (error || !user) {
                    console.error('❌ Authentication error:', error);
                    socket.emit('driver:authentication_failed', {
                        message: 'Invalid authentication token',
                        code: 'INVALID_TOKEN'
                    });
                    return;
                }
                console.log('🔐 Driver authentication attempt for user:', user.id, user.email);
                const authRoles = user.user_metadata?.roles;
                const isDualRoleUser = authRoles && Array.isArray(authRoles) && authRoles.includes('driver');
                const { data: profile } = await supabase_1.supabaseAdmin
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                const { data: userRecord } = await supabase_1.supabaseAdmin
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                const hasDriverRole = isDualRoleUser ||
                    (profile && profile.role === 'driver') ||
                    (userRecord && userRecord.role === 'driver');
                console.log('🔍 Driver role check:', {
                    userId: user.id,
                    email: user.email,
                    authRoles,
                    isDualRoleUser,
                    profileRole: profile?.role,
                    userRecordRole: userRecord?.role,
                    hasDriverRole
                });
                if (!hasDriverRole) {
                    socket.emit('driver:authentication_failed', {
                        message: 'Access denied. Driver role required.',
                        code: 'INSUFFICIENT_PERMISSIONS'
                    });
                    return;
                }
                const busInfo = await (0, locationService_1.getDriverBusInfo)(user.id);
                console.log('🚌 Bus info for driver:', user.id, ':', busInfo);
                if (!busInfo) {
                    console.log('❌ No bus assigned to driver:', user.id);
                    socket.emit('driver:authentication_failed', {
                        message: 'No bus assigned to driver',
                        code: 'NO_BUS_ASSIGNED'
                    });
                    return;
                }
                socket.driverId = user.id;
                socket.busId = busInfo.bus_id;
                socket.isAuthenticated = true;
                socket.lastActivity = Date.now();
                socket.join(`driver:${user.id}`);
                socket.join(`bus:${busInfo.bus_id}`);
                console.log(`✅ Driver ${user.id} authenticated and assigned to bus ${busInfo.bus_id}`);
                const authResponse = {
                    driverId: user.id,
                    busId: busInfo.bus_id,
                    busInfo: busInfo,
                };
                console.log('✅ Sending authentication response:', authResponse);
                socket.emit('driver:authenticated', authResponse);
            }
            catch (error) {
                console.error('❌ Authentication error:', error);
                socket.emit('driver:authentication_failed', {
                    message: 'Authentication failed',
                    code: 'AUTH_ERROR'
                });
            }
        });
        socket.on('driver:locationUpdate', async (data) => {
            try {
                socket.lastActivity = Date.now();
                console.log('📍 Received location update from driver:', {
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
                        code: 'NOT_AUTHENTICATED'
                    });
                    return;
                }
                const validationError = (0, validation_1.validateLocationData)(data);
                if (validationError) {
                    socket.emit('error', {
                        message: validationError,
                        code: 'VALIDATION_ERROR'
                    });
                    return;
                }
                if (data.driverId !== socket.driverId) {
                    socket.emit('error', {
                        message: 'Unauthorized location update',
                        code: 'UNAUTHORIZED'
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
                        code: 'SAVE_ERROR'
                    });
                    return;
                }
                const busInfo = await (0, locationService_1.getDriverBusInfo)(data.driverId);
                let etaInfo = null;
                let nearStopInfo = null;
                if (busInfo?.route_id) {
                    etaInfo = await routeService_1.RouteService.calculateETA({
                        bus_id: socket.busId,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        timestamp: data.timestamp,
                    }, busInfo.route_id);
                    nearStopInfo = await routeService_1.RouteService.checkBusNearStop({
                        bus_id: socket.busId,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        timestamp: data.timestamp,
                    }, busInfo.route_id);
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
                console.log('📡 Broadcasting location update:', locationData);
                io.emit('bus:locationUpdate', locationData);
                console.log(`📡 Broadcasting location update for bus ${socket.busId} to ${io.engine.clientsCount} clients`);
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
                console.log(`📍 Location update from driver ${data.driverId} for bus ${socket.busId}`);
            }
            catch (error) {
                console.error('❌ Location update error:', error);
                socket.emit('error', {
                    message: 'Failed to process location update',
                    code: 'PROCESSING_ERROR'
                });
            }
        });
        socket.on('student:connect', () => {
            socket.lastActivity = Date.now();
            socket.join('students');
            console.log(`✅ Student connected: ${socket.id}`);
            socket.emit('student:connected', { timestamp: new Date().toISOString() });
        });
        socket.on('disconnect', (reason) => {
            activeConnections--;
            console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason} (Active: ${activeConnections})`);
            if (reason === 'transport close') {
                console.log(`📱 Mobile client likely disconnected: ${socket.id}`);
            }
            else if (reason === 'ping timeout') {
                console.log(`⏰ Ping timeout for client: ${socket.id}`);
            }
            else if (reason === 'transport error') {
                console.log(`🚨 Transport error for client: ${socket.id}`);
            }
            if (socket.isAuthenticated && socket.driverId) {
                console.log(`🚌 Driver ${socket.driverId} disconnected from bus ${socket.busId}`);
            }
        });
        socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
            socket.lastActivity = Date.now();
        });
        socket.onAny((eventName, ...args) => {
            socket.lastActivity = Date.now();
        });
    });
    setInterval(() => {
        const now = Date.now();
        const inactiveThreshold = 5 * 60 * 1000;
        io.sockets.sockets.forEach((socket) => {
            if (socket.lastActivity && (now - socket.lastActivity) > inactiveThreshold) {
                console.log(`⏰ Inactive socket detected: ${socket.id}, last activity: ${new Date(socket.lastActivity).toISOString()}`);
            }
        });
    }, 60000);
    return io;
};
exports.initializeWebSocket = initializeWebSocket;
//# sourceMappingURL=websocket.js.map