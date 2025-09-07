// Network IP detection function for cross-laptop testing
const detectNetworkIP = (): string | null => {
  try {
    // Method 1: Check if we're accessing via network IP directly
    const currentHost = window.location.hostname;
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1' && !currentHost.includes('devtunnels.ms')) {
      console.log(`🌐 Direct network IP access detected: ${currentHost}`);
      return currentHost;
    }
    
    // Method 2: Check for common network IP patterns in the URL
    const currentUrl = window.location.href;
    const networkIPPattern = /(?:http|ws)s?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)/;
    const match = currentUrl.match(networkIPPattern);
    if (match) {
      console.log(`🌐 Network IP pattern detected in URL: ${match[1]}`);
      return match[1];
    }
    
    // Method 3: Check if we're accessing from a different machine by looking at the port
    const currentPort = window.location.port;
    if (currentPort === '5173' || currentPort === '3000') {
      // This suggests we might be accessing from another machine
      // Try to detect the actual network IP from the current URL
      const url = new URL(currentUrl);
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        console.log(`🌐 Network IP detected from URL: ${url.hostname}`);
        return url.hostname;
      }
    }
    
    // Method 4: Check for environment variable override
    const envNetworkIP = import.meta.env.VITE_NETWORK_IP;
    if (envNetworkIP) {
      console.log(`🌐 Network IP from environment variable: ${envNetworkIP}`);
      return envNetworkIP;
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ Could not detect network IP:', error);
    return null;
  }
};

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

  // PRIORITY 4: Network IP (cross-laptop) - ENHANCED
  if (
    currentHost !== 'localhost' &&
    currentHost !== '127.0.0.1' &&
    currentHost !== '0.0.0.0' &&
    !currentHost.includes('devtunnels.ms')
  ) {
    console.log(`🌐 Network access detected - using hostname: ${currentHost}`);
    // For cross-laptop testing, always use the same IP for backend
    // The backend should be running on the same machine as the frontend
    return `http://${currentHost}:3000`;
  }

  // PRIORITY 4.5: Force network IP detection for cross-laptop testing
  // This is a fallback for when the hostname detection fails
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    // Check if we're accessing from a different machine by looking at the port
    const currentPort = window.location.port;
    if (currentPort === '5173' || currentPort === '3000') {
      // Try to detect the actual network IP
      const networkIP = detectNetworkIP();
      if (networkIP) {
        console.log(`🌐 Cross-laptop access detected via port ${currentPort}, using network IP: ${networkIP}`);
        return `http://${networkIP}:3000`;
      }
    }
  }

  // PRIORITY 5: Development - only for actual development
  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }

  // FALLBACK: Production backend for any other case
  return 'https://bus-tracking-backend-sxh8.onrender.com';
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

  // PRIORITY 4: Network IP (cross-laptop) - ENHANCED
  if (
    currentHost !== 'localhost' &&
    currentHost !== '127.0.0.1' &&
    currentHost !== '0.0.0.0' &&
    !currentHost.includes('devtunnels.ms')
  ) {
    console.log(`🌐 Network WebSocket access detected - using hostname: ${currentHost}`);
    // For cross-laptop testing, WebSocket should connect to the same IP as the backend
    return `ws://${currentHost}:3000`;
  }

  // PRIORITY 4.5: Force network IP detection for cross-laptop testing
  // This is a fallback for when the hostname detection fails
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    // Check if we're accessing from a different machine by looking at the port
    const currentPort = window.location.port;
    if (currentPort === '5173' || currentPort === '3000') {
      // Try to detect the actual network IP
      const networkIP = detectNetworkIP();
      if (networkIP) {
        console.log(`🌐 Cross-laptop WebSocket access detected via port ${currentPort}, using network IP: ${networkIP}`);
        return `ws://${networkIP}:3000`;
      }
    }
  }

  // PRIORITY 5: Development - only for actual development
  if (import.meta.env.DEV) {
    // Firefox WebSocket workaround: use 127.0.0.1 instead of localhost
    try {
      const isFirefox = typeof navigator !== 'undefined' && 
                       navigator.userAgent && 
                       navigator.userAgent.includes('Firefox');
      
      if (isFirefox) {
        console.log('🦊 Firefox detected, using 127.0.0.1 for WebSocket connection');
        return 'ws://127.0.0.1:3000';
      }
      console.log('🌐 Non-Firefox browser, using localhost for WebSocket connection');
      return 'ws://localhost:3000';
    } catch (error) {
      console.log('⚠️ Could not detect browser type, using localhost as fallback');
      return 'ws://localhost:3000';
    }
  }

  // FALLBACK: Production backend for any other case
  return 'wss://bus-tracking-backend-sxh8.onrender.com';
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
  
  // Additional debugging for cross-laptop testing
  console.log('🌐 Cross-Laptop Debug Info:', {
    hostname: window.location.hostname,
    isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    detectedApiUrl: environment.api.url,
    detectedWsUrl: environment.api.websocketUrl,
    shouldUseNetworkIP: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  });
}

export default environment;
