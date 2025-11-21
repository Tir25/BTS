/**
 * Admin Supabase Client Factory (Frontend)
 * Creates and manages admin-specific Supabase client instances
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { SupabaseProjectConfig, AdminSupabaseClient } from './types';
import { createSupabaseClient, testSupabaseConnection } from './clientFactory';
import { environment } from '../environment';
import { logger } from '../../utils/logger';

// Singleton instance
let adminClient: AdminSupabaseClient | null = null;
let adminConfig: SupabaseProjectConfig | null = null;

/**
 * Get admin Supabase project configuration
 */
export function getAdminSupabaseConfig(): SupabaseProjectConfig {
  if (adminConfig) {
    return adminConfig;
  }

  // Get from environment with fallback to legacy config
  const url = import.meta.env.VITE_ADMIN_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_ADMIN_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  adminConfig = {
    url,
    anonKey,
  };

  return adminConfig;
}

/**
 * Get admin Supabase client
 * This client is used for admin authentication and operations
 */
export function getAdminSupabaseClient(): AdminSupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const config = getAdminSupabaseConfig();
  const result = createSupabaseClient(config, 'admin', {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  });

  if (result.error || !result.client) {
    logger.error('❌ Failed to create admin Supabase client', 'supabase', {
      error: result.error?.message,
    });
    throw result.error || new Error('Failed to create admin Supabase client');
  }

  adminClient = result.client as AdminSupabaseClient;

  // Test connection in development
  if (import.meta.env.DEV) {
    testSupabaseConnection(adminClient, 'admin').catch((error) => {
      logger.warn('⚠️ Admin Supabase connection test failed', 'supabase', { error });
    });
  }

  return adminClient;
}

/**
 * Reset admin client (useful for testing or reconfiguration)
 */
export function resetAdminClient(): void {
  adminClient = null;
  adminConfig = null;
  logger.info('🔄 Admin Supabase client reset', 'supabase');
}

/**
 * Test admin Supabase connection
 */
export async function testAdminConnection(): Promise<boolean> {
  try {
    const client = getAdminSupabaseClient();
    return await testSupabaseConnection(client, 'admin');
  } catch (error) {
    logger.error('❌ Admin connection test failed', 'supabase', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

