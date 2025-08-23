import { createClient } from '@supabase/supabase-js';
import { environment } from './environment';

// Validate Supabase configuration with better error handling
const validateSupabaseConfig = () => {
  const { url, anonKey } = environment.supabase;
  
  console.log('🔧 Validating Supabase configuration:', {
    url: url ? '✅ Set' : '❌ Missing',
    anonKey: anonKey ? '✅ Set' : '❌ Missing',
    envVars: {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
    }
  });
  
  // Check if URL is missing or contains placeholder
  if (!url || url === 'your_supabase_project_url' || url === '') {
    console.error('❌ Supabase URL validation failed:', { url, envVar: import.meta.env.VITE_SUPABASE_URL });
    throw new Error('Invalid Supabase URL. Please check your environment variables.');
  }
  
  // Check if anon key is missing or contains placeholder
  if (!anonKey || anonKey === 'your_supabase_anon_key_here' || anonKey === '') {
    console.error('❌ Supabase anon key validation failed:', { anonKey: anonKey ? 'SET' : 'MISSING', envVar: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING' });
    throw new Error('Invalid Supabase anon key. Please check your environment variables.');
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    console.error('❌ Supabase URL format validation failed:', { url, error });
    throw new Error(`Invalid Supabase URL format: ${url}`);
  }
  
  console.log('✅ Supabase configuration validated successfully');
  return { url, anonKey };
};

// Create Supabase client with error handling
const createSupabaseClient = () => {
  try {
    const config = validateSupabaseConfig();
    
    const client = createClient(
      config.url,
      config.anonKey,
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
    
    console.log('✅ Supabase client created successfully');
    return client;
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    
    // Create a fallback client with default values for development
    if (import.meta.env.DEV) {
      console.log('🔄 Creating fallback Supabase client for development...');
      const fallbackClient = createClient(
        'https://gthwmwfwvhyriygpcdlr.supabase.co',
        '',
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
      console.log('✅ Fallback Supabase client created');
      return fallbackClient;
    } else {
      throw error;
    }
  }
};

// Create and export the Supabase client
export const supabase = createSupabaseClient();

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
