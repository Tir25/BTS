/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase Configuration
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  
  // API Configuration
  readonly VITE_API_URL?: string;
  readonly VITE_WEBSOCKET_URL?: string;
  readonly VITE_API_TIMEOUT?: string;
  readonly VITE_API_RETRY_ATTEMPTS?: string;
  
  // Map Configuration
  readonly VITE_MAP_DEFAULT_ZOOM?: string;
  readonly VITE_MAP_MAX_ZOOM?: string;
  readonly VITE_MAP_MIN_ZOOM?: string;
  readonly VITE_MAPLIBRE_TOKEN?: string;
  
  // Feature Flags
  readonly VITE_ENABLE_CLUSTERING?: string;
  readonly VITE_ENABLE_HEATMAP?: string;
  readonly VITE_ENABLE_OFFLINE_MODE?: string;
  readonly VITE_ENABLE_PUSH_NOTIFICATIONS?: string;
  readonly VITE_ENABLE_PERFORMANCE_MONITORING?: string;
  
  // Performance Configuration
  readonly VITE_SLOW_RENDER_THRESHOLD?: string;
  readonly VITE_MAX_RENDER_COUNT?: string;
  readonly VITE_LOCATION_UPDATE_INTERVAL?: string;
  readonly VITE_MAP_UPDATE_THROTTLE?: string;
  readonly VITE_MAX_CONCURRENT_REQUESTS?: string;
  readonly VITE_REQUEST_TIMEOUT?: string;
  
  // WebSocket Configuration
  readonly VITE_WS_CONNECTION_TIMEOUT?: string;
  readonly VITE_WS_HEARTBEAT_INTERVAL?: string;
  readonly VITE_WS_MAX_RECONNECT_ATTEMPTS?: string;
  readonly VITE_WS_RECONNECT_DELAY?: string;
  readonly VITE_WS_MAX_RECONNECT_DELAY?: string;
  
  // Authentication Configuration
  readonly VITE_SESSION_TIMEOUT?: string;
  readonly VITE_TOKEN_REFRESH_THRESHOLD?: string;
  readonly VITE_MAX_TOKEN_REFRESH_ATTEMPTS?: string;
  
  // Error Handling Configuration
  readonly VITE_MAX_RETRY_ATTEMPTS?: string;
  readonly VITE_RETRY_DELAY?: string;
  readonly VITE_EXPONENTIAL_BACKOFF?: string;
  
  // Admin Configuration
  readonly VITE_ADMIN_EMAILS?: string;
  
  // Development Configuration
  readonly VITE_DEV_MODE?: string;
  readonly VITE_DEBUG_LOGS?: string;
  
  // Build Configuration
  readonly VITE_BUILD_MODE?: string;
  
  // Analytics & Monitoring
  readonly VITE_GA_TRACKING_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
  
  // Security Configuration
  readonly VITE_CSP_NONCE?: string;
  
  // Environment Detection
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
