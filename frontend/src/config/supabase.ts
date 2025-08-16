import { createClient } from '@supabase/supabase-js';
import { environment } from './environment';

// Create Supabase client using environment configuration
export const supabase = createClient(
  environment.supabase.url,
  environment.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'bus-tracking-admin',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    // Testing Supabase connection...
    const { error } = await supabase.from('profiles').select('count').limit(1);

    if (error) {
      console.error('❌ Supabase connection test failed:', error);
      return false;
    }

    // Supabase connection test successful
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test error:', error);
    return false;
  }
};

export default supabase;
