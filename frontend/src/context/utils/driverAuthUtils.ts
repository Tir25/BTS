/**
 * Driver Auth Utilities
 * Helper functions for driver authentication operations
 */

import { DriverBusAssignment } from '../../services/authService';
import { offlineStorage } from '../../services/offline/OfflineStorage';
import { logger } from '../../utils/logger';

/**
 * Merges assignment shift data, preserving existing shift info if new assignment doesn't have it
 */
export function mergeAssignmentShift(
  assignment: DriverBusAssignment,
  existingAssignment: DriverBusAssignment | null
): DriverBusAssignment {
  return {
    ...assignment,
    shift_id: assignment.shift_id ?? existingAssignment?.shift_id ?? null,
    shift_name: assignment.shift_name ?? existingAssignment?.shift_name ?? null,
    shift_start_time: assignment.shift_start_time ?? existingAssignment?.shift_start_time ?? null,
    shift_end_time: assignment.shift_end_time ?? existingAssignment?.shift_end_time ?? null,
  };
}

/**
 * Clears all driver-related data from localStorage and sessionStorage
 */
export function clearDriverStorage(): void {
  try {
    const keysToRemove: string[] = [];
    
    // Collect localStorage keys to remove
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('supabase') || 
        key.includes('auth') || 
        key.includes('sb-') || 
        key.includes('driver_assignment')
      )) {
        keysToRemove.push(key);
      }
    }
    
    // Remove localStorage keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Collect and remove sessionStorage keys
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.includes('supabase') || 
        key.includes('auth') || 
        key.includes('sb-') || 
        key.includes('driver_assignment')
      )) {
        sessionStorage.removeItem(key);
      }
    }
    
    logger.info('✅ All driver auth data cleared from storage', 'driver-auth-utils');
  } catch (storageError) {
    logger.warn('⚠️ Error clearing storage', 'driver-auth-utils', { error: storageError });
  }
}

/**
 * Stores assignment data in offline storage
 */
export function storeAssignmentOffline(
  driverId: string,
  assignment: DriverBusAssignment
): void {
  try {
    offlineStorage.storeData(
      'driver',
      `assignment_${driverId}`,
      assignment as unknown as Record<string, unknown>
    );
  } catch (error) {
    logger.warn('⚠️ Failed to store assignment offline', 'driver-auth-utils', { error });
  }
}

/**
 * Generates a unique request ID for tracking operations
 */
export function generateRequestId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

