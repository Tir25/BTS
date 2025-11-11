/**
 * Driver Supabase Client Factory (Frontend)
 * Creates and manages driver-specific Supabase client instances
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { SupabaseProjectConfig, DriverSupabaseClient } from './types';
import { createSupabaseClient, testSupabaseConnection } from './clientFactory';
import { environment } from '../environment';
import { logger } from '../../utils/logger';

// Singleton instance
let driverClient: DriverSupabaseClient | null = null;
let driverConfig: SupabaseProjectConfig | null = null;

/**
 * Get driver Supabase project configuration
 */
export function getDriverSupabaseConfig(): SupabaseProjectConfig {
  if (driverConfig) {
    return driverConfig;
  }

  // Get from environment with fallback to legacy config
  const url = import.meta.env.VITE_DRIVER_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_DRIVER_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  driverConfig = {
    url,
    anonKey,
  };

  return driverConfig;
}

/**
 * Get driver Supabase client
 * This client is used for driver authentication and operations
 */
export function getDriverSupabaseClient(): DriverSupabaseClient {
  if (driverClient) {
    return driverClient;
  }

  const config = getDriverSupabaseConfig();
  const result = createSupabaseClient(config, 'driver', {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  });

  if (result.error || !result.client) {
    logger.error('❌ Failed to create driver Supabase client', 'supabase', {
      error: result.error?.message,
    });
    throw result.error || new Error('Failed to create driver Supabase client');
  }

  driverClient = result.client as DriverSupabaseClient;

  // Test connection in development
  if (import.meta.env.DEV) {
    testSupabaseConnection(driverClient, 'driver').catch((error) => {
      logger.warn('⚠️ Driver Supabase connection test failed', 'supabase', { error });
    });
  }

  return driverClient;
}

/**
 * Reset driver client (useful for testing or reconfiguration)
 */
export function resetDriverClient(): void {
  driverClient = null;
  driverConfig = null;
  logger.info('🔄 Driver Supabase client reset', 'supabase');
}

/**
 * Test driver Supabase connection
 */
export async function testDriverConnection(): Promise<boolean> {
  try {
    const client = getDriverSupabaseClient();
    return await testSupabaseConnection(client, 'driver');
  } catch (error) {
    logger.error('❌ Driver connection test failed', 'supabase', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

