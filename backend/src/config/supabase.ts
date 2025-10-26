import { createClient } from '@supabase/supabase-js';
import config from './environment';

// Use the centralized environment configuration - REMOVED

// Use environment configuration values
const finalSupabaseUrl = config.supabase.url;
const finalSupabaseAnonKey = config.supabase.anonKey;
const finalSupabaseServiceRoleKey = config.supabase.serviceRoleKey;

// Client for public operations (frontend use)
export const supabase = createClient(finalSupabaseUrl, finalSupabaseAnonKey);

// Admin client for server-side operations
export const supabaseAdmin = createClient(
  finalSupabaseUrl,
  finalSupabaseServiceRoleKey
);

export default supabase;
