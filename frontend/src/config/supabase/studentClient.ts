/**
 * Student Supabase Client Factory (Frontend)
 * Creates and manages student-specific Supabase client instances
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { SupabaseProjectConfig, StudentSupabaseClient } from './types';
import { createSupabaseClient, testSupabaseConnection } from './clientFactory';
import { environment } from '../environment';
import { logger } from '../../utils/logger';

// Singleton instance
let studentClient: StudentSupabaseClient | null = null;
let studentConfig: SupabaseProjectConfig | null = null;

/**
 * Get student Supabase project configuration
 */
export function getStudentSupabaseConfig(): SupabaseProjectConfig {
  if (studentConfig) {
    return studentConfig;
  }

  // Get from environment with fallback to legacy config
  const url = import.meta.env.VITE_STUDENT_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_STUDENT_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  studentConfig = {
    url,
    anonKey,
  };

  return studentConfig;
}

/**
 * Get student Supabase client
 * This client is used for student authentication and operations
 */
export function getStudentSupabaseClient(): StudentSupabaseClient {
  if (studentClient) {
    return studentClient;
  }

  const config = getStudentSupabaseConfig();
  const result = createSupabaseClient(config, 'student', {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  });

  if (result.error || !result.client) {
    logger.error('❌ Failed to create student Supabase client', 'supabase', {
      error: result.error?.message,
    });
    throw result.error || new Error('Failed to create student Supabase client');
  }

  studentClient = result.client as StudentSupabaseClient;

  // Test connection in development
  if (import.meta.env.DEV) {
    testSupabaseConnection(studentClient, 'student').catch((error) => {
      logger.warn('⚠️ Student Supabase connection test failed', 'supabase', { error });
    });
  }

  return studentClient;
}

/**
 * Reset student client (useful for testing or reconfiguration)
 */
export function resetStudentClient(): void {
  studentClient = null;
  studentConfig = null;
  logger.info('🔄 Student Supabase client reset', 'supabase');
}

/**
 * Test student Supabase connection
 */
export async function testStudentConnection(): Promise<boolean> {
  try {
    const client = getStudentSupabaseClient();
    return await testSupabaseConnection(client, 'student');
  } catch (error) {
    logger.error('❌ Student connection test failed', 'supabase', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

