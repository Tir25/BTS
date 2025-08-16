// Smart API URL detection for cross-laptop testing
const getApiUrl = () => {
  // If environment variable is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Check if we're accessing from a network IP (cross-laptop)
  const currentHost = window.location.hostname;
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    // We're on a network IP, use the same IP for backend
    return `http://${currentHost}:3000`;
  }

  // Default to localhost for local development
  return 'http://localhost:3000';
};

const getWebSocketUrl = () => {
  // If environment variable is set, use it
  if (import.meta.env.VITE_WEBSOCKET_URL) {
    return import.meta.env.VITE_WEBSOCKET_URL;
  }

  // Check if we're accessing from a network IP (cross-laptop)
  const currentHost = window.location.hostname;
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    // We're on a network IP, use the same IP for WebSocket
    return `ws://${currentHost}:3000`;
  }

  // Default to localhost for local development
  return 'ws://localhost:3000';
};

export const environment = {
  // Supabase Configuration
  supabase: {
    url:
      import.meta.env.VITE_SUPABASE_URL ||
      'https://gthwmwfwvhyriygpcdlr.supabase.co',
    anonKey:
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI',
  },

  // API Configuration
  api: {
    url: getApiUrl(),
    websocketUrl: getWebSocketUrl(),
  },

  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

// Log environment status (only in development)
if (environment.isDevelopment) {
  console.log('🔧 Environment Configuration:', {
    supabaseUrl: environment.supabase.url ? '✅ Set' : '❌ Missing',
    supabaseKey: environment.supabase.anonKey ? '✅ Set' : '❌ Missing',
    apiUrl: environment.api.url,
    websocketUrl: environment.api.websocketUrl,
  });
}

export default environment;
