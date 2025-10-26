#!/usr/bin/env node

/**
 * 🔍 ENVIRONMENT VALIDATION SCRIPT
 * Validates that all required environment variables are properly set
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Required environment variables
const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

// Optional but recommended environment variables
const RECOMMENDED_VARS = [
  'VITE_API_URL',
  'VITE_WEBSOCKET_URL',
  'VITE_ADMIN_EMAILS',
  'VITE_DEBUG_LOGS',
];

// Environment file paths to check
const ENV_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
];

function validateEnvironment() {
  console.log('🔍 Validating environment configuration...\n');

  let hasErrors = false;
  let hasWarnings = false;

  // Check if any environment files exist
  const existingEnvFiles = ENV_FILES.filter(file => {
    const filePath = path.join(projectRoot, file);
    return fs.existsSync(filePath);
  });

  if (existingEnvFiles.length === 0) {
    console.error('❌ No environment files found!');
    console.error('💡 Please create at least one of the following files:');
    ENV_FILES.forEach(file => console.error(`   - ${file}`));
    hasErrors = true;
  } else {
    console.log('✅ Found environment files:', existingEnvFiles.join(', '));
  }

  // Load environment variables from files
  const envVars = {};
  
  existingEnvFiles.forEach(file => {
    const filePath = path.join(projectRoot, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
    } catch (error) {
      console.warn(`⚠️ Could not read ${file}:`, error.message);
    }
  });

  // Check required variables
  console.log('\n🔍 Checking required environment variables:');
  REQUIRED_VARS.forEach(varName => {
    const value = envVars[varName];
    if (!value || value === '' || value.includes('your_') || value.includes('example')) {
      console.error(`❌ ${varName}: Missing or contains placeholder value`);
      hasErrors = true;
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  });

  // Check recommended variables
  console.log('\n🔍 Checking recommended environment variables:');
  RECOMMENDED_VARS.forEach(varName => {
    const value = envVars[varName];
    if (!value || value === '' || value.includes('your_') || value.includes('example')) {
      console.warn(`⚠️ ${varName}: Not set or contains placeholder value`);
      hasWarnings = true;
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  });

  // Check for common issues
  console.log('\n🔍 Checking for common configuration issues:');
  
  // Check Supabase URL format
  const supabaseUrl = envVars['VITE_SUPABASE_URL'];
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.error('❌ VITE_SUPABASE_URL should start with https://');
    hasErrors = true;
  }

  // Check API URL format
  const apiUrl = envVars['VITE_API_URL'];
  if (apiUrl && !apiUrl.startsWith('http')) {
    console.error('❌ VITE_API_URL should start with http:// or https://');
    hasErrors = true;
  }

  // Check WebSocket URL format
  const wsUrl = envVars['VITE_WEBSOCKET_URL'];
  if (wsUrl && !wsUrl.startsWith('ws')) {
    console.error('❌ VITE_WEBSOCKET_URL should start with ws:// or wss://');
    hasErrors = true;
  }

  // Summary
  console.log('\n📊 Validation Summary:');
  if (hasErrors) {
    console.error('❌ Environment validation failed!');
    console.error('💡 Please fix the errors above before continuing.');
    process.exit(1);
  } else if (hasWarnings) {
    console.warn('⚠️ Environment validation passed with warnings.');
    console.warn('💡 Consider setting the recommended variables for better functionality.');
  } else {
    console.log('✅ Environment validation passed!');
  }

  console.log('\n🔧 Environment files found:', existingEnvFiles.length);
  console.log('📝 Total environment variables loaded:', Object.keys(envVars).length);
}

// Run validation
validateEnvironment();
