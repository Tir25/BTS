/**
 * Server Configuration
 * Centralized server configuration constants and settings
 */

export const SERVER_CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  DEMO_MODE: process.env.DEMO_MODE === 'true',
  
  // Memory thresholds (in bytes)
  MEMORY_WARNING_THRESHOLD: 300 * 1024 * 1024, // 300MB
  MEMORY_CRITICAL_THRESHOLD: 350 * 1024 * 1024, // 350MB
  MEMORY_EMERGENCY_THRESHOLD: 400 * 1024 * 1024, // 400MB
  
  // Memory monitoring interval (in milliseconds)
  MEMORY_CHECK_INTERVAL: 2 * 60 * 1000, // 2 minutes
  
  // Request size limits
  MAX_REQUEST_SIZE: '10mb',
  MAX_BODY_SIZE: 50 * 1024 * 1024, // 50MB
} as const;

