"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastLocationUpdate = broadcastLocationUpdate;
exports.broadcastBusArriving = broadcastBusArriving;
exports.emitError = emitError;
exports.getConnectedClientsStats = getConnectedClientsStats;
exports.joinRelevantRooms = joinRelevantRooms;
exports.cleanupSocket = cleanupSocket;
const logger_1 = require("../utils/logger");
const socketEvents_1 = require("./socketEvents");
function broadcastLocationUpdate(io, locationData) {
    setImmediate(() => {
        try {
            io.emit(socketEvents_1.SocketEvents.BUS_LOCATION_UPDATE, locationData);
            io.to(socketEvents_1.SocketRooms.STUDENTS).emit(socketEvents_1.SocketEvents.BUS_LOCATION_UPDATE, locationData);
            logger_1.logger.location('Location broadcast complete', {
                busId: locationData.busId,
                totalClientsCount: io.engine.clientsCount,
            });
        }
        catch (broadcastError) {
            logger_1.logger.error('Error broadcasting location update', 'websocket', {
                error: broadcastError instanceof Error ? broadcastError.message : String(broadcastError),
                busId: locationData.busId,
                driverId: locationData.driverId,
            });
        }
    });
}
function broadcastBusArriving(io, data) {
    try {
        io.emit(socketEvents_1.SocketEvents.BUS_ARRIVING, data);
        logger_1.logger.debug('Bus arriving event broadcast', 'websocket', {
            busId: data.busId,
            routeId: data.routeId,
        });
    }
    catch (error) {
        logger_1.logger.error('Error broadcasting bus arriving', 'websocket', {
            error: error instanceof Error ? error.message : String(error),
            busId: data.busId,
        });
    }
}
function emitError(socket, message, code) {
    socket.emit(socketEvents_1.SocketEvents.ERROR, {
        message,
        code,
    });
}
function getConnectedClientsStats(io) {
    const connectedClients = Array.from(io.sockets.sockets.values());
    const studentClients = connectedClients.filter((s) => s.userRole === 'student' ||
        s.userId?.startsWith('anonymous-student'));
    const driverClients = connectedClients.filter((s) => s.userRole === 'driver');
    return {
        total: connectedClients.length,
        students: studentClients.length,
        drivers: driverClients.length,
    };
}
function joinRelevantRooms(socket, driverId, busId) {
    if (driverId) {
        socket.join(socketEvents_1.SocketRooms.DRIVER(driverId));
    }
    if (busId) {
        socket.join(socketEvents_1.SocketRooms.BUS(busId));
    }
}
function cleanupSocket(socket, connectionStats) {
    connectionStats.activeSockets.delete(socket.id);
    connectionStats.connectionTimestamps.delete(socket.id);
    const heartbeatInterval = connectionStats.heartbeatIntervals.get(socket.id);
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        connectionStats.heartbeatIntervals.delete(socket.id);
    }
    socket.removeAllListeners();
    socket.userId = undefined;
    socket.userRole = undefined;
    socket.driverId = undefined;
    socket.busId = undefined;
    socket.isAuthenticated = false;
    socket.lastActivity = undefined;
}
//# sourceMappingURL=socketUtils.js.map