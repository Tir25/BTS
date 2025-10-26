/**
 * @deprecated This service is deprecated and will be removed in v2.0.0
 * Use individual microservices instead:
 * - User Service: /users
 * - Bus Service: /buses  
 * - Route Service: /routes
 * - Assignment Service: /assignments
 * 
 * Consolidated Admin Service
 * Uses domain services for all operations to eliminate duplication
 */

import { UnifiedDatabaseService } from './UnifiedDatabaseService';
import { RouteService } from './routeService';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export interface AnalyticsData {
  totalBuses: number;
  activeBuses: number;
  totalRoutes: number;
  activeRoutes: number;
  totalDrivers: number;
  activeDrivers: number;
  averageDelay: number;
  busUsageStats: {
    date: string;
    activeBuses: number;
    totalTrips: number;
  }[];
}

export interface SystemHealth {
  database: 'healthy' | 'unhealthy';
  services: 'healthy' | 'unhealthy';
  lastCheck: string;
  uptime: number;
}

export class ConsolidatedAdminService {
  // Bus Management - Delegate to BusService
  static async getAllBuses() {
    try {
      return await UnifiedDatabaseService.getAllBuses();
    } catch (error) {
      logger.error('Error in getAllBuses', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async getBusById(busId: string) {
    try {
      return await UnifiedDatabaseService.getBusById(busId);
    } catch (error) {
      logger.error('Error in getBusById', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async createBus(busData: any) {
    try {
      return await UnifiedDatabaseService.createBus(busData);
    } catch (error) {
      logger.error('Error in createBus', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async updateBus(busId: string, busData: any) {
    try {
      return await UnifiedDatabaseService.updateBus(busId, busData);
    } catch (error) {
      logger.error('Error in updateBus', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async deleteBus(busId: string) {
    try {
      return await UnifiedDatabaseService.deleteBus(busId);
    } catch (error) {
      logger.error('Error in deleteBus', 'consolidated-admin', { error });
      throw error;
    }
  }

  // Driver Management - Delegate to DriverService
  static async getAllDrivers() {
    try {
      return await UnifiedDatabaseService.getAllDrivers();
    } catch (error) {
      logger.error('Error in getAllDrivers', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async getDriverById(driverId: string) {
    try {
      return await UnifiedDatabaseService.getDriverById(driverId);
    } catch (error) {
      logger.error('Error in getDriverById', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async createDriver(driverData: any) {
    try {
      return await UnifiedDatabaseService.createDriver(driverData);
    } catch (error) {
      logger.error('Error in createDriver', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async updateDriver(driverId: string, driverData: any) {
    try {
      return await UnifiedDatabaseService.updateDriver(driverId, driverData);
    } catch (error) {
      logger.error('Error in updateDriver', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async deleteDriver(driverId: string) {
    try {
      return await UnifiedDatabaseService.deleteDriver(driverId);
    } catch (error) {
      logger.error('Error in deleteDriver', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async cleanupInactiveDrivers() {
    try {
      return await UnifiedDatabaseService.cleanupInactiveDrivers();
    } catch (error) {
      logger.error('Error in cleanupInactiveDrivers', 'consolidated-admin', { error });
      throw error;
    }
  }

  // Route Management - Delegate to RouteService
  static async getAllRoutes() {
    try {
      return await RouteService.getAllRoutes();
    } catch (error) {
      logger.error('Error in getAllRoutes', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async getRouteById(routeId: string) {
    try {
      return await RouteService.getRouteById(routeId);
    } catch (error) {
      logger.error('Error in getRouteById', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async createRoute(routeData: any) {
    try {
      return await RouteService.createRoute(routeData);
    } catch (error) {
      logger.error('Error in createRoute', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async updateRoute(routeId: string, routeData: any) {
    try {
      return await RouteService.updateRoute(routeId, routeData);
    } catch (error) {
      logger.error('Error in updateRoute', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async deleteRoute(routeId: string) {
    try {
      return await RouteService.deleteRoute(routeId);
    } catch (error) {
      logger.error('Error in deleteRoute', 'consolidated-admin', { error });
      throw error;
    }
  }

  // Analytics and System Health - Simplified implementations
  static async getAnalytics(): Promise<AnalyticsData> {
    try {
      const [buses, drivers, routes] = await Promise.all([
        UnifiedDatabaseService.getAllBuses(),
        UnifiedDatabaseService.getAllDrivers(),
        UnifiedDatabaseService.getAllRoutes()
      ]);

      return {
        totalBuses: buses.length,
        activeBuses: buses.filter(bus => bus.is_active).length,
        totalRoutes: routes.length,
        activeRoutes: routes.filter((route: any) => route.is_active).length,
        totalDrivers: drivers.length,
        activeDrivers: drivers.filter(driver => driver.is_active).length,
        averageDelay: 0,
        busUsageStats: []
      };
    } catch (error) {
      logger.error('Error in getAnalytics', 'consolidated-admin', { error });
      throw error;
    }
  }

  static async getSystemHealth(): Promise<SystemHealth> {
    try {
      return {
        database: 'healthy',
        services: 'healthy',
        lastCheck: new Date().toISOString(),
        uptime: process.uptime()
      };
    } catch (error) {
      logger.error('Error in getSystemHealth', 'consolidated-admin', { error });
      return {
        database: 'unhealthy',
        services: 'unhealthy',
        lastCheck: new Date().toISOString(),
        uptime: process.uptime()
      };
    }
  }

  // Assignment methods removed - use ProductionAssignmentService instead

  static async clearAllData() {
    try {
      // This is a dangerous operation - should be used with caution
      logger.warn('Clearing all data - this is a destructive operation', 'consolidated-admin');
      
      // Clear buses
      await supabaseAdmin.from('buses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Clear routes
      await supabaseAdmin.from('routes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Clear user profiles (except admin users)
      await supabaseAdmin.from('user_profiles').delete().neq('role', 'admin');
      
      logger.info('All data cleared successfully', 'consolidated-admin');
      return { success: true, message: 'All data cleared successfully' };
    } catch (error) {
      logger.error('Error in clearAllData', 'consolidated-admin', { error });
      throw error;
    }
  }
}
