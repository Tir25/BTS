"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const dbHealth = await (0, database_1.checkDatabaseHealth)();
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            services: {
                database: {
                    status: dbHealth.healthy ? 'healthy' : 'unhealthy',
                    details: {
                        status: dbHealth.healthy ? 'connected' : 'disconnected',
                        error: dbHealth.error,
                    },
                },
                api: {
                    status: 'operational',
                    database: dbHealth.healthy ? 'operational' : 'down',
                },
            },
        };
        const statusCode = dbHealth.healthy ? 200 : 503;
        res.status(statusCode).json(healthData);
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        });
    }
});
router.get('/detailed', async (req, res) => {
    try {
        const dbHealth = await (0, database_1.checkDatabaseHealth)();
        res.status(200).json({
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            database: dbHealth,
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                memory: process.memoryUsage(),
                uptime: process.uptime(),
            },
            version: '1.0.0',
        });
    }
    catch (error) {
        console.error('Detailed health check failed:', error);
        res.status(503).json({
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/websocket', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        websocket: {
            status: 'operational',
            cors: {
                enabled: true,
                origins: ['http://localhost:5173', 'http://localhost:3000', 'https://bts-frontend-navy.vercel.app'],
            },
            endpoints: {
                socketio: '/socket.io/',
                sse: '/sse',
            },
        },
    });
});
exports.default = router;
//# sourceMappingURL=health.js.map