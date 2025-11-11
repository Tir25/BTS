/**
 * 🚀 UNIFIED ENVIRONMENT CONFIGURATION SYSTEM
 * Single source of truth for all frontend environment configuration
 * Replaces all deprecated configuration files
 */

import { logger } from '../utils/logger';

// Environment detection utilities
const isDevelopment = () => import.meta.env.DEV;
const isProduction = () => import.meta.env.PROD;

// Smart API URL detection for cross-laptop testing and VS Code tunnels
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];

/**
 * Normalize URL by removing trailing slashes and fixing localhost references
 */
const normalizeUrl = (url: string): string => {
  // Remove trailing slashes
  return url.replace(/\/+$/, '');
};

const replaceLocalhostWithCurrentHost = (value: string, fallbackPort = '3000') => {
  try {
    const parsed = new URL(value);
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;

    if (LOCAL_HOSTNAMES.includes(parsed.hostname) && currentHost && !LOCAL_HOSTNAMES.includes(currentHost)) {
      // Preserve explicit port if supplied, otherwise fall back to backend default
      const port = parsed.port || fallbackPort;
      parsed.hostname = currentHost;
      parsed.port = port;
      // Align protocol with current page when original value was http(s)://localhost
      if (parsed.protocol.startsWith('http')) {
        parsed.protocol = currentProtocol;
      }
      // Remove trailing slash from pathname
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
      return normalizeUrl(parsed.toString());
    }
  } catch (error) {
    logger.warn('Failed to normalize API/WebSocket URL', 'environment', {
      original: value,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return normalizeUrl(value);
};

const getApiUrl = () => {
  let url: string;
  
  // PRIORITY 1: Environment variable override (for deployment)
  if (import.meta.env.VITE_API_URL) {
    url = replaceLocalhostWithCurrentHost(import.meta.env.VITE_API_URL);
    return normalizeUrl(url);
  }

  // PRIORITY 2: Production domains
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol;

  if (
    currentHost.includes('render.com') ||
    currentHost.includes('vercel.app') ||
    currentHost.includes('vercel.com')
  ) {
    return normalizeUrl('https://bus-tracking-backend-sxh8.onrender.com');
  }

  // PRIORITY 3: VS Code tunnels
  if (currentHost.includes('devtunnels.ms')) {
    const tunnelId = currentHost.split('.')[0];
    url = `${currentProtocol}//${tunnelId}-3000.inc1.devtunnels.ms`;
    return normalizeUrl(url);
  }

  // PRIORITY 4: Network IP (cross-laptop)
  if (
    currentHost !== 'localhost' &&
    currentHost !== '127.0.0.1' &&
    currentHost !== '0.0.0.0'
  ) {
    return normalizeUrl(`http://${currentHost}:3000`);
  }

  // PRIORITY 5: Development
  if (isDevelopment()) {
    return normalizeUrl('http://localhost:3000');
  }

  // FALLBACK: Production backend
  return normalizeUrl('https://bus-tracking-backend-sxh8.onrender.com');
};

const getWebSocketUrl = () => {
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol;

  // PRIORITY 1: Environment variable override
  if (import.meta.env.VITE_WEBSOCKET_URL) {
    let normalized = replaceLocalhostWithCurrentHost(import.meta.env.VITE_WEBSOCKET_URL, '3000');

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      normalized = normalized.replace(
        /^http(s)?:/,
        currentProtocol === 'https:' ? 'wss:' : 'ws:'
      );
    }

    return normalizeUrl(normalized);
  }

  // Determine WebSocket protocol based on page protocol
  // HTTPS pages require WSS (secure WebSocket) due to mixed content restrictions
  const wsProtocol = currentProtocol === 'https:' ? 'wss:' : 'ws:';

  if (
    currentHost.includes('render.com') ||
    currentHost.includes('vercel.app') ||
    currentHost.includes('vercel.com')
  ) {
    return normalizeUrl('wss://bus-tracking-backend-sxh8.onrender.com');
  }

  if (currentHost.includes('devtunnels.ms')) {
    const tunnelId = currentHost.split('.')[0];
    const url = `${currentProtocol === 'https:' ? 'wss:' : 'ws:'}//${tunnelId}-3000.inc1.devtunnels.ms`;
    return normalizeUrl(url);
  }

  // MOBILE FIX: Use secure WebSocket (wss://) when page is served over HTTPS
  // This prevents mixed content errors on mobile browsers
  if (
    currentHost !== 'localhost' &&
    currentHost !== '127.0.0.1' &&
    currentHost !== '0.0.0.0'
  ) {
    // Use wss:// for HTTPS pages, ws:// for HTTP pages
    return normalizeUrl(`${wsProtocol}//${currentHost}:3000`);
  }

  if (isDevelopment()) {
    return normalizeUrl('ws://localhost:3000');
  }

  return normalizeUrl('wss://bus-tracking-backend-sxh8.onrender.com');
};

// Supabase configuration with validation (Legacy)
const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || url === 'your_supabase_project_url' || url === '') {
    if (isDevelopment()) {
      logger.warn('VITE_SUPABASE_URL not set. Please set it in your environment variables.', 'environment');
      return { url: null, anonKey: null };
    }
    throw new Error('VITE_SUPABASE_URL is required in production.');
  }

  if (!anonKey || anonKey === 'your_supabase_anon_key_here' || anonKey === '') {
    if (isDevelopment()) {
      logger.warn('VITE_SUPABASE_ANON_KEY not set. Please set it in your environment variables.', 'environment');
      return { url, anonKey: null };
    }
    throw new Error('VITE_SUPABASE_ANON_KEY is required in production.');
  }

  return { url, anonKey };
};

