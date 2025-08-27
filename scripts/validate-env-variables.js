#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * 
 * This script validates environment variables across frontend and backend
 * to ensure they are properly configured and aligned for deployment.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue');
}

function logSection(message) {
  log(`\n${colors.bold}${colors.cyan}${message}${colors.reset}`);
}

// Configuration
const config = {
  frontend: {
    envFile: path.join(__dirname, '../frontend/env.local'),
    configFiles: [
      path.join(__dirname, '../frontend/src/config/environment.ts'),
      path.join(__dirname, '../frontend/src/config/production.ts')
    ]
  },
  backend: {
    envFile: path.join(__dirname, '../backend/env.local'),
    productionEnvFile: path.join(__dirname, '../backend/env.production'),
    configFiles: [
      path.join(__dirname, '../backend/src/config/environment.ts'),
      path.join(__dirname, '../backend/src/config/supabase.ts')
    ]
  },
  expectedUrls: {
    api: 'https://bus-tracking-backend-sxh8.onrender.com',
    websocket: 'wss://bus-tracking-backend-sxh8.onrender.com',
    supabase: 'https://gthwmwfwvhyriygpcdlr.supabase.co'
  }
};

// Validation functions
function validateUrl(url, name) {
  if (!url) {
    return { valid: false, error: `${name} URL is missing` };
  }
  
  try {
    new URL(url);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: `${name} URL is invalid: ${url}` };
  }
}

function validateSupabaseKey(key, name) {
  if (!key) {
    return { valid: false, error: `${name} is missing` };
  }
  
  if (key.length < 100) {
    return { valid: false, error: `${name} appears to be too short` };
  }
  
  if (!key.startsWith('eyJ')) {
    return { valid: false, error: `${name} doesn't appear to be a valid JWT token` };
  }
  
  return { valid: true };
}

function parseEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { exists: false, variables: {} };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const variables = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        variables[key.trim()] = value.trim();
      }
    });
    
    return { exists: true, variables };
  } catch (error) {
    return { exists: false, error: error.message, variables: {} };
  }
}

function extractEnvVarsFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { exists: false, variables: {} };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const variables = {};
    
    // Extract VITE_ variables from TypeScript files
    const viteMatches = content.match(/VITE_[A-Z_]+/g) || [];
    const envMatches = content.match(/process\.env\.([A-Z_]+)/g) || [];
    const importMatches = content.match(/import\.meta\.env\.([A-Z_]+)/g) || [];
    
    [...viteMatches, ...envMatches, ...importMatches].forEach(match => {
      const key = match.replace(/^(VITE_|process\.env\.|import\.meta\.env\.)/, '');
      if (key) {
        variables[key] = 'EXTRACTED_FROM_CODE';
      }
    });
    
    return { exists: true, variables };
  } catch (error) {
    return { exists: false, error: error.message, variables: {} };
  }
}

