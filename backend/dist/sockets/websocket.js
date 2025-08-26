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
    io.on('connection', async (socket) => {
        console.log(`🔌 New client connected: ${socket.id}`);
        socket.conn.on('packet', ({ type }) => {
            if (type === 'pong') {
                console.log(`💓 Pong received from ${socket.id}`);
            }
        });
        socket.on('ping', () => {
            socket.emit('pong');
            console.log(`💓 Ping received from ${socket.id}`);
        });
        socket.on('driver:authenticate', async (data) => {
            try {
                const { token } = data;
                if (!token) {
                    socket.emit('error', { message: 'Authentication token required' });
                    return;
                }
                const { data: { user }, error, } = await supabase_1.supabaseAdmin.auth.getUser(token);
                if (error || !user) {
                    socket.emit('error', { message: 'Invalid authentication token' });
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
                const hasDriverRole = isDualRoleUser || (profile && profile.role === 'driver');
                if (!hasDriverRole) {
                    socket.emit('error', {
                        message: 'Access denied. Driver role required.',
                    });
                    return;
                }
                const busInfo = await (0, locationService_1.getDriverBusInfo)(user.id);
                console.log('🚌 Bus info for driver:', user.id, ':', busInfo);
                if (!busInfo) {
                    console.log('❌ No bus assigned to driver:', user.id);
                    socket.emit('error', { message: 'No bus assigned to driver' });
                    return;
                }
                socket.driverId = user.id;
                socket.busId = busInfo.bus_id;
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
                socket.emit('error', { message: 'Authentication failed' });
            }
        });
        socket.on('driver:locationUpdate', async (data) => {
            try {
                console.log('📍 Received location update from driver:', {
                    driverId: data.driverId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timestamp: data.timestamp,
                    socketDriverId: socket.driverId,
                    socketBusId: socket.busId,
                });
                if (!socket.driverId || !socket.busId) {
                    socket.emit('error', { message: 'Driver not authenticated' });
                    return;
                }
                const validationError = (0, validation_1.validateLocationData)(data);
                if (validationError) {
                    socket.emit('error', { message: validationError });
                    return;
                }
                if (data.driverId !== socket.driverId) {
                    socket.emit('error', { message: 'Unauthorized location update' });
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
                    socket.emit('error', { message: 'Failed to save location update' });
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
                socket.emit('error', { message: 'Failed to process location update' });
            }
        });
        socket.on('student:connect', () => {
            socket.join('students');
            console.log(`✅ Student connected: ${socket.id}`);
            socket.emit('student:connected', { timestamp: new Date().toISOString() });
        });
        socket.on('disconnect', (reason) => {
            console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
            if (reason === 'transport close') {
                console.log(`📱 Mobile client likely disconnected: ${socket.id}`);
            }
        });
        socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
        });
    });
    return io;
};
exports.initializeWebSocket = initializeWebSocket;
//# sourceMappingURL=websocket.js.map