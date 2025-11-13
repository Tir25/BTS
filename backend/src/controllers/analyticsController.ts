/**
 * Analytics Controller
 * Handles HTTP requests for analytics and system health endpoints
 */

import { Request, Response } from 'express';
import { BusDatabaseService } from '../services/database/BusDatabaseService';
import { DriverDatabaseService } from '../services/database/DriverDatabaseService';
import { RouteQueryService } from '../services/routes/RouteQueryService';
import { monitoringService } from '../services/MonitoringService';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export class AnalyticsController {
  /**
   * Get system analytics
   */
  static async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const [buses, drivers, routes] = await Promise.all([
        BusDatabaseService.getAllBuses(),
        DriverDatabaseService.getAllDrivers(),
        RouteQueryService.getAllRoutes()
      ]);

      const analytics = {
        totalBuses: buses.length,
        activeBuses: buses.filter(bus => bus.is_active).length,
        totalRoutes: routes.length,
        activeRoutes: routes.filter((route: any) => route.is_active).length,
        totalDrivers: drivers.length,
        activeDrivers: drivers.filter(driver => driver.is_active).length,
        averageDelay: 0,
        busUsageStats: []
      };

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching analytics', 'analytics-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get system health
   */
  static async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      // Use MonitoringService for comprehensive health check
      const monitoringHealth = await monitoringService.getSystemHealth();
      
      // Also get basic counts for compatibility
      const [buses, routes, drivers, recentLocationsResult] = await Promise.all([
        BusDatabaseService.getAllBuses(),
        RouteQueryService.getAllRoutes(),
        DriverDatabaseService.getAllDrivers(),
        supabaseAdmin
          .from('live_locations')
          .select('id', { count: 'exact', head: true })
          .gte('recorded_at', new Date(Date.now() - 3600000).toISOString())
      ]);

      const health = {
        ...monitoringHealth,
        counts: {
          buses: buses.length,
          routes: routes.length,
          drivers: drivers.length,
          recentLocations: recentLocationsResult.count || 0,
        },
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching system health', 'analytics-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system health',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Clear all data (Development only)
   */
  static async clearAllData(req: Request, res: Response): Promise<void> {
    try {
      // Only allow in development
      if (process.env.NODE_ENV !== 'development') {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'This endpoint is only available in development mode',
        });
        return;
      }

      // This is a dangerous operation - should be used with caution
      logger.warn('Clearing all data - this is a destructive operation', 'analytics-controller');
      
      // Clear buses
      await supabaseAdmin.from('buses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Clear routes
      await supabaseAdmin.from('routes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Clear user profiles (except admin users)
      await supabaseAdmin.from('user_profiles').delete().neq('role', 'admin');
      
      logger.info('All data cleared successfully', 'analytics-controller');
      const result = { success: true, message: 'All data cleared successfully' };

      res.json({
        success: true,
        data: result,
        message: 'All data cleared successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error clearing all data', 'analytics-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({
        success: false,
        error: 'Failed to clear all data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

