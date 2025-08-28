import { createClient } from '@supabase/supabase-js';
import initializeEnvironment from './environment';

// Use the centralized environment configuration
const environment = initializeEnvironment();

// Use environment configuration values
const finalSupabaseUrl = environment.supabase.url;
const finalSupabaseAnonKey = environment.supabase.anonKey;
const finalSupabaseServiceRoleKey = environment.supabase.serviceRoleKey;

// Client for public operations (frontend use)
export const supabase = createClient(finalSupabaseUrl, finalSupabaseAnonKey);

// Admin client for server-side operations
export const supabaseAdmin = createClient(
  finalSupabaseUrl,
  finalSupabaseServiceRoleKey
);

export default supabase;
