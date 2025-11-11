/**
 * Backend Driver Assignment Verification Script
 * Comprehensive testing of backend driver authentication and assignment system
 */

import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { ProductionAssignmentService } from './ProductionAssignmentService';
import { optimizedLocationService } from './OptimizedLocationService';

export interface BackendDriverVerificationResult {
  database: {
    connection: boolean;
    tablesExist: boolean;
    error?: string;
  };
  driverProfiles: {
    totalDrivers: number;
    activeDrivers: number;
    assignedDrivers: number;
    unassignedDrivers: number;
    error?: string;
  };
  busAssignments: {
    totalBuses: number;
    assignedBuses: number;
    unassignedBuses: number;
    assignments: Array<{
      bus_id: string;
      bus_number: string;
      driver_id: string;
      driver_name: string;
      route_id: string;
      route_name: string;
    }>;
    error?: string;
  };
  assignmentService: {
    getAllAssignments: boolean;
    validateAssignment: boolean;
    error?: string;
  };
  locationService: {
    getDriverBusInfo: boolean;
    error?: string;
  };
}

export class BackendDriverVerificationService {
  private static instance: BackendDriverVerificationService;
  
  public static getInstance(): BackendDriverVerificationService {
    if (!BackendDriverVerificationService.instance) {
      BackendDriverVerificationService.instance = new BackendDriverVerificationService();
    }
    return BackendDriverVerificationService.instance;
  }

  /**
   * Comprehensive backend driver verification
   */
  async verifyBackendDriverSystem(): Promise<BackendDriverVerificationResult> {
    logger.info('🔍 Starting backend driver system verification', 'backend-verification');
    
    const result: BackendDriverVerificationResult = {
      database: { connection: false, tablesExist: false },
      driverProfiles: { totalDrivers: 0, activeDrivers: 0, assignedDrivers: 0, unassignedDrivers: 0 },
      busAssignments: { totalBuses: 0, assignedBuses: 0, unassignedBuses: 0, assignments: [] },
      assignmentService: { getAllAssignments: false, validateAssignment: false },
      locationService: { getDriverBusInfo: false }
    };

    try {
      // 1. Verify Database Connection and Tables
      await this.verifyDatabase(result);
      
      // 2. Verify Driver Profiles
      await this.verifyDriverProfiles(result);
      
      // 3. Verify Bus Assignments
      await this.verifyBusAssignments(result);
      
      // 4. Verify Assignment Service
      await this.verifyAssignmentService(result);
      
      // 5. Verify Location Service
      await this.verifyLocationService(result);
      
      logger.info('✅ Backend driver system verification completed', 'backend-verification', result);
      
    } catch (error) {
      logger.error('❌ Backend verification failed', 'backend-verification', { error });
    }

    return result;
  }

