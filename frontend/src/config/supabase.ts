import { createClient } from '@supabase/supabase-js';
import { environment } from './environment';
import { logger } from '../utils/logger';

// Validate Supabase configuration with better error handling
const validateSupabaseConfig = () => {
  const { url, anonKey } = environment.supabase;

  logger.info('Validating Supabase configuration', 'supabase', {
    url: url ? 'Set' : 'Missing',
    anonKey: anonKey ? 'Set' : 'Missing',
    envVars: {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL
        ? 'Set'
        : 'Missing',
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
        ? 'Set'
        : 'Missing',
    },
  });

  // Check if URL is missing or contains placeholder
  if (!url || url === 'your_supabase_project_url' || url === '') {
    logger.error('Supabase URL validation failed', 'supabase', {
      url,
      envVar: import.meta.env.VITE_SUPABASE_URL,
    });
    throw new Error(
      'Invalid Supabase URL. Please check your environment variables.'
    );
  }

  // Check if anon key is missing or contains placeholder
  if (!anonKey || anonKey === 'your_supabase_anon_key_here' || anonKey === '') {
    logger.error('Supabase anon key validation failed', 'supabase', {
      anonKey: anonKey ? 'SET' : 'MISSING',
      envVar: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    });
    throw new Error(
      'Invalid Supabase anon key. Please check your environment variables.'
    );
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    logger.error('Supabase URL format validation failed', 'supabase', { url, error: String(error) });
    throw new Error(`Invalid Supabase URL format: ${url}`);
  }

  logger.info('Supabase configuration validated successfully', 'supabase');
  return { url, anonKey };
};

// Create Supabase client with error handling
const createSupabaseClient = () => {
  try {
    const config = validateSupabaseConfig();

    const client = createClient(config.url, config.anonKey, {
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
    });

    logger.info('Supabase client created successfully', 'supabase');
    return client;
  } catch (error) {
    logger.error('Failed to create Supabase client', 'supabase', { error: String(error) });

    // Enhanced fallback client with better error reporting
    if (import.meta.env.DEV) {
      logger.info('Creating fallback Supabase client for development...', 'supabase');
      
      // Try to get VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY directly from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gthwmwfwvhyriygpcdlr.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI';
      
      // Log detailed error information for easier debugging
      logger.error('Supabase client creation failed with original configuration', 'supabase', {
        originalError: String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        fallbackConfig: {
          url: supabaseUrl ? `✅ Using: ${supabaseUrl.substring(0, 15)}...` : '❌ Missing',
          anonKey: supabaseAnonKey ? '✅ Using: [Key available but hidden]' : '❌ Missing',
        }
      });
      
      const fallbackClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
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
      
      logger.info('Fallback Supabase client created with enhanced configuration', 'supabase');
      
      // Return fallback client with a method to check if it's working
      fallbackClient.auth.onAuthStateChange((event) => {
        logger.debug('Auth state change detected with fallback client', 'supabase', { event });
      });
      
      return fallbackClient;
    } else {
      // In production, we want to fail explicitly rather than use a degraded experience
      logger.error('Failed to create Supabase client in production mode', 'supabase', { 
        error: String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  }
};

// Create and export the Supabase client
export const supabase = createSupabaseClient();

// Test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    // Skip test for mock client
    if (!supabase.from || typeof supabase.from !== 'function') {
      logger.info('Skipping Supabase connection test (mock client)', 'supabase');
      return true;
    }

    // Testing Supabase connection...
    const { error } = await supabase.from('user_profiles').select('count').limit(1);

    if (error) {
      logger.error('Supabase connection test failed', 'supabase', { error: String(error) });
      return false;
    }

    // Supabase connection test successful
    return true;
  } catch (error) {
    logger.error('Supabase connection test error', 'supabase', { error: String(error) });
    return false;
  }
};

export default supabase;
