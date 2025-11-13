"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDriverHandler = setupDriverHandler;
const OptimizedLocationService_1 = require("../services/OptimizedLocationService");
const logger_1 = require("../utils/logger");
const socketEvents_1 = require("./socketEvents");
const socketUtils_1 = require("./socketUtils");
function setupDriverHandler(socket) {
    socket.on(socketEvents_1.SocketEvents.DRIVER_INITIALIZE, async () => {
        try {
            if (!socket.isAuthenticated || !socket.userId) {
                logger_1.logger.websocket('Driver initialization failed: Not authenticated', {
                    socketId: socket.id,
                });
                socket.emit(socketEvents_1.SocketEvents.DRIVER_INITIALIZATION_FAILED, {
                    message: 'Authentication required',
                    code: socketEvents_1.SocketErrorCodes.NOT_AUTHENTICATED,
                });
                return;
            }
            if (socket.userRole !== 'driver' && socket.userRole !== 'admin') {
                logger_1.logger.websocket('Driver initialization failed: Insufficient permissions', {
                    socketId: socket.id,
                    userRole: socket.userRole,
                    userId: socket.userId,
                });
                socket.emit(socketEvents_1.SocketEvents.DRIVER_INITIALIZATION_FAILED, {
                    message: 'Driver role required',
                    code: socketEvents_1.SocketErrorCodes.INSUFFICIENT_PERMISSIONS,
                });
                return;
            }
            logger_1.logger.websocket('Driver initialization', {
                userId: socket.userId,
                role: socket.userRole,
            });
            let busInfo = null;
            let isTimeout = false;
            try {
                const busInfoPromise = OptimizedLocationService_1.optimizedLocationService.getDriverBusInfo(socket.userId);
                const timeoutPromise = new Promise((resolve) => {
                    setTimeout(() => resolve({ timeout: true }), 10000);
                });
                const result = await Promise.race([busInfoPromise, timeoutPromise]);
                if (result && result.timeout) {
                    isTimeout = true;
                }
                else {
                    busInfo = result;
                }
            }
            catch (error) {
                logger_1.logger.error('Error fetching bus info during driver initialization', 'websocket', {
                    userId: socket.userId,
                    socketId: socket.id,
                    error: error instanceof Error ? error.message : String(error),
                });
                socket.emit(socketEvents_1.SocketEvents.DRIVER_INITIALIZATION_FAILED, {
                    message: 'Failed to retrieve bus information. Please try again.',
                    code: socketEvents_1.SocketErrorCodes.INIT_ERROR,
                });
                return;
            }
            if (isTimeout) {
                logger_1.logger.error('Driver initialization timeout: getDriverBusInfo took too long', 'websocket', {
                    userId: socket.userId,
                    socketId: socket.id,
                });
                socket.emit(socketEvents_1.SocketEvents.DRIVER_INITIALIZATION_FAILED, {
                    message: 'Initialization timeout. Please try again.',
                    code: socketEvents_1.SocketErrorCodes.INIT_ERROR,
                });
                return;
            }
            logger_1.logger.websocket('Bus info retrieved', {
                userId: socket.userId,
                busInfo: busInfo
                    ? {
                        id: busInfo.id,
                        bus_id: busInfo.bus_id,
                        bus_number: busInfo.bus_number,
                        route_id: busInfo.route_id,
                    }
                    : null,
            });
            if (!busInfo) {
                logger_1.logger.websocket('No bus assigned to driver', {
                    userId: socket.userId,
                    userRole: socket.userRole,
                });
                socket.emit(socketEvents_1.SocketEvents.DRIVER_INITIALIZATION_FAILED, {
                    message: 'No bus assigned to driver. Please contact your administrator.',
                    code: socketEvents_1.SocketErrorCodes.NO_BUS_ASSIGNED,
                });
                return;
            }
            socket.driverId = socket.userId;
            socket.busId = busInfo.id;
            socket.lastActivity = Date.now();
            (0, socketUtils_1.joinRelevantRooms)(socket, socket.userId, socket.busId);
            logger_1.logger.websocket('Driver initialized and assigned', {
                driverId: socket.userId,
                busId: socket.busId,
                busInfoFields: {
                    id: busInfo.id,
                    bus_id: busInfo.bus_id,
                    bus_number: busInfo.bus_number,
                },
            });
            const initResponse = {
                driverId: socket.userId,
                busId: socket.busId,
                busInfo: busInfo,
            };
            logger_1.logger.websocket('Sending initialization response', {
                driverId: initResponse.driverId,
                busId: initResponse.busId,
                busNumber: initResponse.busInfo?.bus_number,
            });
            socket.emit(socketEvents_1.SocketEvents.DRIVER_INITIALIZED, initResponse);
            if (!socket.busId) {
                logger_1.logger.error('Bus ID not set after initialization', 'driver-handler', {
                    driverId: socket.userId,
                    busInfo: busInfo
                });
                socket.emit(socketEvents_1.SocketEvents.DRIVER_INITIALIZATION_FAILED, {
                    message: 'Bus ID not available',
                    code: socketEvents_1.SocketErrorCodes.INIT_ERROR,
                });
                return;
            }
            const assignment = {
                driverId: socket.userId,
                busId: socket.busId,
                busNumber: busInfo.bus_number,
                routeId: busInfo.route_id,
                routeName: busInfo.route_name,
                driverName: busInfo.driver_name,
                status: 'active',
                lastUpdated: new Date().toISOString(),
            };
            socket.emit(socketEvents_1.SocketEvents.DRIVER_ASSIGNMENT_UPDATE, {
                type: 'initial',
                assignment,
            });
        }
        catch (error) {
            logger_1.logger.error('Driver initialization error', 'websocket', {
                socketId: socket.id,
                userId: socket.userId,
                userRole: socket.userRole,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, error);
            socket.emit(socketEvents_1.SocketEvents.DRIVER_INITIALIZATION_FAILED, {
                message: 'Initialization failed. Please try again.',
                code: socketEvents_1.SocketErrorCodes.INIT_ERROR,
            });
        }
    });
    socket.on(socketEvents_1.SocketEvents.DRIVER_REQUEST_ASSIGNMENT_UPDATE, async () => {
        try {
            if (!socket.isAuthenticated || !socket.userId || socket.userRole !== 'driver') {
                (0, socketUtils_1.emitError)(socket, 'Authentication required', socketEvents_1.SocketErrorCodes.NOT_AUTHENTICATED);
                return;
            }
            const busInfo = await OptimizedLocationService_1.optimizedLocationService.getDriverBusInfo(socket.userId);
            if (busInfo) {
                const assignment = {
                    driverId: socket.userId,
                    busId: busInfo.id,
                    busNumber: busInfo.bus_number,
                    routeId: busInfo.route_id,
                    routeName: busInfo.route_name,
                    driverName: busInfo.driver_name,
                    status: 'active',
                    lastUpdated: new Date().toISOString(),
                };
                socket.emit(socketEvents_1.SocketEvents.DRIVER_ASSIGNMENT_UPDATE, {
                    type: 'refresh',
                    assignment,
                });
            }
            else {
                socket.emit(socketEvents_1.SocketEvents.DRIVER_ASSIGNMENT_UPDATE, {
                    type: 'no_assignment',
                    assignment: null,
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error handling assignment update request', 'websocket', {
                socketId: socket.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            (0, socketUtils_1.emitError)(socket, 'Failed to get assignment update', socketEvents_1.SocketErrorCodes.ASSIGNMENT_UPDATE_ERROR);
        }
    });
}
//# sourceMappingURL=driverHandler.js.map