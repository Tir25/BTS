// Smart API URL detection for cross-laptop testing and VS Code tunnels - OPTIMIZED
const getApiUrl = () => {
  // PRIORITY 1: Environment variable override (for deployment) - FAST PATH
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // PRIORITY 2: Production domains - FAST PATH
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol;

  // Fast check for production domains
  if (
    currentHost.includes('render.com') ||
    currentHost.includes('vercel.app') ||
    currentHost.includes('vercel.com')
  ) {
    return 'https://bus-tracking-backend-sxh8.onrender.com';
  }

  // PRIORITY 3: VS Code tunnels - OPTIMIZED
  if (currentHost.includes('devtunnels.ms')) {
    const tunnelId = currentHost.split('.')[0];
    return `${currentProtocol}//${tunnelId}-3000.inc1.devtunnels.ms`;
  }

  // PRIORITY 4: Network IP (cross-laptop) - OPTIMIZED
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    return `http://${currentHost}:3000`;
  }

  // PRIORITY 5: Localhost - FAST PATH
  return 'http://localhost:3000';
};

const getWebSocketUrl = () => {
  // PRIORITY 1: Environment variable override (for deployment) - FAST PATH
  if (import.meta.env.VITE_WEBSOCKET_URL) {
    return import.meta.env.VITE_WEBSOCKET_URL;
  }

  // PRIORITY 2: Production domains - FAST PATH
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol;

  // Fast check for production domains
  if (
    currentHost.includes('render.com') ||
    currentHost.includes('vercel.app') ||
    currentHost.includes('vercel.com')
  ) {
    return 'wss://bus-tracking-backend-sxh8.onrender.com';
  }

  // PRIORITY 3: VS Code tunnels - OPTIMIZED
  if (currentHost.includes('devtunnels.ms')) {
    const tunnelId = currentHost.split('.')[0];
    const wsUrl = `${currentProtocol === 'https:' ? 'wss:' : 'ws:'}//${tunnelId}-3000.inc1.devtunnels.ms`;
    return wsUrl;
  }

  // PRIORITY 4: Network IP (cross-laptop) - OPTIMIZED
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    return `ws://${currentHost}:3000`;
  }

  // PRIORITY 5: Localhost - FAST PATH
  return 'ws://localhost:3000';
};

// Create a dynamic environment object that evaluates URLs at runtime
export const environment = {
  // Supabase Configuration
  supabase: {
    url: (() => {
      const envUrl = import.meta.env.VITE_SUPABASE_URL;

      if (envUrl && envUrl !== 'your_supabase_project_url' && envUrl !== '') {
        return envUrl;
      }

      if (import.meta.env.DEV) {
        console.warn(
          '⚠️ VITE_SUPABASE_URL not set. Please set it in your environment variables.'
        );
        return null;
      }

      throw new Error(
        'VITE_SUPABASE_URL is required in production. Please set it in your environment variables.'
      );
    })(),
    anonKey: (() => {
      const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (envKey && envKey !== 'your_supabase_anon_key_here' && envKey !== '') {
        return envKey;
      }

      if (import.meta.env.DEV) {
        console.warn(
          '⚠️ VITE_SUPABASE_ANON_KEY not set. Please set it in your environment variables.'
        );
        return null;
      }

      throw new Error(
        'VITE_SUPABASE_ANON_KEY is required in production. Please set it in your environment variables.'
      );
    })(),
  },

  // API Configuration - Use getters to ensure dynamic evaluation
  get api() {
    return {
      url: getApiUrl(),
      websocketUrl: getWebSocketUrl(),
    };
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
    currentHost: window.location.hostname,
    currentProtocol: window.location.protocol,
    envVar: import.meta.env.VITE_API_URL || 'NOT SET',
  });
}

export default environment;
