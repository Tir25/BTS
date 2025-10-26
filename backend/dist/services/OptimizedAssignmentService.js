"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedAssignmentService = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const RedisCacheService_1 = require("./RedisCacheService");
class OptimizedAssignmentService {
    static async getAllAssignments() {
        const cacheKey = `${this.CACHE_PREFIX}:all`;
        try {
            const cached = await RedisCacheService_1.redisCache.get(cacheKey);
            if (cached) {
                logger_1.logger.debug('Assignments cache hit', 'optimized-assignment-service');
                return cached;
            }
            const { data, error } = await supabase_1.supabaseAdmin
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
                logger_1.logger.error('Error fetching optimized assignments', 'optimized-assignment-service', { error });
                throw error;
            }
            const assignments = (data || []).map(bus => ({
                id: bus.id,
                driver_id: bus.assigned_driver_profile_id,
                bus_id: bus.id,
                route_id: bus.route_id,
                assigned_by: 'system',
                notes: bus.assignment_notes,
                assigned_at: bus.updated_at,
                status: bus.assignment_status || 'active',
                driver: {
                    id: bus.user_profiles?.id || '',
                    full_name: bus.user_profiles?.full_name || 'Unknown',
                    first_name: bus.user_profiles?.first_name || '',
                    last_name: bus.user_profiles?.last_name || '',
                    email: bus.user_profiles?.email || '',
                    phone: bus.user_profiles?.phone || '',
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
                    id: bus.routes?.id || '',
                    name: bus.routes?.name || 'Unknown',
                    description: bus.routes?.description || '',
                    city: bus.routes?.city || '',
                }
            }));
            await RedisCacheService_1.redisCache.set(cacheKey, assignments, { ttl: this.CACHE_TTL });
            logger_1.logger.info(`Fetched ${assignments.length} optimized assignments`, 'optimized-assignment-service');
            return assignments;
        }
        catch (error) {
            logger_1.logger.error('Error in getAllAssignments', 'optimized-assignment-service', { error });
            throw error;
        }
    }
    static async getAssignmentDashboard() {
        const cacheKey = `${this.CACHE_PREFIX}:dashboard`;
        try {
            const cached = await RedisCacheService_1.redisCache.get(cacheKey);
            if (cached) {
                logger_1.logger.debug('Dashboard cache hit', 'optimized-assignment-service');
                return cached;
            }
            const { data, error } = await supabase_1.supabaseAdmin
                .rpc('get_assignment_dashboard_data');
            if (error) {
                logger_1.logger.error('Error fetching dashboard data', 'optimized-assignment-service', { error });
                throw error;
            }
            const dashboardData = data[0] || {};
            const recentAssignments = await this.getAllAssignments();
            const dashboard = {
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
            await RedisCacheService_1.redisCache.set(cacheKey, dashboard, { ttl: this.CACHE_TTL });
            logger_1.logger.info('Fetched optimized dashboard', 'optimized-assignment-service', dashboard);
            return dashboard;
        }
        catch (error) {
            logger_1.logger.error('Error in getAssignmentDashboard', 'optimized-assignment-service', { error });
            throw error;
        }
    }
    static async getAssignmentByBus(busId) {
        const cacheKey = `${this.CACHE_PREFIX}:bus:${busId}`;
        try {
            const cached = await RedisCacheService_1.redisCache.get(cacheKey);
            if (cached) {
                logger_1.logger.debug('Assignment cache hit', 'optimized-assignment-service', { busId });
                return cached;
            }
            const { data, error } = await supabase_1.supabaseAdmin
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
                logger_1.logger.error('Error fetching assignment by bus', 'optimized-assignment-service', { error, busId });
                throw error;
            }
            if (!data || !data.assigned_driver_profile_id || !data.route_id) {
                return null;
            }
            const assignment = {
                id: data.id,
                driver_id: data.assigned_driver_profile_id,
                bus_id: data.id,
                route_id: data.route_id,
                assigned_by: 'system',
                notes: data.assignment_notes,
                assigned_at: data.updated_at,
                status: data.assignment_status || 'active',
                driver: {
                    id: data.user_profiles?.id || '',
                    full_name: data.user_profiles?.full_name || 'Unknown',
                    first_name: data.user_profiles?.first_name || '',
                    last_name: data.user_profiles?.last_name || '',
                    email: data.user_profiles?.email || '',
                    phone: data.user_profiles?.phone || '',
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
                    id: data.routes?.id || '',
                    name: data.routes?.name || 'Unknown',
                    description: data.routes?.description || '',
                    city: data.routes?.city || '',
                }
            };
            await RedisCacheService_1.redisCache.set(cacheKey, assignment, { ttl: this.CACHE_TTL });
            return assignment;
        }
        catch (error) {
            logger_1.logger.error('Error in getAssignmentByBus', 'optimized-assignment-service', { error, busId });
            throw error;
        }
    }
    static async getAvailableDrivers() {
        const cacheKey = `${this.CACHE_PREFIX}:available:drivers`;
        try {
            const cached = await RedisCacheService_1.redisCache.get(cacheKey);
            if (cached) {
                logger_1.logger.debug('Available drivers cache hit', 'optimized-assignment-service');
                return cached;
            }
            const { data, error } = await supabase_1.supabaseAdmin
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
                logger_1.logger.error('Error fetching available drivers', 'optimized-assignment-service', { error });
                throw error;
            }
            const drivers = data || [];
            await RedisCacheService_1.redisCache.set(cacheKey, drivers, { ttl: this.CACHE_TTL });
            return drivers;
        }
        catch (error) {
            logger_1.logger.error('Error in getAvailableDrivers', 'optimized-assignment-service', { error });
            throw error;
        }
    }
    static async getAvailableBuses() {
        const cacheKey = `${this.CACHE_PREFIX}:available:buses`;
        try {
            const cached = await RedisCacheService_1.redisCache.get(cacheKey);
            if (cached) {
                logger_1.logger.debug('Available buses cache hit', 'optimized-assignment-service');
                return cached;
            }
            const { data, error } = await supabase_1.supabaseAdmin
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
                logger_1.logger.error('Error fetching available buses', 'optimized-assignment-service', { error });
                throw error;
            }
            const buses = data || [];
            await RedisCacheService_1.redisCache.set(cacheKey, buses, { ttl: this.CACHE_TTL });
            return buses;
        }
        catch (error) {
            logger_1.logger.error('Error in getAvailableBuses', 'optimized-assignment-service', { error });
            throw error;
        }
    }
    static async getAvailableRoutes() {
        const cacheKey = `${this.CACHE_PREFIX}:available:routes`;
        try {
            const cached = await RedisCacheService_1.redisCache.get(cacheKey);
            if (cached) {
                logger_1.logger.debug('Available routes cache hit', 'optimized-assignment-service');
                return cached;
            }
            const { data, error } = await supabase_1.supabaseAdmin
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
                logger_1.logger.error('Error fetching available routes', 'optimized-assignment-service', { error });
                throw error;
            }
            const routes = data || [];
            await RedisCacheService_1.redisCache.set(cacheKey, routes, { ttl: this.CACHE_TTL });
            return routes;
        }
        catch (error) {
            logger_1.logger.error('Error in getAvailableRoutes', 'optimized-assignment-service', { error });
            throw error;
        }
    }
    static async invalidateCache() {
        try {
            const patterns = [
                `${this.CACHE_PREFIX}:all`,
                `${this.CACHE_PREFIX}:dashboard`,
                `${this.CACHE_PREFIX}:bus:*`,
                `${this.CACHE_PREFIX}:available:*`
            ];
            for (const pattern of patterns) {
                await RedisCacheService_1.redisCache.invalidateByTags([pattern]);
            }
            logger_1.logger.info('Assignment cache invalidated', 'optimized-assignment-service');
        }
        catch (error) {
            logger_1.logger.error('Error invalidating assignment cache', 'optimized-assignment-service', { error });
        }
    }
    static async getAssignmentStatistics() {
        const cacheKey = `${this.CACHE_PREFIX}:statistics`;
        try {
            const cached = await RedisCacheService_1.redisCache.get(cacheKey);
            if (cached) {
                logger_1.logger.debug('Statistics cache hit', 'optimized-assignment-service');
                return cached;
            }
            const { data, error } = await supabase_1.supabaseAdmin
                .rpc('get_assignment_statistics');
            if (error) {
                logger_1.logger.error('Error fetching assignment statistics', 'optimized-assignment-service', { error });
                throw error;
            }
            const stats = data[0] || {};
            await RedisCacheService_1.redisCache.set(cacheKey, stats, { ttl: this.CACHE_TTL });
            return stats;
        }
        catch (error) {
            logger_1.logger.error('Error in getAssignmentStatistics', 'optimized-assignment-service', { error });
            throw error;
        }
    }
}
exports.OptimizedAssignmentService = OptimizedAssignmentService;
OptimizedAssignmentService.CACHE_TTL = 300;
OptimizedAssignmentService.CACHE_PREFIX = 'assignments';
//# sourceMappingURL=OptimizedAssignmentService.js.map