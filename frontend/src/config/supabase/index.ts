/**
 * Supabase Configuration Module (Frontend)
 * Role-based Supabase client factory and exports
 * 
 * This module provides role-specific Supabase clients for drivers and students,
 * ensuring complete isolation between authentication systems.
 */

// Export types
export type {
  UserRole,
  SupabaseProjectConfig,
  SupabaseClientOptions,
  DriverSupabaseClient,
  StudentSupabaseClient,
  ClientFactoryResult,
} from './types';

export type { Database } from './database.types';

// Export client factories
export {
  createSupabaseClient,
  validateSupabaseConfig,
  testSupabaseConnection,
} from './clientFactory';

// Export role-specific clients
import {
  getAdminSupabaseClient,
  getAdminSupabaseConfig,
  resetAdminClient,
  testAdminConnection,
} from './adminClient';

import {
  getDriverSupabaseClient,
  getDriverSupabaseConfig,
  resetDriverClient,
  testDriverConnection,
} from './driverClient';

import {
  getStudentSupabaseClient,
  getStudentSupabaseConfig,
  resetStudentClient,
  testStudentConnection,
} from './studentClient';

// Backward compatibility: Export legacy client getters
import { logger } from '../../utils/logger';

export {
  getAdminSupabaseClient,
  getAdminSupabaseConfig,
  resetAdminClient,
  testAdminConnection,
};

export {
  getDriverSupabaseClient,
  getDriverSupabaseConfig,
  resetDriverClient,
  testDriverConnection,
};

export {
  getStudentSupabaseClient,
  getStudentSupabaseConfig,
  resetStudentClient,
  testStudentConnection,
};

/**
 * Legacy Supabase client (backward compatibility)
 * Uses driver configuration by default
 * @deprecated Use getDriverSupabaseClient() or getStudentSupabaseClient() instead
 */
export function getSupabase() {
  logger.warn(
    '⚠️ Using legacy getSupabase(). Consider migrating to getDriverSupabaseClient() or getStudentSupabaseClient()',
    'supabase'
  );
  return getDriverSupabaseClient();
}

// Lazy export for backward compatibility (created on first access)
let _supabase: any = null;
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!_supabase) {
      _supabase = getDriverSupabaseClient();
    }
    return _supabase[prop];
  }
});

