#!/usr/bin/env node

/**
 * 🔧 CONFIGURATION VALIDATION SCRIPT
 * Validates frontend configuration and environment setup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const checkFile = (filePath, description) => {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description}`, 'red');
    return false;
  }
};

const checkEnvironmentFile = (filePath, description) => {
  if (!fs.existsSync(filePath)) {
    log(`❌ ${description}`, 'red');
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const envVars = lines.filter(line => line.trim() && !line.startsWith('#'));
  
  log(`✅ ${description} (${envVars.length} variables)`, 'green');
  
  // Check for critical variables
  const criticalVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingVars = criticalVars.filter(varName => 
    !envVars.some(line => line.startsWith(varName))
  );
  
  if (missingVars.length > 0) {
    log(`⚠️  Missing critical variables: ${missingVars.join(', ')}`, 'yellow');
  }
  
  return true;
};

const validateConfiguration = () => {
  log('\n🔧 FRONTEND CONFIGURATION VALIDATION', 'cyan');
  log('=====================================', 'cyan');
  
  let allValid = true;
  
  // Check configuration files
  log('\n📁 Configuration Files:', 'blue');
  allValid &= checkFile('src/config/environment.ts', 'Environment configuration');
  allValid &= checkFile('src/config/supabase.ts', 'Supabase configuration');
  allValid &= checkFile('src/config/index.ts', 'Configuration index');
  
  // Check environment files
  log('\n🌍 Environment Files:', 'blue');
  allValid &= checkEnvironmentFile('env.local', 'Development environment');
  allValid &= checkEnvironmentFile('env.template', 'Production template');
  
  // Check for deprecated files
  log('\n🗑️  Deprecated Files Check:', 'blue');
  const deprecatedFiles = [
    'src/config/production.ts',
    'src/config/ConfigManager.ts',
  ];
  
  let hasDeprecated = false;
  deprecatedFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`❌ Found deprecated file: ${file}`, 'red');
      hasDeprecated = true;
    }
  });
  
  if (!hasDeprecated) {
    log('✅ No deprecated configuration files found', 'green');
  }
  
  // Check package.json
  log('\n📦 Package Configuration:', 'blue');
  if (checkFile('package.json', 'Package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Check for required dependencies
    const requiredDeps = ['@supabase/supabase-js', 'react', 'vite'];
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies?.[dep]);
    
    if (missingDeps.length > 0) {
      log(`⚠️  Missing dependencies: ${missingDeps.join(', ')}`, 'yellow');
    } else {
      log('✅ All required dependencies present', 'green');
    }
  }
  
  // Check TypeScript configuration
  log('\n🔧 TypeScript Configuration:', 'blue');
  allValid &= checkFile('tsconfig.json', 'TypeScript configuration');
  allValid &= checkFile('vite.config.js', 'Vite configuration');
  
  // Summary
  log('\n📊 VALIDATION SUMMARY', 'cyan');
  log('=====================', 'cyan');
  
  if (allValid && !hasDeprecated) {
    log('✅ Configuration validation PASSED', 'green');
    log('🚀 Your frontend configuration is ready for development and production!', 'green');
  } else {
    log('❌ Configuration validation FAILED', 'red');
    log('🔧 Please fix the issues above before proceeding', 'red');
  }
  
  return allValid && !hasDeprecated;
};

// Run validation
const isValid = validateConfiguration();
process.exit(isValid ? 0 : 1);

export { validateConfiguration };
