/**
 * Student Supabase Client Factory
 * Creates and manages student-specific Supabase client instances
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { SupabaseProjectConfig, StudentSupabaseAdminClient } from './types';
import { createSupabaseClient, testSupabaseConnection } from './clientFactory';
import config from '../environment';
import { logger } from '../../utils/logger';

// Singleton instances
let studentAdminClient: StudentSupabaseAdminClient | null = null;
let studentConfig: SupabaseProjectConfig | null = null;

/**
 * Get student Supabase project configuration
 */
export function getStudentSupabaseConfig(): SupabaseProjectConfig {
  if (studentConfig) {
    return studentConfig;
  }

  studentConfig = {
    url: config.supabaseStudent.url,
    anonKey: config.supabaseStudent.anonKey,
    serviceRoleKey: config.supabaseStudent.serviceRoleKey,
  };

  return studentConfig;
}

/**
 * Get student Supabase admin client (service role)
 * This client has full access and bypasses RLS policies
 */
export function getStudentSupabaseAdmin(): StudentSupabaseAdminClient {
  if (studentAdminClient) {
    return studentAdminClient;
  }

  const config = getStudentSupabaseConfig();
  const result = createSupabaseClient(config, 'student', true, {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  });

  if (result.error || !result.client) {
    logger.error('❌ Failed to create student Supabase admin client', 'supabase', {
      error: result.error?.message,
    });
    throw result.error || new Error('Failed to create student Supabase admin client');
  }

  studentAdminClient = result.client as StudentSupabaseAdminClient;

  // Test connection in development
  if (process.env.NODE_ENV !== 'production') {
    testSupabaseConnection(studentAdminClient, 'student').catch((error) => {
      logger.warn('⚠️ Student Supabase connection test failed', 'supabase', { error });
    });
  }

  return studentAdminClient;
}

/**
 * Reset student client (useful for testing or reconfiguration)
 */
export function resetStudentClient(): void {
  studentAdminClient = null;
  studentConfig = null;
  logger.info('🔄 Student Supabase client reset', 'supabase');
}

/**
 * Test student Supabase connection
 */
export async function testStudentConnection(): Promise<boolean> {
  try {
    const client = getStudentSupabaseAdmin();
    return await testSupabaseConnection(client, 'student');
  } catch (error) {
    logger.error('❌ Student connection test failed', 'supabase', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