// Get driver Supabase configuration
const getDriverSupabaseConfig = () => {
  const url = import.meta.env.VITE_DRIVER_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_DRIVER_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || url === 'your_supabase_project_url' || url === '') {
    if (isDevelopment()) {
      logger.warn('VITE_DRIVER_SUPABASE_URL not set. Falling back to legacy config.', 'environment');
      return { url: null, anonKey: null };
    }
    // In production, allow fallback to legacy config
    return { url: null, anonKey: null };
  }

  if (!anonKey || anonKey === 'your_supabase_anon_key_here' || anonKey === '') {
    if (isDevelopment()) {
      logger.warn('VITE_DRIVER_SUPABASE_ANON_KEY not set. Falling back to legacy config.', 'environment');
      return { url, anonKey: null };
    }
    return { url, anonKey: null };
  }

  return { url, anonKey };
};

// Get student Supabase configuration
const getStudentSupabaseConfig = () => {
  const url = import.meta.env.VITE_STUDENT_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_STUDENT_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || url === 'your_supabase_project_url' || url === '') {
    if (isDevelopment()) {
      logger.warn('VITE_STUDENT_SUPABASE_URL not set. Falling back to legacy config.', 'environment');
      return { url: null, anonKey: null };
    }
    // In production, allow fallback to legacy config
    return { url: null, anonKey: null };
  }

  if (!anonKey || anonKey === 'your_supabase_anon_key_here' || anonKey === '') {
    if (isDevelopment()) {
      logger.warn('VITE_STUDENT_SUPABASE_ANON_KEY not set. Falling back to legacy config.', 'environment');
      return { url, anonKey: null };
    }
    return { url, anonKey: null };
  }

  return { url, anonKey };
};

// Unified configuration interface
export interface AppConfig {
  // Environment
  isDevelopment: boolean;
  isProduction: boolean;
  
