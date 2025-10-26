/**
 * Optimized Production Assignment Service
 * Eliminates N+1 queries and implements advanced query optimization
 */

import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { redisCache } from './RedisCacheService';

export interface OptimizedAssignmentData {
  id: string;
  driver_id: string;
  bus_id: string;
  route_id: string;
  assigned_by: string;
  notes?: string;
  assigned_at: string;
  status: 'active' | 'inactive' | 'pending';
  // Optimized joined data
  driver: {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  bus: {
    id: string;
    bus_number: string;
    vehicle_no: string;
    capacity: number;
    model: string;
    year: number;
  };
  route: {
    id: string;
    name: string;
    description: string;
    city: string;
  };
}

export interface OptimizedDashboard {
  total_assignments: number;
  active_assignments: number;
  unassigned_drivers: number;
  unassigned_buses: number;
  unassigned_routes: number;
  pending_assignments: number;
  recent_assignments: OptimizedAssignmentData[];
  statistics: {
    driver_utilization: number;
    bus_utilization: number;
    route_utilization: number;
  };
}

export class OptimizedAssignmentService {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly CACHE_PREFIX = 'assignments';

  /**
   * Get all assignments with optimized single query (eliminates N+1)
   */
  static async getAllAssignments(): Promise<OptimizedAssignmentData[]> {
    const cacheKey = `${this.CACHE_PREFIX}:all`;
    
    try {
      // Try cache first
      const cached = await redisCache.get<OptimizedAssignmentData[]>(cacheKey);
      if (cached) {
        logger.debug('Assignments cache hit', 'optimized-assignment-service');
        return cached;
      }

      // Single optimized query with all joins
      const { data, error } = await supabaseAdmin
        .from('buses')
        .select(`
          id,
          bus_number,
          vehicle_no,
          capacity,
          model,
          year,
          assigned_driver_profile_id,
          route_id,
          assignment_status,
          assignment_notes,
          updated_at,
          user_profiles!buses_assigned_driver_profile_id_fkey(
            id,
            full_name,
            first_name,
            last_name,
            email,
            phone
          ),
          routes!buses_route_id_fkey(
            id,
            name,
            description,
            city
          )
        `)
        .not('assigned_driver_profile_id', 'is', null)
        .not('route_id', 'is', null)
        .eq('is_active', true);

      if (error) {
        logger.error('Error fetching optimized assignments', 'optimized-assignment-service', { error });
        throw error;
      }

      const assignments = (data || []).map(bus => ({
        id: bus.id,
        driver_id: bus.assigned_driver_profile_id,
        bus_id: bus.id,
        route_id: bus.route_id,
        assigned_by: 'system', // TODO: Get from assignment history
        notes: bus.assignment_notes,
        assigned_at: bus.updated_at,
        status: bus.assignment_status || 'active',
        driver: {
          id: (bus.user_profiles as any)?.id || '',
          full_name: (bus.user_profiles as any)?.full_name || 'Unknown',
          first_name: (bus.user_profiles as any)?.first_name || '',
          last_name: (bus.user_profiles as any)?.last_name || '',
          email: (bus.user_profiles as any)?.email || '',
          phone: (bus.user_profiles as any)?.phone || '',
        },
        bus: {
          id: bus.id,
          bus_number: bus.bus_number,
          vehicle_no: bus.vehicle_no,
          capacity: bus.capacity,
          model: bus.model,
          year: bus.year,
        },
        route: {
          id: (bus.routes as any)?.id || '',
          name: (bus.routes as any)?.name || 'Unknown',
          description: (bus.routes as any)?.description || '',
          city: (bus.routes as any)?.city || '',
        }
      }));

      // Cache the result
      await redisCache.set(cacheKey, assignments, { ttl: this.CACHE_TTL });
      
      logger.info(`Fetched ${assignments.length} optimized assignments`, 'optimized-assignment-service');
      return assignments;
    } catch (error) {
      logger.error('Error in getAllAssignments', 'optimized-assignment-service', { error });
      throw error;
    }
  }

