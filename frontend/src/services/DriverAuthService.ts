import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { DriverBusAssignment } from './authService';
import { timeoutConfig, withTimeout, retryWithBackoff } from '../config/timeoutConfig';

export interface DriverAuthResult {
  success: boolean;
  error?: string;
  driverId?: string;
  driverEmail?: string;
  driverName?: string;
  busAssignment?: DriverBusAssignment;
}

/**
 * Centralized Driver Authentication Service
 * Handles all driver-specific authentication logic with proper error handling
 */
export class DriverAuthService {
  private static instance: DriverAuthService;
  private currentDriverId: string | null = null;
  private currentBusAssignment: DriverBusAssignment | null = null;

  private constructor() {}

  public static getInstance(): DriverAuthService {
    if (!DriverAuthService.instance) {
      DriverAuthService.instance = new DriverAuthService();
    }
    return DriverAuthService.instance;
  }

  /**
   * Authenticate driver with email and password with timeout protection and progress tracking
   */
  async authenticateDriver(email: string, password: string, onProgress?: (step: string, progress: number) => void): Promise<DriverAuthResult> {
    try {
      logger.info('🔐 Starting driver authentication...', 'driver-auth-service', { email });

      // Use centralized timeout configuration
      const result = await withTimeout(
        this.performAuthentication(email, password, onProgress),
        timeoutConfig.auth.signIn,
        `Authentication timeout after ${timeoutConfig.auth.signIn / 1000}s`
      );
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
      logger.error('❌ Driver authentication error', 'driver-auth-service', { error: errorMessage });
      
      // Handle timeout specifically
      if (errorMessage.includes('timeout')) {
        return { 
          success: false, 
          error: 'Authentication is taking longer than expected. Please check your connection and try again.' 
        };
      }
      
      return { 
        success: false, 
        error: 'Authentication failed. Please try again.' 
      };
    }
  }

  /**
   * Internal authentication method with progress tracking
   */
  private async performAuthentication(email: string, password: string, onProgress?: (step: string, progress: number) => void): Promise<DriverAuthResult> {
    try {
      // Step 1: Authenticate with Supabase
      onProgress?.('Authenticating with server...', 20);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        logger.error('❌ Supabase authentication failed', 'driver-auth-service', { 
          error: authError.message,
          email 
        });
        return { 
          success: false, 
          error: this.formatAuthError(authError.message) 
        };
      }

      if (!authData.user) {
        logger.error('❌ No user data received from Supabase', 'driver-auth-service');
        return { 
          success: false, 
          error: 'Authentication failed. Please check your credentials.' 
        };
      }

      logger.info('✅ Supabase authentication successful', 'driver-auth-service', {
        userId: authData.user.id,
        email: authData.user.email
      });

      // Step 2: Validate driver role and get bus assignment with progress tracking
      onProgress?.('Validating driver credentials...', 60);
      logger.info('📋 Validating driver role and assignment...', 'driver-auth-service', { userId: authData.user.id });
      const validationResult = await this.validateDriverRoleAndAssignment(authData.user.id);
      
      if (!validationResult.success) {
        logger.warn('❌ Driver validation failed, signing out', 'driver-auth-service', { 
          userId: authData.user.id,
          error: validationResult.error 
        });
        // Sign out from Supabase if validation fails
        await supabase.auth.signOut();
        return validationResult;
      }

      // Step 3: Store driver data
      onProgress?.('Finalizing authentication...', 90);
      this.currentDriverId = authData.user.id;
      this.currentBusAssignment = validationResult.busAssignment!;

      onProgress?.('Authentication complete!', 100);
      logger.info('✅ Driver authentication completed successfully', 'driver-auth-service', {
        driverId: authData.user.id,
        driverEmail: authData.user.email,
        busNumber: validationResult.busAssignment?.bus_number
      });

      return {
        success: true,
        driverId: authData.user.id,
        driverEmail: authData.user.email,
        driverName: validationResult.busAssignment?.driver_name,
        busAssignment: validationResult.busAssignment
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
      logger.error('❌ Driver authentication error', 'driver-auth-service', { error: errorMessage });
      return { 
        success: false, 
        error: 'Authentication failed. Please try again.' 
      };
    }
  }

