/**
 * 🚀 UNIFIED FRONTEND CONFIGURATION SYSTEM
 * Single source of truth for all frontend configuration
 * This file now serves as the main configuration entry point
 */

// Re-export the unified configuration from environment.ts
export { 
  environment as config, 
  type AppConfig,
  checkConfigurationHealth,
  configUtils
} from './environment';

// Legacy exports for backward compatibility
export { environment } from './environment';

// Default export for backward compatibility
export { default } from './environment';
