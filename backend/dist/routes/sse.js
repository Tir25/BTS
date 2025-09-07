"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSSEEvent = void 0;
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.options('/', (_req, res) => {
    return res.sendStatus(204);
});
router.get('/', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        Connection: 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
    });
    res.write(`data: ${JSON.stringify({
        type: 'connection',
        message: 'SSE connection established',
        timestamp: new Date().toISOString(),
    })}\n\n`);
    const heartbeat = setInterval(() => {
        res.write(`data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
        })}\n\n`);
    }, 30000);
    req.on('close', () => {
        console.log('🔌 SSE client disconnected');
        clearInterval(heartbeat);
    });
    req.on('error', (error) => {
        console.error('❌ SSE connection error:', error);
        clearInterval(heartbeat);
    });
});
const sendSSEEvent = (eventType, data) => {
    console.log(`📡 SSE Event: ${eventType}`, data);
};
exports.sendSSEEvent = sendSSEEvent;
exports.default = router;
//# sourceMappingURL=sse.js.map