  // API Configuration
  api: {
    baseUrl: string;
    websocketUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  
  // Supabase Configuration (Legacy)
  supabase: {
    url: string | null;
    anonKey: string | null;
  };
  // Role-based Supabase configurations
  supabaseDriver: {
    url: string | null;
    anonKey: string | null;
  };
  supabaseStudent: {
    url: string | null;
    anonKey: string | null;
  };
  
  // Map Configuration
  map: {
    defaultCenter: [number, number];
    defaultZoom: number;
    maxZoom: number;
    minZoom: number;
  };
  
  // Features
  features: {
    enableClustering: boolean;
    enableHeatmap: boolean;
    enableOfflineMode: boolean;
    enablePushNotifications: boolean;
    enableRealTimeTracking: boolean;
    enableLocationHistory: boolean;
    enableRouteOptimization: boolean;
    enableDebugLogs: boolean;
  };
  
  // Performance
  performance: {
    enablePerformanceMonitoring: boolean;
    slowRenderThreshold: number;
    maxRenderCount: number;
    locationUpdateInterval: number;
    mapUpdateThrottle: number;
    maxConcurrentRequests: number;
    requestTimeout: number;
  };
  
  // WebSocket
  websocket: {
    connectionTimeout: number;
    heartbeatInterval: number;
    maxReconnectAttempts: number;
    reconnectDelay: number;
    maxReconnectDelay: number;
  };
  
  // Authentication
  auth: {
    sessionTimeout: number;
    tokenRefreshThreshold: number;
    maxTokenRefreshAttempts: number;
  };
  
  // Error Handling
  errorHandling: {
    maxRetryAttempts: number;
    retryDelay: number;
    exponentialBackoff: boolean;
    logErrorsToConsole: boolean;
  };
}

// Configuration validation
const validateConfig = (config: AppConfig): void => {
  // Validate API URLs
  if (!config.api.baseUrl || config.api.baseUrl === '') {
    throw new Error('API base URL is required');
  }
  
  // Validate WebSocket URL
  if (!config.api.websocketUrl || config.api.websocketUrl === '') {
    throw new Error('WebSocket URL is required');
  }
  
  // Validate timeout values
  if (config.api.timeout <= 0) {
    throw new Error('API timeout must be greater than 0');
  }
  
  // Validate retry attempts
  if (config.api.retryAttempts < 0) {
    throw new Error('API retry attempts must be non-negative');
  }
  
  // Validate map configuration
  if (config.map.defaultZoom < config.map.minZoom || config.map.defaultZoom > config.map.maxZoom) {
    throw new Error('Default zoom must be between min and max zoom');
  }
  
  // Validate performance settings
  if (config.performance.slowRenderThreshold <= 0) {
    throw new Error('Slow render threshold must be greater than 0');
  }
  
  if (config.performance.maxRenderCount <= 0) {
    throw new Error('Max render count must be greater than 0');
  }
  
  // Validate WebSocket settings
  if (config.websocket.connectionTimeout <= 0) {
    throw new Error('WebSocket connection timeout must be greater than 0');
  }
  
  if (config.websocket.maxReconnectAttempts < 0) {
    throw new Error('WebSocket max reconnect attempts must be non-negative');
  }
  
  // Validate authentication settings
  if (config.auth.sessionTimeout <= 0) {
    throw new Error('Session timeout must be greater than 0');
  }
  
  if (config.auth.tokenRefreshThreshold <= 0) {
    throw new Error('Token refresh threshold must be greater than 0');
  }
  
  // Validate error handling settings
  if (config.errorHandling.maxRetryAttempts < 0) {
    throw new Error('Max retry attempts must be non-negative');
  }
  
  if (config.errorHandling.retryDelay <= 0) {
    throw new Error('Retry delay must be greater than 0');
  }
};

// Create unified configuration
const createConfig = (): AppConfig => {
  const supabaseConfig = getSupabaseConfig();
  const driverSupabaseConfig = getDriverSupabaseConfig();
  const studentSupabaseConfig = getStudentSupabaseConfig();
  
  const config: AppConfig = {
    // Environment
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    
    // API Configuration
    api: {
      baseUrl: getApiUrl(),
      websocketUrl: getWebSocketUrl(),
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
      retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3'),
    },
    
    // Supabase Configuration (Legacy)
    supabase: supabaseConfig,
    // Role-based Supabase configurations
    supabaseDriver: driverSupabaseConfig,
    supabaseStudent: studentSupabaseConfig,
    
    // Map Configuration
    map: {
      defaultCenter: [72.8777, 23.0225], // Ahmedabad coordinates
      defaultZoom: parseInt(import.meta.env.VITE_MAP_DEFAULT_ZOOM || '12'),
      maxZoom: parseInt(import.meta.env.VITE_MAP_MAX_ZOOM || '18'),
      minZoom: parseInt(import.meta.env.VITE_MAP_MIN_ZOOM || '8'),
    },
    
    // Features
    features: {
      enableClustering: import.meta.env.VITE_ENABLE_CLUSTERING !== 'false',
      enableHeatmap: import.meta.env.VITE_ENABLE_HEATMAP === 'true',
      enableOfflineMode: import.meta.env.VITE_ENABLE_OFFLINE_MODE === 'true',
      enablePushNotifications: import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS === 'true',
      enableRealTimeTracking: true,
      enableLocationHistory: true,
      enableRouteOptimization: true,
      enableDebugLogs: isDevelopment(),
    },
    
    // Performance
    performance: {
      enablePerformanceMonitoring: isDevelopment() || import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
      slowRenderThreshold: parseInt(import.meta.env.VITE_SLOW_RENDER_THRESHOLD || '16'),
      maxRenderCount: parseInt(import.meta.env.VITE_MAX_RENDER_COUNT || '100'),
      locationUpdateInterval: parseInt(import.meta.env.VITE_LOCATION_UPDATE_INTERVAL || '5000'),
      mapUpdateThrottle: parseInt(import.meta.env.VITE_MAP_UPDATE_THROTTLE || '1000'),
      maxConcurrentRequests: parseInt(import.meta.env.VITE_MAX_CONCURRENT_REQUESTS || '5'),
      requestTimeout: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '10000'),
    },
    
    // WebSocket
    websocket: {
      connectionTimeout: parseInt(import.meta.env.VITE_WS_CONNECTION_TIMEOUT || '30000'),
      heartbeatInterval: parseInt(import.meta.env.VITE_WS_HEARTBEAT_INTERVAL || '30000'),
      maxReconnectAttempts: parseInt(import.meta.env.VITE_WS_MAX_RECONNECT_ATTEMPTS || '10'),
      reconnectDelay: parseInt(import.meta.env.VITE_WS_RECONNECT_DELAY || '1000'),
      maxReconnectDelay: parseInt(import.meta.env.VITE_WS_MAX_RECONNECT_DELAY || '30000'),
    },
    
    // Authentication
    auth: {
      sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '86400000'), // 24 hours
      tokenRefreshThreshold: parseInt(import.meta.env.VITE_TOKEN_REFRESH_THRESHOLD || '300000'), // 5 minutes
      maxTokenRefreshAttempts: parseInt(import.meta.env.VITE_MAX_TOKEN_REFRESH_ATTEMPTS || '3'),
    },
    
