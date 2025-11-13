"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerWithSocket = createServerWithSocket;
exports.initializeSocketServer = initializeSocketServer;
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socketServer_1 = require("../websocket/socketServer");
const WebSocketHealthService_1 = require("../services/WebSocketHealthService");
const environment_1 = __importDefault(require("../config/environment"));
const logger_1 = require("../utils/logger");
function createServerWithSocket(app) {
    const server = (0, http_1.createServer)(app);
    const io = new socket_io_1.Server(server, {
        cors: environment_1.default.websocket.cors,
    });
    return { server, io };
}
function initializeSocketServer(io) {
    logger_1.logger.info('🔌 Initializing WebSocket server...', 'server');
    (0, socketServer_1.initializeWebSocket)(io);
    WebSocketHealthService_1.webSocketHealth.initialize(io);
    logger_1.logger.info('📊 WebSocket health monitoring started', 'server');
}
//# sourceMappingURL=socket.js.map