  /**
   * Verify database connection and required tables
   */
  private async verifyDatabase(result: BackendDriverVerificationResult): Promise<void> {
    try {
      logger.info('🗄️ Verifying database connection and tables...', 'backend-verification');
      
      // Test database connection
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        result.database.error = `Database connection failed: ${error.message}`;
        return;
      }
      
      result.database.connection = true;
      
      // Check required tables exist
      const requiredTables = ['user_profiles', 'buses', 'routes', 'assignment_history'];
      const tableChecks = await Promise.all(
        requiredTables.map(async (table) => {
          try {
            await supabaseAdmin.from(table).select('*').limit(1);
            return true;
          } catch {
            return false;
          }
        })
      );
      
      result.database.tablesExist = tableChecks.every(exists => exists);
      
      if (!result.database.tablesExist) {
        result.database.error = 'Some required tables are missing';
      }
      
      logger.info('✅ Database verification completed', 'backend-verification', {
        connection: result.database.connection,
        tablesExist: result.database.tablesExist
      });
      
    } catch (error) {
      result.database.error = `Database verification failed: ${error}`;
      logger.error('❌ Database verification failed', 'backend-verification', { error });
    }
  }

  /**
   * Verify driver profiles
   */
  private async verifyDriverProfiles(result: BackendDriverVerificationResult): Promise<void> {
    try {
      logger.info('👤 Verifying driver profiles...', 'backend-verification');
      
      // Get all drivers
      const { data: allDrivers, error: driversError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, role, is_active')
        .eq('role', 'driver');
      
      if (driversError) {
        result.driverProfiles.error = `Failed to fetch drivers: ${driversError.message}`;
        return;
      }
      
      result.driverProfiles.totalDrivers = allDrivers?.length || 0;
      result.driverProfiles.activeDrivers = allDrivers?.filter(d => d.is_active).length || 0;
      
      // Get assigned drivers
      const { data: assignedDrivers, error: assignedError } = await supabaseAdmin
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
      
      logger.info('✅ Driver profiles verification completed', 'backend-verification', {
        totalDrivers: result.driverProfiles.totalDrivers,
        activeDrivers: result.driverProfiles.activeDrivers,
        assignedDrivers: result.driverProfiles.assignedDrivers,
        unassignedDrivers: result.driverProfiles.unassignedDrivers
      });
      
    } catch (error) {
      result.driverProfiles.error = `Driver profiles verification failed: ${error}`;
      logger.error('❌ Driver profiles verification failed', 'backend-verification', { error });
    }
  }

  /**
   * Verify bus assignments
   */
  private async verifyBusAssignments(result: BackendDriverVerificationResult): Promise<void> {
    try {
      logger.info('🚌 Verifying bus assignments...', 'backend-verification');
      
      // Get all buses
      const { data: allBuses, error: busesError } = await supabaseAdmin
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
      
      // Get detailed assignment information
      const { data: assignments, error: assignmentsError } = await supabaseAdmin
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
      
      logger.info('✅ Bus assignments verification completed', 'backend-verification', {
        totalBuses: result.busAssignments.totalBuses,
        assignedBuses: result.busAssignments.assignedBuses,
        unassignedBuses: result.busAssignments.unassignedBuses,
        assignmentCount: result.busAssignments.assignments.length
      });
      
    } catch (error) {
      result.busAssignments.error = `Bus assignments verification failed: ${error}`;
      logger.error('❌ Bus assignments verification failed', 'backend-verification', { error });
    }
  }

  /**
   * Verify assignment service functionality
   */
  private async verifyAssignmentService(result: BackendDriverVerificationResult): Promise<void> {
    try {
      logger.info('⚙️ Verifying assignment service...', 'backend-verification');
      
      // Test getAllAssignments
      try {
        const assignments = await ProductionAssignmentService.getAllAssignments();
        result.assignmentService.getAllAssignments = Array.isArray(assignments);
        logger.info(`✅ getAllAssignments returned ${assignments.length} assignments`, 'backend-verification');
      } catch (error) {
        result.assignmentService.error = `getAllAssignments failed: ${error}`;
        logger.error('❌ getAllAssignments test failed', 'backend-verification', { error });
      }
      
      // Test validateAssignment if we have assignments
      if (result.busAssignments.assignments.length > 0) {
        try {
          const firstAssignment = result.busAssignments.assignments[0];
          const validation = await ProductionAssignmentService.validateAssignment(
            firstAssignment.driver_id,
            firstAssignment.bus_id,
            firstAssignment.route_id
          );
          result.assignmentService.validateAssignment = validation.is_valid;
          logger.info('✅ validateAssignment test passed', 'backend-verification', { validation });
        } catch (error) {
          result.assignmentService.error = `validateAssignment failed: ${error}`;
          logger.error('❌ validateAssignment test failed', 'backend-verification', { error });
        }
      }
      
    } catch (error) {
      result.assignmentService.error = `Assignment service verification failed: ${error}`;
      logger.error('❌ Assignment service verification failed', 'backend-verification', { error });
    }
  }

  /**
   * Verify location service functionality
   */
  private async verifyLocationService(result: BackendDriverVerificationResult): Promise<void> {
    try {
      logger.info('📍 Verifying location service...', 'backend-verification');
      
      // Test getDriverBusInfo if we have assigned drivers
      if (result.busAssignments.assignments.length > 0) {
        try {
          const firstAssignment = result.busAssignments.assignments[0];
          const busInfo = await optimizedLocationService.getDriverBusInfo(firstAssignment.driver_id);
          result.locationService.getDriverBusInfo = !!busInfo;
          logger.info('✅ getDriverBusInfo test passed', 'backend-verification', { busInfo });
        } catch (error) {
          result.locationService.error = `getDriverBusInfo failed: ${error}`;
          logger.error('❌ getDriverBusInfo test failed', 'backend-verification', { error });
        }
      }
      
    } catch (error) {
      result.locationService.error = `Location service verification failed: ${error}`;
      logger.error('❌ Location service verification failed', 'backend-verification', { error });
    }
  }

  /**
   * Get verification summary
   */
  getVerificationSummary(result: BackendDriverVerificationResult): string {
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

  /**
   * Check if backend is ready for driver operations
   */
  isBackendReady(result: BackendDriverVerificationResult): boolean {
    return (
      result.database.connection &&
      result.database.tablesExist &&
      !result.driverProfiles.error &&
      !result.busAssignments.error &&
      result.assignmentService.getAllAssignments &&
      result.locationService.getDriverBusInfo
    );
  }
}

// Export singleton instance
export const backendDriverVerificationService = BackendDriverVerificationService.getInstance();
export default backendDriverVerificationService;
