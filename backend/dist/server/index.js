"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const routes_1 = require("./routes");
const socket_1 = require("./socket");
const shutdown_1 = require("./shutdown");
const initialization_1 = require("./initialization");
const monitoring_1 = require("./monitoring");
const serverConfig_1 = require("./config/serverConfig");
const errorHandler_1 = require("../middleware/errorHandler");
const monitoring_2 = require("../middleware/monitoring");
const logger_1 = require("../utils/logger");
async function startServer() {
    try {
        logger_1.logger.info('🚀 Starting University Bus Tracking System Backend...', 'server');
        const app = (0, app_1.createApp)();
        (0, routes_1.registerRoutes)(app);
        app.use(monitoring_2.errorMonitoring);
        app.use(errorHandler_1.globalErrorHandler);
        app.use(errorHandler_1.notFoundHandler);
        const { server, io } = (0, socket_1.createServerWithSocket)(app);
        (0, shutdown_1.setupShutdownHandlers)(io, server);
        (0, monitoring_1.setupMemoryMonitoring)();
        await (0, initialization_1.initializeServices)();
        (0, socket_1.initializeSocketServer)(io);
        logger_1.logger.info(`🌐 Starting server on port ${serverConfig_1.SERVER_CONFIG.PORT}...`, 'server');
        server.listen(serverConfig_1.SERVER_CONFIG.PORT, '0.0.0.0', () => {
            logger_1.logger.serverReady(serverConfig_1.SERVER_CONFIG.PORT);
            logger_1.logger.info(`📊 Health check: http://localhost:${serverConfig_1.SERVER_CONFIG.PORT}/health`, 'server');
            logger_1.logger.info(`📈 Detailed health: http://localhost:${serverConfig_1.SERVER_CONFIG.PORT}/health/detailed`, 'server');
            logger_1.logger.info(`🔗 API base: http://localhost:${serverConfig_1.SERVER_CONFIG.PORT}`, 'server');
            logger_1.logger.info(`🌍 Network access: http://0.0.0.0:${serverConfig_1.SERVER_CONFIG.PORT}`, 'server');
            logger_1.logger.info(`🔌 WebSocket server: ws://localhost:${serverConfig_1.SERVER_CONFIG.PORT}`, 'server');
            logger_1.logger.info(`🌐 WebSocket network: ws://0.0.0.0:${serverConfig_1.SERVER_CONFIG.PORT}`, 'server');
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to start server:', 'server', { error: error.message, stack: error.stack });
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map