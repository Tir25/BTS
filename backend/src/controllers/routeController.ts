/**
 * Unified Route Controller
 * Consolidates route management logic from routes.ts and admin.ts
 */

import { Request, Response } from 'express';
import { RouteQueryService } from '../services/routes/RouteQueryService';
import { RouteMutationService } from '../services/routes/RouteMutationService';
import { ConsolidatedAdminService } from '../services/ConsolidatedAdminService';
import { validateRouteData } from '../utils/validation';
import { ResponseHelper } from '../utils/responseHelpers';
import { logger } from '../utils/logger';

export class RouteController {
  /**
   * Get all routes with GeoJSON data
   */
  static async getAllRoutes(req: Request, res: Response): Promise<void> {
    try {
      const routes = await RouteQueryService.getAllRoutes();
      ResponseHelper.success(res, routes);
    } catch (error) {
      logger.error('Error fetching routes', 'route-controller', { error });
      ResponseHelper.internalError(res, 'Failed to fetch routes');
    }
  }

  /**
   * Get routes within viewport (spatial query)
   */
  static async getRoutesInViewport(req: Request, res: Response): Promise<void> {
    try {
      const { minLng, minLat, maxLng, maxLat } = req.query;

      if (!minLng || !minLat || !maxLng || !maxLat) {
        ResponseHelper.badRequest(res, 'minLng, minLat, maxLng, maxLat are required');
        return;
      }

      const viewport = {
        minLng: parseFloat(minLng as string),
        minLat: parseFloat(minLat as string),
        maxLng: parseFloat(maxLng as string),
        maxLat: parseFloat(maxLat as string),
      };

      const routes = await RouteQueryService.getRoutesInViewport(viewport);
      ResponseHelper.success(res, routes);
    } catch (error) {
      logger.error('Error fetching routes in viewport', 'route-controller', { error });
      ResponseHelper.internalError(res, 'Failed to fetch routes in viewport');
    }
  }

  /**
   * Get specific route with GeoJSON data
   */
  static async getRouteById(req: Request, res: Response): Promise<void> {
    try {
      const { routeId } = req.params;
      const route = await RouteQueryService.getRouteById(routeId);

      if (!route) {
        ResponseHelper.notFound(res, `Route with ID ${routeId}`);
        return;
      }

      ResponseHelper.success(res, route);
    } catch (error) {
      logger.error('Error fetching route', 'route-controller', { error });
      ResponseHelper.internalError(res, 'Failed to fetch route');
    }
  }

  /**
   * Create new route (with validation)
   */
  static async createRoute(req: Request, res: Response): Promise<void> {
    try {
      const routeData = req.body;

      // Validate route data
      const validationError = validateRouteData(routeData);
      if (validationError) {
        ResponseHelper.validationError(res, validationError);
        return;
      }

      const newRoute = await RouteMutationService.createRoute(routeData);

      if (!newRoute) {
        ResponseHelper.internalError(res, 'Database error occurred');
        return;
      }

      ResponseHelper.created(res, newRoute, 'Route created successfully');
    } catch (error) {
      logger.error('Error creating route', 'route-controller', { error });
      ResponseHelper.internalError(res, 'Failed to create route');
    }
  }

  /**
   * Update route
   */
  static async updateRoute(req: Request, res: Response): Promise<void> {
    try {
      const { routeId } = req.params;
      const routeData = req.body;

      const updatedRoute = await ConsolidatedAdminService.updateRoute(routeId, routeData);

      if (!updatedRoute) {
        ResponseHelper.notFound(res, `Route with ID ${routeId}`);
        return;
      }

      ResponseHelper.success(res, updatedRoute, 'Route updated successfully');
    } catch (error) {
      logger.error('Error updating route', 'route-controller', { error });
      ResponseHelper.internalError(res, 'Failed to update route');
    }
  }

  /**
   * Delete route
   */
  static async deleteRoute(req: Request, res: Response): Promise<void> {
    try {
      const { routeId } = req.params;
      const deletedRoute = await ConsolidatedAdminService.deleteRoute(routeId);

      if (!deletedRoute) {
        ResponseHelper.notFound(res, `Route with ID ${routeId}`);
        return;
      }

      ResponseHelper.success(res, deletedRoute, 'Route deleted successfully');
    } catch (error) {
      logger.error('Error deleting route', 'route-controller', { error });
      ResponseHelper.internalError(res, 'Failed to delete route');
    }
  }

  /**
   * Assign bus to route
   */
  static async assignBusToRoute(req: Request, res: Response): Promise<void> {
    try {
      const { routeId } = req.params;
      const { busId } = req.body;

      if (!busId) {
        ResponseHelper.badRequest(res, 'Bus ID is required');
        return;
      }

      const success = await RouteMutationService.assignBusToRoute(busId, routeId);

      if (!success) {
        ResponseHelper.notFound(res, 'Bus or route not found');
        return;
      }

      ResponseHelper.success(res, null, 'Bus assigned to route successfully');
    } catch (error) {
      logger.error('Error assigning bus to route', 'route-controller', { error });
      ResponseHelper.internalError(res, 'Failed to assign bus to route');
    }
  }

  /**
   * Calculate ETA for a bus on a route
   */
  static async calculateETA(req: Request, res: Response): Promise<void> {
    try {
      const { routeId } = req.params;
      const { bus_id, latitude, longitude, timestamp } = req.body;

      if (!bus_id || latitude === undefined || longitude === undefined) {
        ResponseHelper.badRequest(res, 'Bus ID, latitude, and longitude are required');
        return;
      }

      const busLocation = {
        bus_id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: timestamp || new Date().toISOString(),
      };

      const etaInfo = await RouteQueryService.calculateETA(busLocation, routeId);

      if (!etaInfo) {
        ResponseHelper.notFound(res, 'Route not found or invalid data');
        return;
      }

      ResponseHelper.success(res, etaInfo);
    } catch (error) {
      logger.error('Error calculating ETA', 'route-controller', { error });
      ResponseHelper.internalError(res, 'Failed to calculate ETA');
    }
  }

  /**
   * Check if bus is near a stop
   */
  static async checkBusNearStop(req: Request, res: Response): Promise<void> {
    try {
      const { routeId } = req.params;
      const { bus_id, latitude, longitude, timestamp } = req.body;

      if (!bus_id || latitude === undefined || longitude === undefined) {
        ResponseHelper.badRequest(res, 'Bus ID, latitude, and longitude are required');
        return;
      }

      const busLocation = {
        bus_id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: timestamp || new Date().toISOString(),
      };

      const nearStopInfo = await RouteQueryService.checkBusNearStop(busLocation, routeId);
      ResponseHelper.success(res, nearStopInfo);
    } catch (error) {
      logger.error('Error checking bus near stop', 'route-controller', { error });
      ResponseHelper.internalError(res, 'Failed to check bus near stop');
    }
  }
}
