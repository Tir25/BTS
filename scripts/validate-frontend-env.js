#!/usr/bin/env node

/**
 * Frontend Environment Variables Validation Script
 * 
 * This script validates environment variables across frontend files
 * to ensure they are properly configured and aligned for Vercel deployment.
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

function logHeader(message) {
  log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  log(`${colors.bold}${colors.cyan}${message}${colors.reset}`);
  log(`${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

// Parse environment file
function parseEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const envVars = {};
    
    content.split('\n').forEach((line, index) => {
      line = line.trim();
      
      // Skip comments and empty lines
      if (line.startsWith('#') || line === '') {
        return;
      }
      
      // Parse key=value pairs
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        const value = line.substring(equalIndex + 1).trim();
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    logError(`Error parsing ${filePath}: ${error.message}`);
    return {};
  }
}

// Validate URL format
function validateUrl(url, name) {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch (error) {
    logError(`${name} is not a valid URL: ${url}`);
    return false;
  }
}

// Validate JWT token format
function validateJWTToken(token, name) {
  if (!token) return false;
  
  // Basic JWT format validation (header.payload.signature)
  const parts = token.split('.');
  if (parts.length !== 3) {
    logError(`${name} is not a valid JWT token format`);
    return false;
  }
  
  return true;
}

// Main validation function
function validateFrontendEnvironment() {
  logHeader('FRONTEND ENVIRONMENT VARIABLES VALIDATION');
  
  const frontendDir = path.join(__dirname, '..', 'frontend');
  const envLocal = parseEnvFile(path.join(frontendDir, 'env.local'));
  const envTemplate = parseEnvFile(path.join(frontendDir, 'env.template'));
  const envExample = parseEnvFile(path.join(frontendDir, 'env.example'));
  
  logInfo('📁 Environment files found:');
  log(`   env.local: ${Object.keys(envLocal).length} variables`);
  log(`   env.template: ${Object.keys(envTemplate).length} variables`);
  log(`   env.example: ${Object.keys(envExample).length} variables`);
  
  // Required variables for production
  const requiredVars = [
    'VITE_API_URL',
    'VITE_WEBSOCKET_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  logHeader('VALIDATION RESULTS');
  
  let totalIssues = 0;
  let criticalIssues = 0;
  
  // Check env.local (production values)
  logInfo('🔍 Validating env.local (Production Configuration):');
  
  requiredVars.forEach(varName => {
    const value = envLocal[varName];
    
    if (!value) {
      logError(`Missing ${varName} in env.local`);
      criticalIssues++;
      totalIssues++;
      return;
    }
    
    if (varName.includes('URL')) {
      if (!validateUrl(value, varName)) {
        criticalIssues++;
        totalIssues++;
      } else {
        logSuccess(`${varName}: ${value}`);
      }
    } else if (varName.includes('KEY')) {
      if (!validateJWTToken(value, varName)) {
        criticalIssues++;
        totalIssues++;
      } else {
        logSuccess(`${varName}: Valid JWT token`);
      }
    } else {
      logSuccess(`${varName}: ${value}`);
    }
  });
  
  // Check for Render backend URLs
  logInfo('\n🔍 Checking backend URL configuration:');
  const apiUrl = envLocal.VITE_API_URL;
  const wsUrl = envLocal.VITE_WEBSOCKET_URL;
  
  if (apiUrl && apiUrl.includes('onrender.com')) {
    logSuccess('✅ Backend API URL points to Render: ' + apiUrl);
  } else {
    logWarning('⚠️ Backend API URL may not point to Render: ' + apiUrl);
    totalIssues++;
  }
  
  if (wsUrl && wsUrl.includes('onrender.com')) {
    logSuccess('✅ WebSocket URL points to Render: ' + wsUrl);
  } else {
    logWarning('⚠️ WebSocket URL may not point to Render: ' + wsUrl);
    totalIssues++;
  }
  
  // Check for Vercel deployment compatibility
  logInfo('\n🔍 Checking Vercel deployment compatibility:');
  
  if (envLocal.VITE_API_URL && envLocal.VITE_WEBSOCKET_URL) {
    logSuccess('✅ API and WebSocket URLs configured for Vercel deployment');
  } else {
    logError('❌ Missing API or WebSocket URLs for Vercel deployment');
    criticalIssues++;
    totalIssues++;
  }
  
  // Check template vs local consistency
  logInfo('\n🔍 Checking template consistency:');
  
  const templateHasPlaceholders = Object.values(envTemplate).some(value => 
    value.includes('your_') || value.includes('placeholder')
  );
  
  if (templateHasPlaceholders) {
    logSuccess('✅ env.template contains proper placeholders');
  } else {
    logWarning('⚠️ env.template may contain actual values instead of placeholders');
    totalIssues++;
  }
  
  // Check for sensitive data exposure
  logInfo('\n🔍 Checking for sensitive data exposure:');
  
  const sensitivePatterns = [
    /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*/,
    /sk_[A-Za-z0-9]+/,
    /pk_[A-Za-z0-9]+/
  ];
  
  let sensitiveDataFound = false;
  
  Object.entries(envLocal).forEach(([key, value]) => {
    sensitivePatterns.forEach(pattern => {
      if (pattern.test(value)) {
        logWarning(`⚠️ Potential sensitive data in ${key}`);
        sensitiveDataFound = true;
        totalIssues++;
      }
    });
  });
  
  if (!sensitiveDataFound) {
    logSuccess('✅ No obvious sensitive data patterns found');
  }
  
  // Check admin emails
  logInfo('\n🔍 Checking admin configuration:');
  
  if (envLocal.VITE_ADMIN_EMAILS) {
    const emails = envLocal.VITE_ADMIN_EMAILS.split(',').map(e => e.trim());
    logSuccess(`✅ Admin emails configured: ${emails.length} email(s)`);
    
    emails.forEach(email => {
      if (!email.includes('@')) {
        logWarning(`⚠️ Invalid email format: ${email}`);
        totalIssues++;
      }
    });
  } else {
    logWarning('⚠️ No admin emails configured');
    totalIssues++;
  }
  
  // Summary
  logHeader('VALIDATION SUMMARY');
  
  if (criticalIssues === 0 && totalIssues === 0) {
    logSuccess('🎉 All environment variables are properly configured!');
    logSuccess('✅ Ready for Vercel deployment');
  } else {
    logError(`❌ Found ${totalIssues} issues (${criticalIssues} critical)`);
    
    if (criticalIssues > 0) {
      logError('🚨 Critical issues must be fixed before deployment');
    }
    
    if (totalIssues > 0) {
      logWarning('⚠️ Non-critical issues should be addressed for optimal configuration');
    }
  }
  
  // Recommendations
  logHeader('RECOMMENDATIONS');
  
  logInfo('📋 For Vercel deployment:');
  log('   1. Set environment variables in Vercel dashboard');
  log('   2. Use the same values as in env.local');
  log('   3. Ensure backend is deployed on Render');
  log('   4. Test WebSocket connections');
  
  logInfo('📋 Security checklist:');
  log('   1. ✅ env.local contains production values');
  log('   2. ✅ env.template contains placeholders only');
  log('   3. ✅ No sensitive data in version control');
  log('   4. ✅ HTTPS URLs for production');
  
  return {
    success: criticalIssues === 0,
    totalIssues,
    criticalIssues
  };
}

// Run validation
if (require.main === module) {
  try {
    const result = validateFrontendEnvironment();
    
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    logError(`Validation failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { validateFrontendEnvironment };
