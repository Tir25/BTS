"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backendDriverVerificationService = exports.BackendDriverVerificationService = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const ProductionAssignmentService_1 = require("./ProductionAssignmentService");
const OptimizedLocationService_1 = require("./OptimizedLocationService");
class BackendDriverVerificationService {
    static getInstance() {
        if (!BackendDriverVerificationService.instance) {
            BackendDriverVerificationService.instance = new BackendDriverVerificationService();
        }
        return BackendDriverVerificationService.instance;
    }
    async verifyBackendDriverSystem() {
        logger_1.logger.info('🔍 Starting backend driver system verification', 'backend-verification');
        const result = {
            database: { connection: false, tablesExist: false },
            driverProfiles: { totalDrivers: 0, activeDrivers: 0, assignedDrivers: 0, unassignedDrivers: 0 },
            busAssignments: { totalBuses: 0, assignedBuses: 0, unassignedBuses: 0, assignments: [] },
            assignmentService: { getAllAssignments: false, validateAssignment: false },
            locationService: { getDriverBusInfo: false }
        };
        try {
            await this.verifyDatabase(result);
            await this.verifyDriverProfiles(result);
            await this.verifyBusAssignments(result);
            await this.verifyAssignmentService(result);
            await this.verifyLocationService(result);
            logger_1.logger.info('✅ Backend driver system verification completed', 'backend-verification', result);
        }
        catch (error) {
            logger_1.logger.error('❌ Backend verification failed', 'backend-verification', { error });
        }
        return result;
    }
    async verifyDatabase(result) {
        try {
            logger_1.logger.info('🗄️ Verifying database connection and tables...', 'backend-verification');
            const { data, error } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .select('count')
                .limit(1);
            if (error) {
                result.database.error = `Database connection failed: ${error.message}`;
                return;
            }
            result.database.connection = true;
            const requiredTables = ['user_profiles', 'buses', 'routes', 'assignment_history'];
            const tableChecks = await Promise.all(requiredTables.map(async (table) => {
                try {
                    await supabase_1.supabaseAdmin.from(table).select('*').limit(1);
                    return true;
                }
                catch {
                    return false;
                }
            }));
            result.database.tablesExist = tableChecks.every(exists => exists);
            if (!result.database.tablesExist) {
                result.database.error = 'Some required tables are missing';
            }
            logger_1.logger.info('✅ Database verification completed', 'backend-verification', {
                connection: result.database.connection,
                tablesExist: result.database.tablesExist
            });
        }
        catch (error) {
            result.database.error = `Database verification failed: ${error}`;
            logger_1.logger.error('❌ Database verification failed', 'backend-verification', { error });
        }
    }
    async verifyDriverProfiles(result) {
        try {
            logger_1.logger.info('👤 Verifying driver profiles...', 'backend-verification');
            const { data: allDrivers, error: driversError } = await supabase_1.supabaseAdmin
                .from('user_profiles')
                .select('id, role, is_active')
                .eq('role', 'driver');
            if (driversError) {
                result.driverProfiles.error = `Failed to fetch drivers: ${driversError.message}`;
                return;
            }
            result.driverProfiles.totalDrivers = allDrivers?.length || 0;
            result.driverProfiles.activeDrivers = allDrivers?.filter(d => d.is_active).length || 0;
            const { data: assignedDrivers, error: assignedError } = await supabase_1.supabaseAdmin
                .from('buses')
                .select('assigned_driver_profile_id')
                .not('assigned_driver_profile_id', 'is', null)
                .eq('is_active', true);
            if (assignedError) {
                result.driverProfiles.error = `Failed to fetch assigned drivers: ${assignedError.message}`;
                return;
            }
            result.driverProfiles.assignedDrivers = assignedDrivers?.length || 0;
            result.driverProfiles.unassignedDrivers = result.driverProfiles.activeDrivers - result.driverProfiles.assignedDrivers;
            logger_1.logger.info('✅ Driver profiles verification completed', 'backend-verification', {
                totalDrivers: result.driverProfiles.totalDrivers,
                activeDrivers: result.driverProfiles.activeDrivers,
                assignedDrivers: result.driverProfiles.assignedDrivers,
                unassignedDrivers: result.driverProfiles.unassignedDrivers
            });
        }
        catch (error) {
            result.driverProfiles.error = `Driver profiles verification failed: ${error}`;
            logger_1.logger.error('❌ Driver profiles verification failed', 'backend-verification', { error });
        }
    }
    async verifyBusAssignments(result) {
        try {
            logger_1.logger.info('🚌 Verifying bus assignments...', 'backend-verification');
            const { data: allBuses, error: busesError } = await supabase_1.supabaseAdmin
                .from('buses')
                .select('id, bus_number, assigned_driver_profile_id, route_id, is_active')
                .eq('is_active', true);
            if (busesError) {
                result.busAssignments.error = `Failed to fetch buses: ${busesError.message}`;
                return;
            }
            result.busAssignments.totalBuses = allBuses?.length || 0;
            result.busAssignments.assignedBuses = allBuses?.filter(b => b.assigned_driver_profile_id).length || 0;
            result.busAssignments.unassignedBuses = result.busAssignments.totalBuses - result.busAssignments.assignedBuses;
            const { data: assignments, error: assignmentsError } = await supabase_1.supabaseAdmin
                .from('buses')
                .select(`
          id,
          bus_number,
          assigned_driver_profile_id,
          route_id,
          user_profiles!buses_assigned_driver_profile_id_fkey(full_name),
          routes(name)
        `)
                .eq('is_active', true)
                .not('assigned_driver_profile_id', 'is', null);
            if (assignmentsError) {
                result.busAssignments.error = `Failed to fetch assignment details: ${assignmentsError.message}`;
                return;
            }
            result.busAssignments.assignments = assignments?.map(assignment => ({
                bus_id: assignment.id,
                bus_number: assignment.bus_number,
                driver_id: assignment.assigned_driver_profile_id,
                driver_name: assignment.user_profiles?.[0]?.full_name || 'Unknown Driver',
                route_id: assignment.route_id || '',
                route_name: assignment.routes?.[0]?.name || 'No Route'
            })) || [];
            logger_1.logger.info('✅ Bus assignments verification completed', 'backend-verification', {
                totalBuses: result.busAssignments.totalBuses,
                assignedBuses: result.busAssignments.assignedBuses,
                unassignedBuses: result.busAssignments.unassignedBuses,
                assignmentCount: result.busAssignments.assignments.length
            });
        }
        catch (error) {
            result.busAssignments.error = `Bus assignments verification failed: ${error}`;
            logger_1.logger.error('❌ Bus assignments verification failed', 'backend-verification', { error });
        }
    }
    async verifyAssignmentService(result) {
        try {
            logger_1.logger.info('⚙️ Verifying assignment service...', 'backend-verification');
            try {
                const assignments = await ProductionAssignmentService_1.ProductionAssignmentService.getAllAssignments();
                result.assignmentService.getAllAssignments = Array.isArray(assignments);
                logger_1.logger.info(`✅ getAllAssignments returned ${assignments.length} assignments`, 'backend-verification');
            }
            catch (error) {
                result.assignmentService.error = `getAllAssignments failed: ${error}`;
                logger_1.logger.error('❌ getAllAssignments test failed', 'backend-verification', { error });
            }
            if (result.busAssignments.assignments.length > 0) {
                try {
                    const firstAssignment = result.busAssignments.assignments[0];
                    const validation = await ProductionAssignmentService_1.ProductionAssignmentService.validateAssignment(firstAssignment.driver_id, firstAssignment.bus_id, firstAssignment.route_id);
                    result.assignmentService.validateAssignment = validation.is_valid;
                    logger_1.logger.info('✅ validateAssignment test passed', 'backend-verification', { validation });
                }
                catch (error) {
                    result.assignmentService.error = `validateAssignment failed: ${error}`;
                    logger_1.logger.error('❌ validateAssignment test failed', 'backend-verification', { error });
                }
            }
        }
        catch (error) {
            result.assignmentService.error = `Assignment service verification failed: ${error}`;
            logger_1.logger.error('❌ Assignment service verification failed', 'backend-verification', { error });
        }
    }
    async verifyLocationService(result) {
        try {
            logger_1.logger.info('📍 Verifying location service...', 'backend-verification');
            if (result.busAssignments.assignments.length > 0) {
                try {
                    const firstAssignment = result.busAssignments.assignments[0];
                    const busInfo = await OptimizedLocationService_1.optimizedLocationService.getDriverBusInfo(firstAssignment.driver_id);
                    result.locationService.getDriverBusInfo = !!busInfo;
                    logger_1.logger.info('✅ getDriverBusInfo test passed', 'backend-verification', { busInfo });
                }
                catch (error) {
                    result.locationService.error = `getDriverBusInfo failed: ${error}`;
                    logger_1.logger.error('❌ getDriverBusInfo test failed', 'backend-verification', { error });
                }
            }
        }
        catch (error) {
            result.locationService.error = `Location service verification failed: ${error}`;
            logger_1.logger.error('❌ Location service verification failed', 'backend-verification', { error });
        }
    }
    getVerificationSummary(result) {
        const checks = [
            { name: 'Database Connection', success: result.database.connection },
            { name: 'Database Tables', success: result.database.tablesExist },
            { name: 'Driver Profiles', success: !result.driverProfiles.error },
            { name: 'Bus Assignments', success: !result.busAssignments.error },
            { name: 'Assignment Service', success: result.assignmentService.getAllAssignments },
            { name: 'Location Service', success: result.locationService.getDriverBusInfo },
        ];
        const passed = checks.filter(check => check.success).length;
        const total = checks.length;
        return `Backend Verification: ${passed}/${total} checks passed`;
    }
    isBackendReady(result) {
        return (result.database.connection &&
            result.database.tablesExist &&
            !result.driverProfiles.error &&
            !result.busAssignments.error &&
            result.assignmentService.getAllAssignments &&
            result.locationService.getDriverBusInfo);
    }
}
exports.BackendDriverVerificationService = BackendDriverVerificationService;
exports.backendDriverVerificationService = BackendDriverVerificationService.getInstance();
exports.default = exports.backendDriverVerificationService;
//# sourceMappingURL=BackendDriverVerificationService.js.map