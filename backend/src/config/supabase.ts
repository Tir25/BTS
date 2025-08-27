import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isProduction = process.env.NODE_ENV === 'production';

// Validate environment variables (only in production)
if (isProduction) {
  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL environment variable is required in production. Please check your .env file.'
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      'SUPABASE_ANON_KEY environment variable is required in production. Please check your .env file.'
    );
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is required in production. Please check your .env file.'
    );
  }
}

// Use fallbacks for development
const finalSupabaseUrl = supabaseUrl || 'https://gthwmwfwvhyriygpcdlr.supabase.co';
const finalSupabaseAnonKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI';
const finalSupabaseServiceRoleKey = supabaseServiceRoleKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk3MTQ1NSwiZXhwIjoyMDcwNTQ3NDU1fQ.LuwfYUuGMRQh3Gbc7NQuRCqZxLsS5CrQOd1eMjiWj2o';

// Client for public operations (frontend use)
export const supabase = createClient(finalSupabaseUrl, finalSupabaseAnonKey);

// Admin client for server-side operations
export const supabaseAdmin = createClient(finalSupabaseUrl, finalSupabaseServiceRoleKey);

export default supabase;