function validateFrontendEnvironment() {
  logSection('FRONTEND ENVIRONMENT VALIDATION');
  
  // Check env.local file
  const envLocal = parseEnvFile(config.frontend.envFile);
  
  if (!envLocal.exists) {
    logError(`Frontend env.local file not found: ${config.frontend.envFile}`);
    return false;
  }
  
  logInfo('Frontend env.local file found and parsed');
  
  // Validate required variables
  const requiredVars = [
    'VITE_API_URL',
    'VITE_WEBSOCKET_URL', 
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  let allValid = true;
  
  requiredVars.forEach(varName => {
    const value = envLocal.variables[varName];
    
    if (!value) {
      logError(`Missing required environment variable: ${varName}`);
      allValid = false;
      return;
    }
    
    if (varName.includes('URL')) {
      const urlValidation = validateUrl(value, varName);
      if (!urlValidation.valid) {
        logError(urlValidation.error);
        allValid = false;
      } else {
        logSuccess(`${varName}: ${value}`);
      }
    } else if (varName.includes('SUPABASE_ANON_KEY')) {
      const keyValidation = validateSupabaseKey(value, varName);
      if (!keyValidation.valid) {
        logError(keyValidation.error);
        allValid = false;
      } else {
        logSuccess(`${varName}: ${value.substring(0, 20)}...`);
      }
    } else {
      logSuccess(`${varName}: ${value}`);
    }
  });
  
  // Check for unexpected variables
  const unexpectedVars = Object.keys(envLocal.variables).filter(key => 
    !requiredVars.includes(key) && !key.startsWith('VITE_')
  );
  
  if (unexpectedVars.length > 0) {
    logWarning(`Unexpected variables found: ${unexpectedVars.join(', ')}`);
  }
  
  return allValid;
}

function validateBackendEnvironment() {
  logSection('BACKEND ENVIRONMENT VALIDATION');
  
  // Check env.local file
  const envLocal = parseEnvFile(config.backend.envFile);
  
  if (!envLocal.exists) {
    logError(`Backend env.local file not found: ${config.backend.envFile}`);
    return false;
  }
  
  logInfo('Backend env.local file found and parsed');
  
  // Validate required variables
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  let allValid = true;
  
  requiredVars.forEach(varName => {
    const value = envLocal.variables[varName];
    
    if (!value) {
      logError(`Missing required environment variable: ${varName}`);
      allValid = false;
      return;
    }
    
    if (varName.includes('URL')) {
      const urlValidation = validateUrl(value, varName);
      if (!urlValidation.valid) {
        logError(urlValidation.error);
        allValid = false;
      } else {
        logSuccess(`${varName}: ${value}`);
      }
    } else if (varName.includes('SUPABASE')) {
      const keyValidation = validateSupabaseKey(value, varName);
      if (!keyValidation.valid) {
        logError(keyValidation.error);
        allValid = false;
      } else {
        logSuccess(`${varName}: ${value.substring(0, 20)}...`);
      }
    } else {
      logSuccess(`${varName}: ${value}`);
    }
  });
  
  // Check for unexpected variables
  const unexpectedVars = Object.keys(envLocal.variables).filter(key => 
    !requiredVars.includes(key) && !['NODE_ENV', 'PORT', 'DATABASE_URL'].includes(key)
  );
  
  if (unexpectedVars.length > 0) {
    logWarning(`Unexpected variables found: ${unexpectedVars.join(', ')}`);
  }
  
  return allValid;
}

function validateCrossPlatformAlignment() {
  logSection('CROSS-PLATFORM ALIGNMENT VALIDATION');
  
  const frontendEnv = parseEnvFile(config.frontend.envFile);
  const backendEnv = parseEnvFile(config.backend.envFile);
  
  if (!frontendEnv.exists || !backendEnv.exists) {
    logError('Cannot validate alignment - missing environment files');
    return false;
  }
  
  let allAligned = true;
  
  // Check Supabase URL alignment
  const frontendSupabaseUrl = frontendEnv.variables['VITE_SUPABASE_URL'];
  const backendSupabaseUrl = backendEnv.variables['SUPABASE_URL'];
  
  if (frontendSupabaseUrl !== backendSupabaseUrl) {
    logError(`Supabase URL mismatch:
      Frontend: ${frontendSupabaseUrl}
      Backend:  ${backendSupabaseUrl}`);
    allAligned = false;
  } else {
    logSuccess('Supabase URLs are aligned');
  }
  
  // Check Supabase Anon Key alignment
  const frontendAnonKey = frontendEnv.variables['VITE_SUPABASE_ANON_KEY'];
  const backendAnonKey = backendEnv.variables['SUPABASE_ANON_KEY'];
  
  if (frontendAnonKey !== backendAnonKey) {
    logError(`Supabase Anon Key mismatch:
      Frontend: ${frontendAnonKey?.substring(0, 20)}...
      Backend:  ${backendAnonKey?.substring(0, 20)}...`);
    allAligned = false;
  } else {
    logSuccess('Supabase Anon Keys are aligned');
  }
  
  // Check API URL consistency
  const frontendApiUrl = frontendEnv.variables['VITE_API_URL'];
  const expectedApiUrl = config.expectedUrls.api;
  
  if (frontendApiUrl !== expectedApiUrl) {
    logWarning(`API URL may not match expected production URL:
      Current: ${frontendApiUrl}
      Expected: ${expectedApiUrl}`);
  } else {
    logSuccess('API URL matches expected production URL');
  }
  
  // Check WebSocket URL consistency
  const frontendWsUrl = frontendEnv.variables['VITE_WEBSOCKET_URL'];
  const expectedWsUrl = config.expectedUrls.websocket;
  
  if (frontendWsUrl !== expectedWsUrl) {
    logWarning(`WebSocket URL may not match expected production URL:
      Current: ${frontendWsUrl}
      Expected: ${expectedWsUrl}`);
  } else {
    logSuccess('WebSocket URL matches expected production URL');
  }
  
  return allAligned;
}

function validateConfigurationFiles() {
  logSection('CONFIGURATION FILES VALIDATION');
  
  let allValid = true;
  
  // Check frontend config files
  config.frontend.configFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      logError(`Frontend config file not found: ${filePath}`);
      allValid = false;
    } else {
      logSuccess(`Frontend config file exists: ${path.basename(filePath)}`);
    }
  });
  
  // Check backend config files
  config.backend.configFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      logError(`Backend config file not found: ${filePath}`);
      allValid = false;
    } else {
      logSuccess(`Backend config file exists: ${path.basename(filePath)}`);
    }
  });
  
  return allValid;
}

