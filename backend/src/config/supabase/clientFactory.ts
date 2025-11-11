/**
 * Supabase Client Factory
 * Shared client creation logic for role-based Supabase clients
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { SupabaseProjectConfig, SupabaseClientOptions, ClientFactoryResult } from './types';
import { logger } from '../../utils/logger';

/**
 * Default client options
 */
const DEFAULT_OPTIONS: SupabaseClientOptions = {
  autoRefreshToken: true,
  persistSession: false, // Backend doesn't persist sessions
  detectSessionInUrl: false,
};

/**
 * Validate Supabase project configuration
 */
export function validateSupabaseConfig(config: SupabaseProjectConfig, role: string): void {
  if (!config.url || config.url === '' || config.url === 'your_supabase_project_url') {
    throw new Error(`Invalid ${role} Supabase URL. Please check your environment variables.`);
  }

  if (!config.anonKey || config.anonKey === '' || config.anonKey === 'your_supabase_anon_key_here') {
    throw new Error(`Invalid ${role} Supabase anon key. Please check your environment variables.`);
  }

  if (!config.serviceRoleKey || config.serviceRoleKey === '' || config.serviceRoleKey === 'your_supabase_service_role_key_here') {
    throw new Error(`Invalid ${role} Supabase service role key. Please check your environment variables.`);
  }

  // Validate URL format
  try {
    new URL(config.url);
  } catch (error) {
    throw new Error(`Invalid ${role} Supabase URL format: ${config.url}`);
  }
}

/**
 * Create a Supabase client with error handling
 */
export function createSupabaseClient(
  config: SupabaseProjectConfig,
  role: string,
  useServiceRole: boolean = false,
  options?: SupabaseClientOptions
): ClientFactoryResult<SupabaseClient<Database>> {
  try {
    // Validate configuration
    validateSupabaseConfig(config, role);

    // Merge options
    const clientOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
      auth: {
        autoRefreshToken: options?.autoRefreshToken ?? DEFAULT_OPTIONS.autoRefreshToken,
        persistSession: options?.persistSession ?? DEFAULT_OPTIONS.persistSession,
        detectSessionInUrl: options?.detectSessionInUrl ?? DEFAULT_OPTIONS.detectSessionInUrl,
        storageKey: options?.storageKey,
      },
      global: {
        headers: {
          'X-Client-Info': `bus-tracking-${role}`,
          ...options?.headers,
        },
      },
    };

    // Choose the appropriate key
    const key = useServiceRole ? config.serviceRoleKey : config.anonKey;

    // Create client
    const client = createClient<Database>(config.url, key, clientOptions);

    logger.info(`✅ ${role} Supabase client created successfully`, 'supabase', {
      role,
      url: config.url,
      useServiceRole,
      hasAnonKey: !!config.anonKey,
      hasServiceRoleKey: !!config.serviceRoleKey,
    });

    return {
      client,
      config,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Failed to create ${role} Supabase client`, 'supabase', {
      role,
      error: errorMessage,
      url: config.url,
      useServiceRole,
    });

    return {
      client: null as any, // Will be handled by caller
      config,
      error: error instanceof Error ? error : new Error(errorMessage),
    };
  }
}

/**
 * Test Supabase client connection
 */
export async function testSupabaseConnection(
  client: SupabaseClient<Database>,
  role: string
): Promise<boolean> {
  try {
    // Skip test for mock client
    if (!client.from || typeof client.from !== 'function') {
      logger.info(`Skipping ${role} Supabase connection test (mock client)`, 'supabase');
      return true;
    }

    // Test connection by querying user_profiles table
    const { error } = await client.from('user_profiles').select('count').limit(1);

    if (error) {
      logger.error(`❌ ${role} Supabase connection test failed`, 'supabase', {
        role,
        error: error.message,
      });
      return false;
    }

    logger.info(`✅ ${role} Supabase connection test successful`, 'supabase', { role });
    return true;
  } catch (error) {
    logger.error(`❌ ${role} Supabase connection test error`, 'supabase', {
      role,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