  /**
   * Get optimized dashboard with single query
   */
  static async getAssignmentDashboard(): Promise<OptimizedDashboard> {
    const cacheKey = `${this.CACHE_PREFIX}:dashboard`;
    
    try {
      // Try cache first
      const cached = await redisCache.get<OptimizedDashboard>(cacheKey);
      if (cached) {
        logger.debug('Dashboard cache hit', 'optimized-assignment-service');
        return cached;
      }

      // Single query to get all dashboard data
      const { data, error } = await supabaseAdmin
        .rpc('get_assignment_dashboard_data');

      if (error) {
        logger.error('Error fetching dashboard data', 'optimized-assignment-service', { error });
        throw error;
      }

      const dashboardData = data[0] || {};
      
      // Get recent assignments
      const recentAssignments = await this.getAllAssignments();
      
      const dashboard: OptimizedDashboard = {
        total_assignments: dashboardData.total_assignments || 0,
        active_assignments: dashboardData.active_assignments || 0,
        unassigned_drivers: dashboardData.unassigned_drivers || 0,
        unassigned_buses: dashboardData.unassigned_buses || 0,
        unassigned_routes: dashboardData.unassigned_routes || 0,
        pending_assignments: dashboardData.pending_assignments || 0,
        recent_assignments: recentAssignments.slice(0, 5),
        statistics: {
          driver_utilization: dashboardData.driver_utilization || 0,
          bus_utilization: dashboardData.bus_utilization || 0,
          route_utilization: dashboardData.route_utilization || 0,
        }
      };

      // Cache the result
      await redisCache.set(cacheKey, dashboard, { ttl: this.CACHE_TTL });
      
      logger.info('Fetched optimized dashboard', 'optimized-assignment-service', dashboard);
      return dashboard;
    } catch (error) {
      logger.error('Error in getAssignmentDashboard', 'optimized-assignment-service', { error });
      throw error;
    }
  }

  /**
   * Get assignment by bus ID with optimized query
   */
  static async getAssignmentByBus(busId: string): Promise<OptimizedAssignmentData | null> {
    const cacheKey = `${this.CACHE_PREFIX}:bus:${busId}`;
    
    try {
      // Try cache first
      const cached = await redisCache.get<OptimizedAssignmentData>(cacheKey);
      if (cached) {
        logger.debug('Assignment cache hit', 'optimized-assignment-service', { busId });
        return cached;
      }

      // Single optimized query with joins
      const { data, error } = await supabaseAdmin
        .from('buses')
        .select(`
          id,
          bus_number,
          vehicle_no,
          capacity,
          model,
          year,
          assigned_driver_profile_id,
          route_id,
          assignment_status,
          assignment_notes,
          updated_at,
          user_profiles!buses_assigned_driver_profile_id_fkey(
            id,
            full_name,
            first_name,
            last_name,
            email,
            phone
          ),
          routes!buses_route_id_fkey(
            id,
            name,
            description,
            city
          )
        `)
        .eq('id', busId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Error fetching assignment by bus', 'optimized-assignment-service', { error, busId });
        throw error;
      }

      if (!data || !data.assigned_driver_profile_id || !data.route_id) {
        return null;
      }

      const assignment: OptimizedAssignmentData = {
        id: data.id,
        driver_id: data.assigned_driver_profile_id,
        bus_id: data.id,
        route_id: data.route_id,
        assigned_by: 'system', // TODO: Get from assignment history
        notes: data.assignment_notes,
        assigned_at: data.updated_at,
        status: data.assignment_status || 'active',
        driver: {
          id: (data.user_profiles as any)?.id || '',
          full_name: (data.user_profiles as any)?.full_name || 'Unknown',
          first_name: (data.user_profiles as any)?.first_name || '',
          last_name: (data.user_profiles as any)?.last_name || '',
          email: (data.user_profiles as any)?.email || '',
          phone: (data.user_profiles as any)?.phone || '',
        },
        bus: {
          id: data.id,
          bus_number: data.bus_number,
          vehicle_no: data.vehicle_no,
          capacity: data.capacity,
          model: data.model,
          year: data.year,
        },
        route: {
          id: (data.routes as any)?.id || '',
          name: (data.routes as any)?.name || 'Unknown',
          description: (data.routes as any)?.description || '',
          city: (data.routes as any)?.city || '',
        }
      };

      // Cache the result
      await redisCache.set(cacheKey, assignment, { ttl: this.CACHE_TTL });
      
      return assignment;
    } catch (error) {
      logger.error('Error in getAssignmentByBus', 'optimized-assignment-service', { error, busId });
      throw error;
    }
  }

