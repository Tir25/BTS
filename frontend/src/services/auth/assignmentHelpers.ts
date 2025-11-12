import { logger } from '../../utils/logger';
import { supabase } from '../../config/supabase';
import { timeoutConfig } from '../../config/timeoutConfig';
import { resilientQuery } from '../resilience/ResilientSupabaseService';
import { standardBackoff } from '../resilience/ExponentialBackoff';
import { sessionHelpers } from './sessionHelpers';
import type { DriverBusAssignment } from '../../types/driver';
export type { DriverBusAssignment };

/**
 * Assignment helpers
 * Handles driver bus assignment fetching with retry logic and fallbacks
 */
export class AssignmentHelpers {
  /**
   * Check if error is retriable
   */
  private isRetriableError(error: any): boolean {
    if (!error) return false;
    
    // Network errors are retriable
    if (error.message?.includes('NetworkError') || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('timeout')) {
      return true;
    }
    
    // 5xx server errors are retriable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // 408 Request Timeout is retriable
    if (error.status === 408) {
      return true;
    }
    
    // 429 Too Many Requests is retriable
    if (error.status === 429) {
      return true;
    }
    
    return false;
  }

  /**
   * Fetch assignment from API
   */
  private async fetchAssignmentFromAPI(
    driverId: string,
    currentSession: any
  ): Promise<DriverBusAssignment | null> {
    logger.info('🔍 Fetching driver bus assignment via API', 'auth', { driverId });
    
    // Get access token for authenticated request
    const tokenResult = await sessionHelpers.validateTokenForAPI(currentSession);
    if (!tokenResult.valid || !tokenResult.token) {
      logger.warn('❌ No valid token for API request', 'auth');
      return null;
    }

    // Use backend API with authentication
    // PRODUCTION FIX: Normalize URL to prevent double-slash issues
    const rawApiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '');
    const response = await fetch(
      `${apiBaseUrl}/production-assignments/my-assignment`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenResult.token}`,
        },
      }
    );

    if (!response.ok) {
      const errorInfo = {
        status: response.status,
        statusText: response.statusText,
        message: `HTTP ${response.status}: ${response.statusText}`
      };
      
      // Check if error is retriable
      if (this.isRetriableError(errorInfo)) {
        logger.warn('⚠️ Retriable error fetching bus assignment', 'auth', errorInfo);
        const retriableError: any = new Error(`Retriable error: ${response.status} ${response.statusText}`);
        retriableError.status = response.status;
        throw retriableError;
      }
      
      logger.error('❌ Non-retriable error fetching bus assignment from API', 'auth', errorInfo);
      return null;
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      logger.info('✅ Bus assignment retrieved from API', 'auth', {
        bus_number: result.data.bus_number,
        route_name: result.data.route_name
      });
      return result.data;
    } else {
      logger.warn('⚠️ No bus assignment found', 'auth', { driverId });
      return null;
    }
  }

  /**
   * Fetch assignment from Supabase (fallback)
   */
  private async fetchAssignmentFromSupabase(
    driverId: string
  ): Promise<DriverBusAssignment | null> {
    logger.info('🔄 Falling back to direct Supabase query', 'auth');
    
    // Use resilient query with retry logic
    const busResult = await resilientQuery<{
      id: string;
      bus_number: string;
      route_id: string | null;
      assigned_shift_id?: string | null;
    }>(
      async () => {
        const queryResult = await supabase
          .from('buses')
          .select('id, bus_number, route_id, assigned_shift_id')
          .eq('assigned_driver_profile_id', driverId)
          .eq('is_active', true)
          .single();
        return queryResult;
      },
      {
        timeout: timeoutConfig.api.shortRunning,
        retryOnFailure: true,
        maxRetries: 2,
      }
    );

    if (busResult.error || !busResult.data) {
      logger.error('❌ Fallback Supabase query failed', 'auth', {
        error: busResult.error?.message || 'No bus data returned',
        retries: busResult.retries || 0,
      });
      return null;
    }

    const busData = busResult.data;
    let shiftName: string | null = null;
    let shiftStartTime: string | null = null;
    let shiftEndTime: string | null = null;

    if (busData.assigned_shift_id) {
      const shiftResult = await resilientQuery<{
        name: string | null;
        start_time: string | null;
        end_time: string | null;
      } | null>(
        async () => {
          const queryResult = await supabase
            .from('shifts')
            .select('name,start_time,end_time')
            .eq('id', busData.assigned_shift_id as string)
            .maybeSingle();
          return queryResult;
        },
        {
          timeout: timeoutConfig.api.shortRunning,
          retryOnFailure: false,
          maxRetries: 0,
        }
      );
      if (shiftResult.data) {
        shiftName = shiftResult.data.name || null;
        shiftStartTime = shiftResult.data.start_time ?? null;
        shiftEndTime = shiftResult.data.end_time ?? null;
      }
    }

    // Get route information
    let routeName = '';
    if (busData.route_id) {
      const routeResult = await resilientQuery<{ name: string }>(
        async () => {
          const queryResult = await supabase
            .from('routes')
            .select('name')
            .eq('id', busData.route_id)
            .single();
          return queryResult;
        },
        {
          timeout: timeoutConfig.api.shortRunning,
          retryOnFailure: true,
          maxRetries: 2,
        }
      );
      routeName = routeResult.data?.name || '';
    }

    // Get driver name
    let driverName = 'Unknown Driver';
    const profileResult = await resilientQuery<{ full_name: string }>(
      async () => {
        const queryResult = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', driverId)
          .single();
        return queryResult;
      },
      {
        timeout: timeoutConfig.api.shortRunning,
        retryOnFailure: true,
        maxRetries: 2,
      }
    );
    if (profileResult.data?.full_name) {
      driverName = profileResult.data.full_name;
    }

    return {
      driver_id: driverId,
      bus_id: busData.id,
      bus_number: busData.bus_number,
      route_id: busData.route_id || '',
      route_name: routeName,
      driver_name: driverName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      shift_id: busData.assigned_shift_id || null,
      shift_name: shiftName,
      shift_start_time: shiftStartTime,
      shift_end_time: shiftEndTime,
    };
  }

  /**
   * Get driver bus assignment with retry logic and timeout
   * PRODUCTION FIX: Added overall timeout to prevent hanging
   */
  async getDriverBusAssignment(
    driverId: string,
    currentSession: any
  ): Promise<DriverBusAssignment | null> {
    if (!currentSession?.access_token) {
      logger.warn('⚠️ No active Supabase session detected for assignment fetch, using direct Supabase fallback', 'auth', {
        driverId,
      });
      return await this.fetchAssignmentFromSupabase(driverId);
    }

    // PRODUCTION FIX: Overall timeout for entire assignment fetch operation
    const overallTimeout = timeoutConfig.api.busAssignment || 8000;
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        logger.warn('⚠️ Assignment fetch timed out', 'auth', { 
          driverId,
          timeoutMs: overallTimeout 
        });
        resolve(null);
      }, overallTimeout);
    });

    const assignmentPromise = (async () => {
      // Execute with retry logic
      try {
        const backoffResult = await standardBackoff.execute(async () => {
          try {
            const result = await this.fetchAssignmentFromAPI(driverId, currentSession);
            if (result === null) {
              // Null result might mean no assignment, which is not a retriable error
              // But we still want to try fallback
              throw new Error('No assignment found via API');
            }
            return result;
          } catch (error) {
            // Only retry if it's a retriable error
            if (this.isRetriableError(error)) {
              throw error;
            }
            // For non-retriable errors, try fallback immediately
            return await this.fetchAssignmentFromSupabase(driverId);
          }
        }, (attempt, delay, error) => {
          logger.info(`🔄 Retrying bus assignment fetch (attempt ${attempt})`, 'auth', {
            delay: `${delay}ms`,
            error: error.message
          });
        });

        if (backoffResult.success && backoffResult.result) {
          return backoffResult.result;
        }

        // If retry failed, try Supabase fallback
        logger.info('🔄 API retry failed, trying Supabase fallback', 'auth');
        return await this.fetchAssignmentFromSupabase(driverId);
      } catch (error) {
        logger.error('❌ Error in getDriverBusAssignment after retries:', 'auth', { error });
        
        // Final fallback to Supabase
        try {
          return await this.fetchAssignmentFromSupabase(driverId);
        } catch (fallbackError) {
          logger.error('❌ All assignment fetch methods failed', 'auth', { error: fallbackError });
          return null;
        }
      }
    })();

    // Race between assignment fetch and timeout
    return await Promise.race([assignmentPromise, timeoutPromise]);
  }

  /**
   * Get cached assignment from session storage
   */
  getCachedAssignment(driverId: string): DriverBusAssignment | null {
    try {
      const cachedAssignment = sessionStorage.getItem(`driver_assignment_${driverId}`);
      if (cachedAssignment) {
        const parsed = JSON.parse(cachedAssignment);
        // Check if cache is not too old (5 minutes)
        if (Date.now() - parsed._timestamp < 5 * 60 * 1000) {
          logger.info('📱 Using cached assignment data', 'auth');
          return parsed;
        }
      }
    } catch (cacheError) {
      logger.warn('⚠️ Failed to read cached assignment', 'auth', { error: cacheError });
    }
    return null;
  }

  /**
   * Cache assignment in session storage
   */
  cacheAssignment(driverId: string, assignment: DriverBusAssignment): void {
    try {
      sessionStorage.setItem(
        `driver_assignment_${driverId}`, 
        JSON.stringify({...assignment, _timestamp: Date.now()})
      );
    } catch (e) {
      // Ignore storage errors
    }
  }
}

// Export singleton instance
export const assignmentHelpers = new AssignmentHelpers();

