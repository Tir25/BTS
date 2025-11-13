"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_CONFIG = void 0;
exports.SERVER_CONFIG = {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    DEMO_MODE: process.env.DEMO_MODE === 'true',
    MEMORY_WARNING_THRESHOLD: 300 * 1024 * 1024,
    MEMORY_CRITICAL_THRESHOLD: 350 * 1024 * 1024,
    MEMORY_EMERGENCY_THRESHOLD: 400 * 1024 * 1024,
    MEMORY_CHECK_INTERVAL: 2 * 60 * 1000,
    MAX_REQUEST_SIZE: '10mb',
    MAX_BODY_SIZE: 50 * 1024 * 1024,
};
//# sourceMappingURL=serverConfig.js.map