    // Error Handling
    errorHandling: {
      maxRetryAttempts: parseInt(import.meta.env.VITE_MAX_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(import.meta.env.VITE_RETRY_DELAY || '1000'),
      exponentialBackoff: import.meta.env.VITE_EXPONENTIAL_BACKOFF !== 'false',
      logErrorsToConsole: isDevelopment(),
    },
  };
  
  // Validate the configuration
  validateConfig(config);
  
  return config;
};

// Create and export the configuration with error handling
let environment: AppConfig;
try {
  environment = createConfig();
} catch (error) {
  logger.error('Configuration validation failed', 'environment', { error: String(error) });
  
  // Create a minimal fallback configuration for development
  if (import.meta.env.DEV) {
    logger.warn('Creating fallback configuration for development...', 'environment');
    environment = {
      isDevelopment: true,
      isProduction: false,
      api: {
        baseUrl: 'http://localhost:3000',
        websocketUrl: 'ws://localhost:3000',
        timeout: 10000,
        retryAttempts: 3,
      },
    supabase: {
      url: null,
      anonKey: null,
    },
    supabaseDriver: {
      url: null,
      anonKey: null,
    },
    supabaseStudent: {
      url: null,
      anonKey: null,
    },
      map: {
        defaultCenter: [72.8777, 23.0225],
        defaultZoom: 12,
        maxZoom: 18,
        minZoom: 8,
      },
      features: {
        enableClustering: true,
        enableHeatmap: false,
        enableOfflineMode: false,
        enablePushNotifications: false,
        enableRealTimeTracking: true,
        enableLocationHistory: true,
        enableRouteOptimization: true,
        enableDebugLogs: true,
      },
      performance: {
        enablePerformanceMonitoring: true,
        slowRenderThreshold: 16,
        maxRenderCount: 100,
        locationUpdateInterval: 5000,
        mapUpdateThrottle: 1000,
        maxConcurrentRequests: 5,
        requestTimeout: 10000,
      },
      websocket: {
        connectionTimeout: 30000,
        heartbeatInterval: 30000,
        maxReconnectAttempts: 10,
        reconnectDelay: 1000,
        maxReconnectDelay: 30000,
      },
      auth: {
        sessionTimeout: 86400000,
        tokenRefreshThreshold: 300000,
        maxTokenRefreshAttempts: 3,
      },
      errorHandling: {
        maxRetryAttempts: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
        logErrorsToConsole: true,
      },
    };
  } else {
    throw error;
  }
}

