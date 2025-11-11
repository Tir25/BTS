/**
 * Supabase Configuration Types
 * Type definitions for role-based Supabase clients
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

/**
 * User role types
 */
export type UserRole = 'driver' | 'student' | 'admin';

/**
 * Supabase project configuration
 */
export interface SupabaseProjectConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

/**
 * Supabase client configuration options
 */
export interface SupabaseClientOptions {
  autoRefreshToken?: boolean;
  persistSession?: boolean;
  detectSessionInUrl?: boolean;
  storageKey?: string;
  headers?: Record<string, string>;
}

/**
 * Role-based Supabase client types
 */
export type DriverSupabaseClient = SupabaseClient<Database>;
export type StudentSupabaseClient = SupabaseClient<Database>;
export type DriverSupabaseAdminClient = SupabaseClient<Database>;
export type StudentSupabaseAdminClient = SupabaseClient<Database>;

/**
 * Client factory result
 */
export interface ClientFactoryResult<T> {
  client: T;
  config: SupabaseProjectConfig;
  error?: Error;
}

