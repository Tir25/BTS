// Smart API URL detection for cross-laptop testing and VS Code tunnels
const getApiUrl = () => {
  // Check for environment variable override first - PRIORITY 1
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== 'your_backend_url_here') {
    // Force local backend for development
    console.log('🔧 Environment variable detected, but forcing local backend for development');
    return 'http://localhost:3000';
  }

  // Check if we're accessing from a VS Code tunnel - PRIORITY 2
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol;

  if (currentHost.includes('devtunnels.ms')) {
    // For VS Code tunnels, we need to use the tunnel URL for the backend too
    // Extract the tunnel ID and create the backend tunnel URL
    const tunnelId = currentHost.split('.')[0]; // Extract tunnel ID
    const backendUrl = `${currentProtocol}//${tunnelId}-3000.inc1.devtunnels.ms`;
    console.log('🔧 VS Code tunnel detected (PRIORITY):', {
      currentHost,
      tunnelId,
      backendUrl,
    });
    return backendUrl;
  }

  // Check if we're accessing from Netlify or other production domains - PRIORITY 3
  if (currentHost.includes('netlify.app') || currentHost.includes('vercel.app') || currentHost.includes('.com')) {
    // For now, use local backend even in production (temporary for development)
    const localBackendUrl = 'http://localhost:3000';
    console.log('🔧 Production deployment detected, but using local backend for development:', { currentHost, localBackendUrl });
    return localBackendUrl;
  }

  // Check if we're accessing from a network IP (cross-laptop) - PRIORITY 4
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    // We're on a network IP, use the same IP for backend
    const networkUrl = `http://${currentHost}:3000`;
    console.log('🔧 Network IP detected:', { currentHost, networkUrl });
    return networkUrl;
  }

  // Default to localhost for local development
  console.log('🔧 Localhost detected:', { currentHost });
  return 'http://localhost:3000';
};

const getWebSocketUrl = () => {
  // Check for environment variable override first - PRIORITY 1
  if (import.meta.env.VITE_WEBSOCKET_URL && import.meta.env.VITE_WEBSOCKET_URL !== 'your_websocket_url_here') {
    // Force local WebSocket for development
    console.log('🔧 Environment variable detected, but forcing local WebSocket for development');
    return 'ws://localhost:3000';
  }

  // Check if we're accessing from a VS Code tunnel - PRIORITY 2
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol;

  if (currentHost.includes('devtunnels.ms')) {
    // For VS Code tunnels, we need to use the tunnel URL for the backend too
    const tunnelId = currentHost.split('.')[0]; // Extract tunnel ID
    const wsUrl = `${currentProtocol === 'https:' ? 'wss:' : 'ws:'}//${tunnelId}-3000.inc1.devtunnels.ms`;
    console.log('🔧 WebSocket tunnel URL (PRIORITY):', wsUrl);
    return wsUrl;
  }

  // Check if we're accessing from Netlify or other production domains - PRIORITY 3
  if (currentHost.includes('netlify.app') || currentHost.includes('vercel.app') || currentHost.includes('.com')) {
    // For now, use local backend WebSocket even in production (temporary for development)
    const localWsUrl = 'ws://localhost:3000';
    console.log('🔧 Production WebSocket detected, but using local backend for development:', { currentHost, localWsUrl });
    return localWsUrl;
  }

  // Check if we're accessing from a network IP (cross-laptop) - PRIORITY 4
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    // We're on a network IP, use the same IP for WebSocket
    const wsUrl = `ws://${currentHost}:3000`;
    console.log('🔧 WebSocket network URL:', wsUrl);
    return wsUrl;
  }

  // Default to localhost for local development
  console.log('🔧 WebSocket localhost URL: ws://localhost:3000');
  return 'ws://localhost:3000';
};

// Create a dynamic environment object that evaluates URLs at runtime
export const environment = {
  // Supabase Configuration
  supabase: {
    url: (() => {
      const envUrl = import.meta.env.VITE_SUPABASE_URL;
      const fallbackUrl = 'https://gthwmwfwvhyriygpcdlr.supabase.co';

      if (envUrl && envUrl !== 'your_supabase_project_url' && envUrl !== '') {
        return envUrl;
      }

      console.warn(
        '⚠️ Using fallback Supabase URL. Please set VITE_SUPABASE_URL in your environment variables.'
      );
      return fallbackUrl;
    })(),
    anonKey: (() => {
      const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const fallbackKey = '';

      if (envKey && envKey !== 'your_supabase_anon_key_here' && envKey !== '') {
        return envKey;
      }

      console.warn(
        '⚠️ Using fallback Supabase anon key. Please set VITE_SUPABASE_ANON_KEY in your environment variables.'
      );
      return fallbackKey;
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
