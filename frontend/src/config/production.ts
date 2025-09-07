// Production configuration for Vercel deployment
export const productionConfig = {
  // API Configuration
  api: {
    // These will be set via environment variables in Vercel
    baseUrl:
      process.env.VITE_API_URL ||
      'https://bus-tracking-backend-sxh8.onrender.com',
    websocketUrl:
      process.env.VITE_WEBSOCKET_URL ||
      'wss://bus-tracking-backend-sxh8.onrender.com',
  },

  // Supabase Configuration
  supabase: {
    url: process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  },

  // WebSocket Configuration
  websocket: {
    // Enhanced configuration for production
    connectionTimeout: 30000, // 30 seconds
    heartbeatInterval: 30000, // 30 seconds
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
  },

  // Authentication Configuration
  auth: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
    maxTokenRefreshAttempts: 3,
  },

  // Feature Flags
  features: {
    enableRealTimeTracking: true,
    enableLocationHistory: true,
    enableRouteOptimization: true,
    enableOfflineMode: false, // Disabled for production
    enableDebugLogs: false,
  },

  // Performance Configuration
  performance: {
    locationUpdateInterval: 5000, // 5 seconds
    mapUpdateThrottle: 1000, // 1 second
    maxConcurrentRequests: 5,
    requestTimeout: 10000, // 10 seconds
  },

  // Error Handling
  errorHandling: {
    maxRetryAttempts: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    logErrorsToConsole: true,
  },
};

// Environment detection
export const isProduction = () => {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('vercel.com') ||
      window.location.hostname.includes('render.com') ||
      window.location.hostname.includes('onrender.com'))
  );
};

export const isDevelopment = () => {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('devtunnels.ms'))
  );
};

// Dynamic configuration based on environment
export const getConfig = () => {
  if (isProduction()) {
    return {
      ...productionConfig,
      features: {
        ...productionConfig.features,
        enableDebugLogs: false,
      },
    };
  }

  if (isDevelopment()) {
    return {
      ...productionConfig,
      api: {
        baseUrl: 'https://bus-tracking-backend-sxh8.onrender.com',
        websocketUrl: 'wss://bus-tracking-backend-sxh8.onrender.com',
      },
      features: {
        ...productionConfig.features,
        enableDebugLogs: true,
      },
    };
  }

  // Fallback to production config
  return productionConfig;
};

export default getConfig();