  /**
   * Get available drivers with optimized query
   */
  static async getAvailableDrivers(): Promise<any[]> {
    const cacheKey = `${this.CACHE_PREFIX}:available:drivers`;
    
    try {
      // Try cache first
      const cached = await redisCache.get<any[]>(cacheKey);
      if (cached) {
        logger.debug('Available drivers cache hit', 'optimized-assignment-service');
        return cached;
      }

      // Optimized query to get available drivers
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select(`
          id,
          full_name,
          first_name,
          last_name,
          email,
          phone,
          is_active
        `)
        .eq('is_driver', true)
        .eq('is_active', true)
        .not('id', 'in', `(
          SELECT assigned_driver_profile_id 
          FROM buses 
          WHERE assigned_driver_profile_id IS NOT NULL 
          AND is_active = true
        )`);

      if (error) {
        logger.error('Error fetching available drivers', 'optimized-assignment-service', { error });
        throw error;
      }

      const drivers = data || [];
      
      // Cache the result
      await redisCache.set(cacheKey, drivers, { ttl: this.CACHE_TTL });
      
      return drivers;
    } catch (error) {
      logger.error('Error in getAvailableDrivers', 'optimized-assignment-service', { error });
      throw error;
    }
  }

  /**
   * Get available buses with optimized query
   */
  static async getAvailableBuses(): Promise<any[]> {
    const cacheKey = `${this.CACHE_PREFIX}:available:buses`;
    
    try {
      // Try cache first
      const cached = await redisCache.get<any[]>(cacheKey);
      if (cached) {
        logger.debug('Available buses cache hit', 'optimized-assignment-service');
        return cached;
      }

      // Optimized query to get available buses
      const { data, error } = await supabaseAdmin
        .from('buses')
        .select(`
          id,
          bus_number,
          vehicle_no,
          capacity,
          model,
          year,
          is_active
        `)
        .eq('is_active', true)
        .is('assigned_driver_profile_id', null);

      if (error) {
        logger.error('Error fetching available buses', 'optimized-assignment-service', { error });
        throw error;
      }

      const buses = data || [];
      
      // Cache the result
      await redisCache.set(cacheKey, buses, { ttl: this.CACHE_TTL });
      
      return buses;
    } catch (error) {
      logger.error('Error in getAvailableBuses', 'optimized-assignment-service', { error });
      throw error;
    }
  }

  /**
   * Get available routes with optimized query
   */
  static async getAvailableRoutes(): Promise<any[]> {
    const cacheKey = `${this.CACHE_PREFIX}:available:routes`;
    
    try {
      // Try cache first
      const cached = await redisCache.get<any[]>(cacheKey);
      if (cached) {
        logger.debug('Available routes cache hit', 'optimized-assignment-service');
        return cached;
      }

      // Optimized query to get available routes
      const { data, error } = await supabaseAdmin
        .from('routes')
        .select(`
          id,
          name,
          description,
          city,
          is_active
        `)
        .eq('is_active', true);

      if (error) {
        logger.error('Error fetching available routes', 'optimized-assignment-service', { error });
        throw error;
      }

      const routes = data || [];
      
      // Cache the result
      await redisCache.set(cacheKey, routes, { ttl: this.CACHE_TTL });
      
      return routes;
    } catch (error) {
      logger.error('Error in getAvailableRoutes', 'optimized-assignment-service', { error });
      throw error;
    }
  }

  /**
   * Invalidate cache for assignment-related data
   */
  static async invalidateCache(): Promise<void> {
    try {
      const patterns = [
        `${this.CACHE_PREFIX}:all`,
        `${this.CACHE_PREFIX}:dashboard`,
        `${this.CACHE_PREFIX}:bus:*`,
        `${this.CACHE_PREFIX}:available:*`
      ];

      for (const pattern of patterns) {
        await redisCache.invalidateByTags([pattern]);
      }

      logger.info('Assignment cache invalidated', 'optimized-assignment-service');
    } catch (error) {
      logger.error('Error invalidating assignment cache', 'optimized-assignment-service', { error });
    }
  }

  /**
   * Get assignment statistics with optimized query
   */
  static async getAssignmentStatistics(): Promise<{
    totalAssignments: number;
    activeAssignments: number;
    driverUtilization: number;
    busUtilization: number;
    routeUtilization: number;
    averageAssignmentAge: number;
  }> {
    const cacheKey = `${this.CACHE_PREFIX}:statistics`;
    
    try {
      // Try cache first
      const cached = await redisCache.get<any>(cacheKey);
      if (cached) {
        logger.debug('Statistics cache hit', 'optimized-assignment-service');
        return cached;
      }

      // Single optimized query for statistics
      const { data, error } = await supabaseAdmin
        .rpc('get_assignment_statistics');

      if (error) {
        logger.error('Error fetching assignment statistics', 'optimized-assignment-service', { error });
        throw error;
      }

      const stats = data[0] || {};
      
      // Cache the result
      await redisCache.set(cacheKey, stats, { ttl: this.CACHE_TTL });
      
      return stats;
    } catch (error) {
      logger.error('Error in getAssignmentStatistics', 'optimized-assignment-service', { error });
      throw error;
    }
  }
}
