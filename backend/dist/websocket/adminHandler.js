"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastAssignmentUpdate = broadcastAssignmentUpdate;
exports.broadcastAssignmentRemoval = broadcastAssignmentRemoval;
exports.attachAdminBroadcastFunctions = attachAdminBroadcastFunctions;
const logger_1 = require("../utils/logger");
const socketEvents_1 = require("./socketEvents");
function broadcastAssignmentUpdate(io, driverId, assignment) {
    logger_1.logger.websocket('Broadcasting assignment update', {
        driverId,
        busId: assignment.busId,
        type: 'admin_update',
    });
    io.to(socketEvents_1.SocketRooms.DRIVER(driverId)).emit(socketEvents_1.SocketEvents.DRIVER_ASSIGNMENT_UPDATE, {
        type: 'admin_update',
        assignment: {
            driverId: assignment.driverId,
            busId: assignment.busId,
            busNumber: assignment.busNumber,
            routeId: assignment.routeId,
            routeName: assignment.routeName,
            driverName: assignment.driverName,
            status: assignment.status || 'active',
            lastUpdated: assignment.lastUpdated || new Date().toISOString(),
        },
    });
}
function broadcastAssignmentRemoval(io, driverId, busId) {
    logger_1.logger.websocket('Broadcasting assignment removal', { driverId, busId });
    io.to(socketEvents_1.SocketRooms.DRIVER(driverId)).emit(socketEvents_1.SocketEvents.DRIVER_ASSIGNMENT_UPDATE, {
        type: 'removed',
        assignment: null,
        message: 'Your bus assignment has been removed by an administrator',
    });
}
function attachAdminBroadcastFunctions(io) {
    io.broadcastAssignmentUpdate = (driverId, assignment) => {
        broadcastAssignmentUpdate(io, driverId, assignment);
    };
    io.broadcastAssignmentRemoval = (driverId, busId) => {
        broadcastAssignmentRemoval(io, driverId, busId);
    };
}
//# sourceMappingURL=adminHandler.js.map