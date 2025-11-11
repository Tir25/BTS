/**
 * Legacy Supabase Client Export
 * This file provides backward compatibility by re-exporting from the new role-based structure
 * 
 * @deprecated For new code, use role-specific clients from './supabase/index'
 * - Drivers: use getDriverSupabaseClient()
 * - Students: use getStudentSupabaseClient()
 */

// Re-export from new structure for backward compatibility
export {
  getDriverSupabaseClient,
  getStudentSupabaseClient,
  getDriverSupabaseConfig,
  getStudentSupabaseConfig,
  resetDriverClient,
  resetStudentClient,
  testDriverConnection,
  testStudentConnection,
  // Legacy exports
  getSupabase,
} from './supabase/index';

// Re-export types
export type {
  DriverSupabaseClient,
  StudentSupabaseClient,
  UserRole,
  SupabaseProjectConfig,
  SupabaseClientOptions,
} from './supabase/index';

// Legacy client (uses driver client for backward compatibility)
// Lazy getter to avoid circular dependency
import { getDriverSupabaseClient } from './supabase/index';

let _legacySupabase: any = null;
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!_legacySupabase) {
      _legacySupabase = getDriverSupabaseClient();
    }
    return _legacySupabase[prop];
  }
});

// Legacy test function
export const testSupabaseConnection = async () => {
  try {
    const { getDriverSupabaseClient } = await import('./supabase/index');
    const client = getDriverSupabaseClient();
    if (!client.from || typeof client.from !== 'function') {
      return true;
    }
    const { error } = await client.from('user_profiles').select('count').limit(1);
    return !error;
  } catch (error) {
    return false;
  }
};

export default supabase;
