"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteController = void 0;
const routeService_1 = require("../services/routeService");
const ConsolidatedAdminService_1 = require("../services/ConsolidatedAdminService");
const validation_1 = require("../utils/validation");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger_1 = require("../utils/logger");
class RouteController {
    static async getAllRoutes(req, res) {
        try {
            const routes = await routeService_1.RouteService.getAllRoutes();
            responseHelpers_1.ResponseHelper.success(res, routes);
        }
        catch (error) {
            logger_1.logger.error('Error fetching routes', 'route-controller', { error });
            responseHelpers_1.ResponseHelper.internalError(res, 'Failed to fetch routes');
        }
    }
    static async getRoutesInViewport(req, res) {
        try {
            const { minLng, minLat, maxLng, maxLat } = req.query;
            if (!minLng || !minLat || !maxLng || !maxLat) {
                responseHelpers_1.ResponseHelper.badRequest(res, 'minLng, minLat, maxLng, maxLat are required');
                return;
            }
            const viewport = {
                minLng: parseFloat(minLng),
                minLat: parseFloat(minLat),
                maxLng: parseFloat(maxLng),
                maxLat: parseFloat(maxLat),
            };
            const routes = await routeService_1.RouteService.getRoutesInViewport(viewport);
            responseHelpers_1.ResponseHelper.success(res, routes);
        }
        catch (error) {
            logger_1.logger.error('Error fetching routes in viewport', 'route-controller', { error });
            responseHelpers_1.ResponseHelper.internalError(res, 'Failed to fetch routes in viewport');
        }
    }
    static async getRouteById(req, res) {
        try {
            const { routeId } = req.params;
            const route = await routeService_1.RouteService.getRouteById(routeId);
            if (!route) {
                responseHelpers_1.ResponseHelper.notFound(res, `Route with ID ${routeId}`);
                return;
            }
            responseHelpers_1.ResponseHelper.success(res, route);
        }
        catch (error) {
            logger_1.logger.error('Error fetching route', 'route-controller', { error });
            responseHelpers_1.ResponseHelper.internalError(res, 'Failed to fetch route');
        }
    }
    static async createRoute(req, res) {
        try {
            const routeData = req.body;
            const validationError = (0, validation_1.validateRouteData)(routeData);
            if (validationError) {
                responseHelpers_1.ResponseHelper.validationError(res, validationError);
                return;
            }
            const newRoute = await routeService_1.RouteService.createRoute(routeData);
            if (!newRoute) {
                responseHelpers_1.ResponseHelper.internalError(res, 'Database error occurred');
                return;
            }
            responseHelpers_1.ResponseHelper.created(res, newRoute, 'Route created successfully');
        }
        catch (error) {
            logger_1.logger.error('Error creating route', 'route-controller', { error });
            responseHelpers_1.ResponseHelper.internalError(res, 'Failed to create route');
        }
    }
    static async updateRoute(req, res) {
        try {
            const { routeId } = req.params;
            const routeData = req.body;
            const updatedRoute = await ConsolidatedAdminService_1.ConsolidatedAdminService.updateRoute(routeId, routeData);
            if (!updatedRoute) {
                responseHelpers_1.ResponseHelper.notFound(res, `Route with ID ${routeId}`);
                return;
            }
            responseHelpers_1.ResponseHelper.success(res, updatedRoute, 'Route updated successfully');
        }
        catch (error) {
            logger_1.logger.error('Error updating route', 'route-controller', { error });
            responseHelpers_1.ResponseHelper.internalError(res, 'Failed to update route');
        }
    }
    static async deleteRoute(req, res) {
        try {
            const { routeId } = req.params;
            const deletedRoute = await ConsolidatedAdminService_1.ConsolidatedAdminService.deleteRoute(routeId);
            if (!deletedRoute) {
                responseHelpers_1.ResponseHelper.notFound(res, `Route with ID ${routeId}`);
                return;
            }
            responseHelpers_1.ResponseHelper.success(res, deletedRoute, 'Route deleted successfully');
        }
        catch (error) {
            logger_1.logger.error('Error deleting route', 'route-controller', { error });
            responseHelpers_1.ResponseHelper.internalError(res, 'Failed to delete route');
        }
    }
    static async assignBusToRoute(req, res) {
        try {
            const { routeId } = req.params;
            const { busId } = req.body;
            if (!busId) {
                responseHelpers_1.ResponseHelper.badRequest(res, 'Bus ID is required');
                return;
            }
            const success = await routeService_1.RouteService.assignBusToRoute(busId, routeId);
            if (!success) {
                responseHelpers_1.ResponseHelper.notFound(res, 'Bus or route not found');
                return;
            }
            responseHelpers_1.ResponseHelper.success(res, null, 'Bus assigned to route successfully');
        }
        catch (error) {
            logger_1.logger.error('Error assigning bus to route', 'route-controller', { error });
            responseHelpers_1.ResponseHelper.internalError(res, 'Failed to assign bus to route');
        }
    }
    static async calculateETA(req, res) {
        try {
            const { routeId } = req.params;
            const { bus_id, latitude, longitude, timestamp } = req.body;
            if (!bus_id || latitude === undefined || longitude === undefined) {
                responseHelpers_1.ResponseHelper.badRequest(res, 'Bus ID, latitude, and longitude are required');
                return;
            }
            const busLocation = {
                bus_id,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                timestamp: timestamp || new Date().toISOString(),
            };
            const etaInfo = await routeService_1.RouteService.calculateETA(busLocation, routeId);
            if (!etaInfo) {
                responseHelpers_1.ResponseHelper.notFound(res, 'Route not found or invalid data');
                return;
            }
            responseHelpers_1.ResponseHelper.success(res, etaInfo);
        }
        catch (error) {
            logger_1.logger.error('Error calculating ETA', 'route-controller', { error });
            responseHelpers_1.ResponseHelper.internalError(res, 'Failed to calculate ETA');
        }
    }
    static async checkBusNearStop(req, res) {
        try {
            const { routeId } = req.params;
            const { bus_id, latitude, longitude, timestamp } = req.body;
            if (!bus_id || latitude === undefined || longitude === undefined) {
                responseHelpers_1.ResponseHelper.badRequest(res, 'Bus ID, latitude, and longitude are required');
                return;
            }
            const busLocation = {
                bus_id,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                timestamp: timestamp || new Date().toISOString(),
            };
            const nearStopInfo = await routeService_1.RouteService.checkBusNearStop(busLocation, routeId);
            responseHelpers_1.ResponseHelper.success(res, nearStopInfo);
        }
        catch (error) {
            logger_1.logger.error('Error checking bus near stop', 'route-controller', { error });
            responseHelpers_1.ResponseHelper.internalError(res, 'Failed to check bus near stop');
        }
    }
}
exports.RouteController = RouteController;
//# sourceMappingURL=routeController.js.map