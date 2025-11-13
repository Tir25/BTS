"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupStudentHandler = setupStudentHandler;
const logger_1 = require("../utils/logger");
const socketEvents_1 = require("./socketEvents");
const socketUtils_1 = require("./socketUtils");
function setupStudentHandler(socket) {
    socket.on(socketEvents_1.SocketEvents.STUDENT_CONNECT, () => {
        try {
            const isAnonymousStudent = !socket.isAuthenticated && socket.userId?.startsWith('anonymous-student');
            const isAuthenticatedStudent = socket.isAuthenticated &&
                socket.userId &&
                (socket.userRole === 'student' || socket.userRole === 'admin' || socket.userRole === 'driver');
            if (!isAnonymousStudent && !isAuthenticatedStudent) {
                if (socket.userRole &&
                    socket.userRole !== 'student' &&
                    socket.userRole !== 'admin' &&
                    socket.userRole !== 'driver') {
                    (0, socketUtils_1.emitError)(socket, 'Valid role required for student map access', socketEvents_1.SocketErrorCodes.INSUFFICIENT_PERMISSIONS);
                    return;
                }
                const allowAnonymous = process.env.ALLOW_ANONYMOUS_STUDENTS === 'true';
                if (!socket.userRole && !socket.userId) {
                    if (!allowAnonymous && process.env.NODE_ENV === 'production') {
                        (0, socketUtils_1.emitError)(socket, 'Authentication required in production mode', socketEvents_1.SocketErrorCodes.AUTHENTICATION_REQUIRED);
                        return;
                    }
                    socket.userId = `anonymous-student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    socket.userRole = 'student';
                    socket.isAuthenticated = false;
                }
                else {
                    (0, socketUtils_1.emitError)(socket, 'Authentication required', socketEvents_1.SocketErrorCodes.NOT_AUTHENTICATED);
                    return;
                }
            }
            socket.lastActivity = Date.now();
            socket.join(socketEvents_1.SocketRooms.STUDENTS);
            const isAnonymous = socket.userId?.startsWith('anonymous-student') || false;
            const responseUserId = isAnonymous ? 'anonymous' : socket.userId;
            logger_1.logger.websocket('Student connected successfully', {
                socketId: socket.id,
                userId: responseUserId,
                isAnonymous: isAnonymous,
                isAuthenticated: socket.isAuthenticated,
                userRole: socket.userRole,
            });
            socket.emit(socketEvents_1.SocketEvents.STUDENT_CONNECTED, {
                timestamp: new Date().toISOString(),
                userId: responseUserId,
                isAnonymous: isAnonymous,
            });
        }
        catch (error) {
            logger_1.logger.error('Error handling student connection', 'websocket', { socketId: socket.id }, error);
            (0, socketUtils_1.emitError)(socket, 'Failed to process student connection', socketEvents_1.SocketErrorCodes.CONNECTION_ERROR);
        }
    });
}
//# sourceMappingURL=studentHandler.js.map