  /**
   * Validate that user has driver role and active bus assignment
   */
  private async validateDriverRoleAndAssignment(userId: string): Promise<DriverAuthResult> {
    try {
      logger.info('🔍 Validating driver role and assignment...', 'driver-auth-service', { userId });

      // Get user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, is_active')
        .eq('id', userId)
        .single();

      if (profileError) {
        logger.error('❌ Failed to fetch user profile', 'driver-auth-service', { 
          error: profileError.message,
          userId 
        });
        return { 
          success: false, 
          error: 'Unable to verify your account. Please contact your administrator.' 
        };
      }

      if (!profile) {
        logger.error('❌ User profile not found', 'driver-auth-service', { userId });
        return { 
          success: false, 
          error: 'Account not found. Please contact your administrator.' 
        };
      }

      // Check if account is active
      if (!profile.is_active) {
        logger.warn('❌ Inactive account attempted login', 'driver-auth-service', { userId });
        return { 
          success: false, 
          error: 'Your account is inactive. Please contact your administrator.' 
        };
      }

      // Check if user is a driver
      if (profile.role !== 'driver') {
        logger.warn('❌ Non-driver attempted driver login', 'driver-auth-service', { 
          userId,
          role: profile.role 
        });
        return { 
          success: false, 
          error: 'You do not have driver privileges. Please contact your administrator.' 
        };
      }

      // Get bus assignment with retry logic
      const busAssignment = await retryWithBackoff(
        () => this.getDriverBusAssignment(userId),
        timeoutConfig.retry.maxAttempts,
        'Bus assignment fetch'
      );
      
      if (!busAssignment) {
        logger.warn('❌ No bus assignment found for driver', 'driver-auth-service', { userId });
        return { 
          success: false, 
          error: 'No bus assignment found. Please contact your administrator to get assigned to a bus.' 
        };
      }

      logger.info('✅ Driver role and assignment validated', 'driver-auth-service', {
        userId,
        driverName: profile.full_name,
        busNumber: busAssignment.bus_number
      });

      return {
        success: true,
        driverId: userId,
        driverEmail: '', // Will be set from auth data
        driverName: profile.full_name,
        busAssignment
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      logger.error('❌ Driver validation error', 'driver-auth-service', { error: errorMessage });
      return { 
        success: false, 
        error: 'Unable to verify your driver status. Please try again.' 
      };
    }
  }

  /**
   * Get driver's bus assignment from database with simplified query and better error handling
   * FIXED: Simplified query to prevent timeouts and hangs
   * ENHANCED: Uses centralized timeout configuration
   */
  private async getDriverBusAssignment(driverId: string): Promise<DriverBusAssignment | null> {
    try {
      logger.debug('🔍 Fetching driver bus assignment...', 'driver-auth-service', { driverId });

      // SIMPLIFIED QUERY: Get bus assignment first without joins
      const busQueryPromise = supabase
        .from('buses')
        .select('id, assigned_driver_profile_id, bus_number, route_id, created_at, updated_at')
        .eq('assigned_driver_profile_id', driverId)
        .eq('is_active', true)
        .single();

      // Use centralized timeout configuration
      const { data: busData, error: busError } = await withTimeout(
        busQueryPromise,
        timeoutConfig.api.busAssignment,
        `Bus assignment query timeout after ${timeoutConfig.api.busAssignment / 1000}s`
      );

      if (busError) {
        if (busError.code === 'PGRST116') {
          // No rows returned
          logger.debug('ℹ️ No active bus assignment found', 'driver-auth-service', { driverId });
          return null;
        }
        
        logger.error('❌ Error fetching bus assignment', 'driver-auth-service', { 
          error: busError.message,
          driverId
        });
        return null;
      }

      if (!busData) {
        logger.debug('ℹ️ No bus assignment data returned', 'driver-auth-service', { driverId });
        return null;
      }

      // Get route name separately (simpler query)
      let routeName = 'Unknown Route';
      if (busData.route_id) {
        try {
          const { data: routeData } = await supabase
            .from('routes')
            .select('name')
            .eq('id', busData.route_id)
            .single();
          routeName = routeData?.name || 'Unknown Route';
        } catch (routeError) {
          logger.warn('⚠️ Could not fetch route name', 'driver-auth-service', { 
            routeId: busData.route_id,
            error: routeError
          });
        }
      }

      // Get driver name separately (simpler query)
      let driverName = 'Unknown Driver';
      try {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', driverId)
          .single();
        driverName = profileData?.full_name || 'Unknown Driver';
      } catch (profileError) {
        logger.warn('⚠️ Could not fetch driver name', 'driver-auth-service', { 
          driverId,
          error: profileError
        });
      }

      logger.debug('✅ Bus assignment found', 'driver-auth-service', {
        driverId,
        busNumber: busData.bus_number,
        routeName,
        driverName
      });

      return {
        driver_id: busData.assigned_driver_profile_id,
        bus_id: busData.id,
        bus_number: busData.bus_number,
        route_id: busData.route_id,
        route_name: routeName,
        driver_name: driverName,
        created_at: busData.created_at,
        updated_at: busData.updated_at
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Error in getDriverBusAssignment', 'driver-auth-service', { 
        error: errorMessage,
        driverId
      });
      return null;
    }
  }

  /**
   * Get current driver data
   */
  getCurrentDriver(): { driverId: string | null; busAssignment: DriverBusAssignment | null } {
    return {
      driverId: this.currentDriverId,
      busAssignment: this.currentBusAssignment
    };
  }

  /**
   * Clear driver data
   */
  clearDriverData(): void {
    this.currentDriverId = null;
    this.currentBusAssignment = null;
    logger.info('🧹 Driver data cleared', 'driver-auth-service');
  }

  /**
   * Check if driver is currently authenticated
   */
  isDriverAuthenticated(): boolean {
    return this.currentDriverId !== null && this.currentBusAssignment !== null;
  }

  /**
   * Format authentication error messages for user display
   */
  private formatAuthError(errorMessage: string): string {
    const errorMap: { [key: string]: string } = {
      'Invalid login credentials': 'Invalid email or password. Please check your credentials.',
      'Email not confirmed': 'Please verify your email address before logging in.',
      'Too many requests': 'Too many login attempts. Please wait a moment and try again.',
      'User not found': 'No account found with this email address.',
      'Invalid email': 'Please enter a valid email address.',
    };

    return errorMap[errorMessage] || 'Login failed. Please check your credentials and try again.';
  }

  /**
   * Validate current session
   */
  async validateCurrentSession(): Promise<DriverAuthResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        this.clearDriverData();
        return { success: false, error: 'No active session. Please log in again.' };
      }

      // Check if we have cached driver data
      if (this.currentDriverId && this.currentBusAssignment) {
        return {
          success: true,
          driverId: this.currentDriverId,
          driverEmail: session.user.email,
          driverName: this.currentBusAssignment.driver_name,
          busAssignment: this.currentBusAssignment
        };
      }

      // Re-validate if no cached data
      return await this.validateDriverRoleAndAssignment(session.user.id);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Session validation failed';
      logger.error('❌ Session validation error', 'driver-auth-service', { error: errorMessage });
      return { success: false, error: 'Session validation failed. Please log in again.' };
    }
  }
}

export const driverAuthService = DriverAuthService.getInstance();
export default driverAuthService;
