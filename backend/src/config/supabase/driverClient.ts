/**
 * Driver Supabase Client Factory
 * Creates and manages driver-specific Supabase client instances
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { SupabaseProjectConfig, DriverSupabaseAdminClient } from './types';
import { createSupabaseClient, testSupabaseConnection } from './clientFactory';
import config from '../environment';
import { logger } from '../../utils/logger';

// Singleton instances
let driverAdminClient: DriverSupabaseAdminClient | null = null;
let driverConfig: SupabaseProjectConfig | null = null;

/**
 * Get driver Supabase project configuration
 */
export function getDriverSupabaseConfig(): SupabaseProjectConfig {
  if (driverConfig) {
    return driverConfig;
  }

  driverConfig = {
    url: config.supabaseDriver.url,
    anonKey: config.supabaseDriver.anonKey,
    serviceRoleKey: config.supabaseDriver.serviceRoleKey,
  };

  return driverConfig;
}

/**
 * Get driver Supabase admin client (service role)
 * This client has full access and bypasses RLS policies
 */
export function getDriverSupabaseAdmin(): DriverSupabaseAdminClient {
  if (driverAdminClient) {
    return driverAdminClient;
  }

  const config = getDriverSupabaseConfig();
  const result = createSupabaseClient(config, 'driver', true, {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  });

  if (result.error || !result.client) {
    logger.error('❌ Failed to create driver Supabase admin client', 'supabase', {
      error: result.error?.message,
    });
    throw result.error || new Error('Failed to create driver Supabase admin client');
  }

  driverAdminClient = result.client as DriverSupabaseAdminClient;

  // Test connection in development
  if (process.env.NODE_ENV !== 'production') {
    testSupabaseConnection(driverAdminClient, 'driver').catch((error) => {
      logger.warn('⚠️ Driver Supabase connection test failed', 'supabase', { error });
    });
  }

  return driverAdminClient;
}

/**
 * Reset driver client (useful for testing or reconfiguration)
 */
export function resetDriverClient(): void {
  driverAdminClient = null;
  driverConfig = null;
  logger.info('🔄 Driver Supabase client reset', 'supabase');
}

/**
 * Test driver Supabase connection
 */
export async function testDriverConnection(): Promise<boolean> {
  try {
    const client = getDriverSupabaseAdmin();
    return await testSupabaseConnection(client, 'driver');
  } catch (error) {
    logger.error('❌ Driver connection test failed', 'supabase', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

