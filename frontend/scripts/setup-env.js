#!/usr/bin/env node

/**
 * 🚀 ENVIRONMENT SETUP SCRIPT
 * Helps set up environment configuration for different environments
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEnvironment() {
  console.log('🚀 Frontend Environment Setup\n');
  console.log('This script will help you set up environment configuration for your frontend application.\n');

  // Check if env.local already exists
  const envLocalPath = path.join(projectRoot, 'env.local');
  if (fs.existsSync(envLocalPath)) {
    const overwrite = await question('⚠️ env.local already exists. Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('❌ Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('📝 Please provide the following information:\n');

  // Get Supabase configuration
  console.log('🔐 Supabase Configuration:');
  const supabaseUrl = await question('Supabase URL (https://your-project.supabase.co): ');
  const supabaseKey = await question('Supabase Anon Key: ');

  // Get API configuration
  console.log('\n🌐 API Configuration:');
  const apiUrl = await question('API URL (leave empty for auto-detection): ');
  const wsUrl = await question('WebSocket URL (leave empty for auto-detection): ');

  // Get admin configuration
  console.log('\n👥 Admin Configuration:');
  const adminEmails = await question('Admin emails (comma-separated): ');

  // Get development preferences
  console.log('\n🔧 Development Configuration:');
  const debugLogs = await question('Enable debug logs? (Y/n): ');
  const devMode = await question('Enable development mode? (Y/n): ');

  // Create environment content
  const envContent = `# =============================================================================
# 🚀 DEVELOPMENT ENVIRONMENT CONFIGURATION
# University Bus Tracking System - Frontend
# Generated on ${new Date().toISOString()}
# =============================================================================

# =============================================================================
# 🌐 API CONFIGURATION
# =============================================================================

# Backend API URL (Development - auto-detected if not set)
${apiUrl ? `VITE_API_URL=${apiUrl}` : '# VITE_API_URL=http://localhost:3000'}
${wsUrl ? `VITE_WEBSOCKET_URL=${wsUrl}` : '# VITE_WEBSOCKET_URL=ws://localhost:3000'}

# =============================================================================
# 🔐 SUPABASE CONFIGURATION
# =============================================================================

VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseKey}

# =============================================================================
# 🗺️ MAP CONFIGURATION
# =============================================================================

# MapLibre Token (Optional - for enhanced map features)
# VITE_MAPLIBRE_TOKEN=

# =============================================================================
# 👥 ADMIN CONFIGURATION
# =============================================================================

VITE_ADMIN_EMAILS=${adminEmails}

# =============================================================================
# 🔧 DEVELOPMENT CONFIGURATION
# =============================================================================

# Development mode flag
VITE_DEV_MODE=${devMode.toLowerCase() === 'n' ? 'false' : 'true'}

# Debug logging
VITE_DEBUG_LOGS=${debugLogs.toLowerCase() === 'n' ? 'false' : 'true'}

# =============================================================================
# 📊 PERFORMANCE CONFIGURATION
# =============================================================================

# API timeout (milliseconds)
VITE_API_TIMEOUT=10000

# API retry attempts
VITE_API_RETRY_ATTEMPTS=3

# Map configuration
VITE_MAP_DEFAULT_ZOOM=12
VITE_MAP_MAX_ZOOM=18
VITE_MAP_MIN_ZOOM=8

# Feature flags
VITE_ENABLE_CLUSTERING=true
VITE_ENABLE_HEATMAP=false
VITE_ENABLE_OFFLINE_MODE=false
VITE_ENABLE_PUSH_NOTIFICATIONS=false
VITE_ENABLE_PERFORMANCE_MONITORING=true

# Performance thresholds
VITE_SLOW_RENDER_THRESHOLD=16
VITE_MAX_RENDER_COUNT=100
VITE_LOCATION_UPDATE_INTERVAL=5000
VITE_MAP_UPDATE_THROTTLE=1000
VITE_MAX_CONCURRENT_REQUESTS=5
VITE_REQUEST_TIMEOUT=10000

# WebSocket configuration
VITE_WS_CONNECTION_TIMEOUT=30000
VITE_WS_HEARTBEAT_INTERVAL=30000
VITE_WS_MAX_RECONNECT_ATTEMPTS=10
VITE_WS_RECONNECT_DELAY=1000
VITE_WS_MAX_RECONNECT_DELAY=30000

# Authentication configuration
VITE_SESSION_TIMEOUT=86400000
VITE_TOKEN_REFRESH_THRESHOLD=300000
VITE_MAX_TOKEN_REFRESH_ATTEMPTS=3

# Error handling configuration
VITE_MAX_RETRY_ATTEMPTS=3
VITE_RETRY_DELAY=1000
VITE_EXPONENTIAL_BACKOFF=true

# =============================================================================
# 🚨 DEVELOPMENT NOTES
# =============================================================================
# ✅ This is the development environment file
# ✅ API URLs will be auto-detected based on hostname
# ✅ Supabase configuration is set for development
# ✅ Admin emails configured for development access
# ✅ Debug features enabled for development
# ✅ All performance settings optimized for development
# =============================================================================
`;

  // Write the environment file
  try {
    fs.writeFileSync(envLocalPath, envContent);
    console.log('\n✅ Environment configuration created successfully!');
    console.log(`📁 File created: ${envLocalPath}`);
  } catch (error) {
    console.error('\n❌ Failed to create environment file:', error.message);
    rl.close();
    return;
  }

  // Validate the created configuration
  console.log('\n🔍 Validating created configuration...');
  try {
    const { execSync } = await import('child_process');
    execSync('node scripts/validate-env.js', { cwd: projectRoot, stdio: 'inherit' });
  } catch (error) {
    console.warn('\n⚠️ Environment validation failed, but file was created.');
    console.warn('💡 Please check the configuration manually.');
  }

  console.log('\n🎉 Environment setup complete!');
  console.log('💡 You can now run: npm run dev');
  
  rl.close();
}

// Run setup
setupEnvironment().catch(console.error);
