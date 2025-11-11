/**
 * Supabase Configuration Module
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
  DriverSupabaseAdminClient,
  StudentSupabaseAdminClient,
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
  getDriverSupabaseAdmin,
  getDriverSupabaseConfig,
  resetDriverClient,
  testDriverConnection,
} from './driverClient';

import {
  getStudentSupabaseAdmin,
  getStudentSupabaseConfig,
  resetStudentClient,
  testStudentConnection,
} from './studentClient';

export {
  getDriverSupabaseAdmin,
  getDriverSupabaseConfig,
  resetDriverClient,
  testDriverConnection,
};

export {
  getStudentSupabaseAdmin,
  getStudentSupabaseConfig,
  resetStudentClient,
  testStudentConnection,
};

// Backward compatibility: Export legacy client getters
// These will use driver config for backward compatibility during migration
import { getDriverSupabaseAdmin as getLegacyDriverAdmin } from './driverClient';
import config from '../environment';
import { createSupabaseClient as createLegacyClient } from './clientFactory';
import { logger } from '../../utils/logger';

/**
 * Legacy Supabase admin client (backward compatibility)
 * Uses driver configuration by default, falls back to legacy config if available
 * @deprecated Use getDriverSupabaseAdmin() or getStudentSupabaseAdmin() instead
 */
export function getSupabaseAdmin() {
  logger.warn(
    '⚠️ Using legacy getSupabaseAdmin(). Consider migrating to getDriverSupabaseAdmin() or getStudentSupabaseAdmin()',
    'supabase'
  );
  return getLegacyDriverAdmin();
}

/**
 * Legacy Supabase client (backward compatibility)
 * Uses driver configuration by default
 * @deprecated Use role-specific clients instead
 */
export function getSupabase() {
  logger.warn(
    '⚠️ Using legacy getSupabase(). Consider migrating to role-specific clients',
    'supabase'
  );
  // Return driver admin client for backward compatibility
  return getLegacyDriverAdmin();
}

// Re-export for convenience (these will be the primary exports going forward)
export const supabaseAdmin = getLegacyDriverAdmin();
export const supabase = getLegacyDriverAdmin(); // For backward compatibility

// Default export
export default {
  getDriverSupabaseAdmin,
  getStudentSupabaseAdmin,
  getSupabaseAdmin, // Legacy
  getSupabase, // Legacy
};

