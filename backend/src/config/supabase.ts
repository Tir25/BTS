import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if environment variables are present
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required. Please check your .env file.');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required. Please check your .env file.');
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required. Please check your .env file.');
}

// Client for public operations (frontend use)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export default supabase;

