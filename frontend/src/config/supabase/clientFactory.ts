/**
 * Supabase Client Factory (Frontend)
 * Shared client creation logic for role-based Supabase clients
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { SupabaseProjectConfig, SupabaseClientOptions, ClientFactoryResult } from './types';
import { logger } from '../../utils/logger';

/**
 * Default client options for frontend
 */
const DEFAULT_OPTIONS: SupabaseClientOptions = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
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

  // Validate URL format
  try {
    new URL(config.url);
  } catch (error) {
    throw new Error(`Invalid ${role} Supabase URL format: ${config.url}`);
  }
}

/**
 * Create a Supabase client with error handling (Frontend)
 */
export function createSupabaseClient(
  config: SupabaseProjectConfig,
  role: string,
  options?: SupabaseClientOptions
): ClientFactoryResult<SupabaseClient<Database>> {
  try {
    // Validate configuration
    validateSupabaseConfig(config, role);

    // Extract project ID from URL for storage key
    const urlMatch = config.url.match(/https?:\/\/([^.]+)\.supabase\.co/);
    const projectId = urlMatch ? urlMatch[1] : 'default';
    
    // Generate unique storage key per role to prevent GoTrueClient conflicts
    // Include role in storage key and use a consistent format
    const storageKey = options?.storageKey || `sb-${projectId}-${role}-auth`;
    
    // Merge options with role-specific storage key
    const clientOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
      auth: {
        autoRefreshToken: options?.autoRefreshToken ?? DEFAULT_OPTIONS.autoRefreshToken,
        persistSession: options?.persistSession ?? DEFAULT_OPTIONS.persistSession,
        detectSessionInUrl: options?.detectSessionInUrl ?? DEFAULT_OPTIONS.detectSessionInUrl,
        // Use role-specific storage key to prevent conflicts between driver/student clients
        // This ensures each role has its own localStorage key
        storageKey,
      },
      global: {
        headers: {
          'X-Client-Info': `bus-tracking-${role}`,
          ...options?.headers,
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    };

    // Create client
    const client = createClient<Database>(config.url, config.anonKey, clientOptions);

    logger.info(`✅ ${role} Supabase client created successfully`, 'supabase', {
      role,
      url: config.url,
      storageKey: clientOptions.auth.storageKey,
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
    });

    return {
      client: null as any, // Will be handled by caller
      config,
      error: error instanceof Error ? error : new Error(errorMessage),
    };
  }
}

/**
 * Test Supabase client connection (Frontend)
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

