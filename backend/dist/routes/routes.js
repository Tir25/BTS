"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routeController_1 = require("../controllers/routeController");
const router = express_1.default.Router();
router.get('/', routeController_1.RouteController.getAllRoutes);
router.get('/viewport', routeController_1.RouteController.getRoutesInViewport);
router.get('/:routeId', routeController_1.RouteController.getRouteById);
router.post('/', routeController_1.RouteController.createRoute);
router.post('/:routeId/assign-bus', routeController_1.RouteController.assignBusToRoute);
router.post('/:routeId/calculate-eta', routeController_1.RouteController.calculateETA);
router.post('/:routeId/check-near-stop', routeController_1.RouteController.checkBusNearStop);
exports.default = router;
//# sourceMappingURL=routes.js.map