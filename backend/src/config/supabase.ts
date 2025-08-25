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
  console.warn('⚠️ SUPABASE_URL environment variable is missing. Using default value.');
  // You can set a default URL here if needed
}

if (!supabaseAnonKey) {
  console.warn('⚠️ SUPABASE_ANON_KEY environment variable is missing. Using default value.');
  // You can set a default key here if needed
}

if (!supabaseServiceRoleKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY environment variable is missing. Using default value.');
  // You can set a default key here if needed
}

// For development, you might want to use default values
// For production, these should be properly configured
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error('❌ Required Supabase environment variables are missing!');
  console.error('Please configure the following in your Render dashboard:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_ANON_KEY');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('See RENDER_ENVIRONMENT_SETUP_GUIDE.md for instructions.');
  
  // In production, you might want to exit
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Client for public operations (frontend use)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export default supabase;
