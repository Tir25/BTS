"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthController_1 = require("../controllers/healthController");
const router = (0, express_1.Router)();
router.get('/', healthController_1.HealthController.getHealth);
router.get('/detailed', healthController_1.HealthController.getDetailedHealth);
router.get('/ready', healthController_1.HealthController.getReadiness);
router.get('/live', healthController_1.HealthController.getLiveness);
router.get('/websocket', healthController_1.HealthController.getWebSocketHealth);
router.get('/pool', healthController_1.HealthController.getConnectionPoolHealth);
router.get('/metrics', healthController_1.HealthController.getMetrics);
exports.default = router;
//# sourceMappingURL=health.js.map