// Log configuration status in development
if (environment.isDevelopment) {
  logger.info('Frontend Configuration', 'environment', {
    environment: environment.isDevelopment ? 'Development' : 'Production',
    supabaseUrl: environment.supabase.url ? '✅ Set' : '❌ Missing',
    supabaseKey: environment.supabase.anonKey ? '✅ Set' : '❌ Missing',
    apiUrl: environment.api.baseUrl,
    websocketUrl: environment.api.websocketUrl,
    currentHost: window.location.hostname,
    currentProtocol: window.location.protocol,
    features: {
      clustering: environment.features.enableClustering,
      heatmap: environment.features.enableHeatmap,
      offlineMode: environment.features.enableOfflineMode,
      debugLogs: environment.features.enableDebugLogs,
    },
  });
  
  // Log configuration status
  const hasDriverConfig = !!(environment.supabaseDriver.url && environment.supabaseDriver.anonKey);
  const hasStudentConfig = !!(environment.supabaseStudent.url && environment.supabaseStudent.anonKey);
  const hasLegacyConfig = !!(environment.supabase.url && environment.supabase.anonKey);

  if (hasDriverConfig || hasStudentConfig) {
    logger.info('✅ Using role-based Supabase configurations', 'environment');
    if (hasDriverConfig) logger.info('  - Driver: ✅ Configured', 'environment');
    if (hasStudentConfig) logger.info('  - Student: ✅ Configured', 'environment');
    if (hasLegacyConfig) logger.warn('  - Legacy: ⚠️ Fallback available', 'environment');
  } else if (hasLegacyConfig) {
    logger.warn('⚠️ Using legacy Supabase configuration. Consider migrating to role-based configs.', 'environment');
    logger.warn('Please check your .env.local file and ensure VITE_DRIVER_SUPABASE_URL and VITE_STUDENT_SUPABASE_URL are set.', 'environment');
  } else {
    logger.warn('⚠️ Supabase configuration missing. Some features may not work properly.', 'environment');
    logger.warn('Please check your .env.local file and ensure Supabase environment variables are set.', 'environment');
  }
} else {
  // Production: Only log critical errors
  const hasDriverConfig = !!(environment.supabaseDriver.url && environment.supabaseDriver.anonKey);
  const hasStudentConfig = !!(environment.supabaseStudent.url && environment.supabaseStudent.anonKey);
  const hasLegacyConfig = !!(environment.supabase.url && environment.supabase.anonKey);

  if (!hasDriverConfig && !hasStudentConfig && !hasLegacyConfig) {
    logger.error('Critical: Supabase configuration missing in production', 'environment');
  }
}

// Configuration health check utility
export const checkConfigurationHealth = (): {
  isHealthy: boolean;
  issues: string[];
  warnings: string[];
} => {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check critical configuration
  if (!environment.api.baseUrl) {
    issues.push('API base URL is missing');
  }
  
  if (!environment.api.websocketUrl) {
    issues.push('WebSocket URL is missing');
  }
  
  // Check Supabase configuration
  const hasDriverConfig = !!(environment.supabaseDriver.url && environment.supabaseDriver.anonKey);
  const hasStudentConfig = !!(environment.supabaseStudent.url && environment.supabaseStudent.anonKey);
  const hasLegacyConfig = !!(environment.supabase.url && environment.supabase.anonKey);

  if (!hasDriverConfig && !hasLegacyConfig) {
    warnings.push('Driver Supabase configuration is missing - driver features may not work');
  }

  if (!hasStudentConfig && !hasLegacyConfig) {
    warnings.push('Student Supabase configuration is missing - student features may not work');
  }

  if (!hasDriverConfig && !hasStudentConfig && !hasLegacyConfig) {
    issues.push('No Supabase configuration found - authentication will not work');
  }
  
  // Check performance settings
  if (environment.performance.slowRenderThreshold < 16) {
    warnings.push('Slow render threshold is very low - may cause performance issues');
  }
  
  if (environment.performance.maxRenderCount > 200) {
    warnings.push('Max render count is very high - may cause memory issues');
  }
  
  // Check WebSocket settings
  if (environment.websocket.connectionTimeout < 10000) {
    warnings.push('WebSocket connection timeout is very low - may cause connection issues');
  }
  
  // Check authentication settings
  if (environment.auth.sessionTimeout < 3600000) { // 1 hour
    warnings.push('Session timeout is very short - users may be logged out frequently');
  }
  
  return {
    isHealthy: issues.length === 0,
    issues,
    warnings,
  };
};

// Export configuration utilities
export const configUtils = {
  checkHealth: checkConfigurationHealth,
  validate: validateConfig,
  isProduction: () => environment.isProduction,
  isDevelopment: () => environment.isDevelopment,
  getApiUrl: () => environment.api.baseUrl,
  getWebSocketUrl: () => environment.api.websocketUrl,
  getSupabaseConfig: () => environment.supabase,
};

// Named export for backward compatibility
export { environment };

export default environment;