function validateProductionReadiness() {
  logSection('PRODUCTION READINESS VALIDATION');
  
  const frontendEnv = parseEnvFile(config.frontend.envFile);
  const backendEnv = parseEnvFile(config.backend.envFile);
  
  let productionReady = true;
  
  // Check if all required production variables are set
  const productionVars = {
    frontend: ['VITE_API_URL', 'VITE_WEBSOCKET_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    backend: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
  };
  
  productionVars.frontend.forEach(varName => {
    const value = frontendEnv.variables[varName];
    if (!value || value.includes('your_') || value.includes('localhost')) {
      logError(`Frontend production variable not properly set: ${varName}`);
      productionReady = false;
    }
  });
  
  productionVars.backend.forEach(varName => {
    const value = backendEnv.variables[varName];
    if (!value || value.includes('your_') || value.includes('localhost')) {
      logError(`Backend production variable not properly set: ${varName}`);
      productionReady = false;
    }
  });
  
  // Check for development-only variables
  const devVars = ['NODE_ENV', 'PORT', 'DATABASE_URL'];
  devVars.forEach(varName => {
    const value = backendEnv.variables[varName];
    if (value && value.includes('localhost')) {
      logWarning(`Development variable found in backend: ${varName} = ${value}`);
    }
  });
  
  if (productionReady) {
    logSuccess('All production variables are properly configured');
  }
  
  return productionReady;
}

function generateReport() {
  logSection('ENVIRONMENT VALIDATION REPORT');
  
  const results = {
    frontend: validateFrontendEnvironment(),
    backend: validateBackendEnvironment(),
    alignment: validateCrossPlatformAlignment(),
    configFiles: validateConfigurationFiles(),
    productionReady: validateProductionReadiness()
  };
  
  const allPassed = Object.values(results).every(result => result === true);
  
  logSection('SUMMARY');
  
  if (allPassed) {
    logSuccess('🎉 All environment validations passed!');
    logInfo('Your environment variables are properly configured for deployment.');
  } else {
    logError('❌ Some environment validations failed!');
    logInfo('Please fix the issues above before deploying.');
  }
  
  // Detailed summary
  log('\nDetailed Results:');
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const color = passed ? 'green' : 'red';
    log(`  ${test}: ${status}`, color);
  });
  
  return allPassed;
}

// Main execution
if (require.main === module) {
  console.log(`${colors.bold}${colors.cyan}Environment Variables Validation Script${colors.reset}\n`);
  
  try {
    const success = generateReport();
    process.exit(success ? 0 : 1);
  } catch (error) {
    logError(`Validation script failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  validateFrontendEnvironment,
  validateBackendEnvironment,
  validateCrossPlatformAlignment,
  validateConfigurationFiles,
  validateProductionReadiness,
  generateReport
};
