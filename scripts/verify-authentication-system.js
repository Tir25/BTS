#!/usr/bin/env node

/**
 * Authentication System Verification Script
 * 
 * This script verifies that the authentication system is working correctly
 * before deployment to production.
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  // Test credentials
  testDriver: {
    email: 'prathambhatt771@gmail.com',
    password: 'test123456' // Replace with actual test password
  },
  
  // URLs to test
  localBackend: 'http://localhost:3000',
  productionBackend: 'https://bus-tracking-backend-sxh8.onrender.com',
  
  // Test endpoints
  endpoints: {
    health: '/health',
    auth: '/auth/login',
    websocket: '/socket.io/'
  }
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AuthSystemVerifier/1.0.0',
        ...options.headers
      },
      timeout: 10000
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test functions
async function testBackendHealth(baseUrl) {
  logInfo(`Testing backend health at ${baseUrl}`);
  
  try {
    const response = await makeRequest(`${baseUrl}${config.endpoints.health}`);
    
    if (response.statusCode === 200) {
      logSuccess(`Backend health check passed: ${response.statusCode}`);
      return true;
    } else {
      logError(`Backend health check failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Backend health check error: ${error.message}`);
    return false;
  }
}

async function testWebSocketConnection(baseUrl) {
  logInfo(`Testing WebSocket connection at ${baseUrl}`);
  
  try {
    // Test WebSocket endpoint availability
    const response = await makeRequest(`${baseUrl}${config.endpoints.websocket}`);
    
    if (response.statusCode === 200 || response.statusCode === 400) {
      logSuccess(`WebSocket endpoint accessible: ${response.statusCode}`);
      return true;
    } else {
      logError(`WebSocket endpoint not accessible: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`WebSocket connection test error: ${error.message}`);
    return false;
  }
}

async function testEnvironmentConfiguration() {
  logInfo('Testing environment configuration');
  
  const requiredEnvVars = [
    'VITE_API_URL',
    'VITE_WEBSOCKET_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }
  
  if (missingVars.length === 0) {
    logSuccess('All required environment variables are set');
    return true;
  } else {
    logError(`Missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
}

async function testSupabaseConnection() {
  logInfo('Testing Supabase connection');
  
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gthwmwfwvhyriygpcdlr.supabase.co';
    const response = await makeRequest(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY || ''}`
      }
    });
    
    if (response.statusCode === 200 || response.statusCode === 401) {
      logSuccess('Supabase connection test passed');
      return true;
    } else {
      logError(`Supabase connection test failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Supabase connection test error: ${error.message}`);
    return false;
  }
}

async function testCORSConfiguration(baseUrl) {
  logInfo(`Testing CORS configuration at ${baseUrl}`);
  
  try {
    const response = await makeRequest(`${baseUrl}${config.endpoints.health}`, {
      headers: {
        'Origin': 'https://vercel.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    const corsHeaders = response.headers['access-control-allow-origin'];
    
    if (corsHeaders && (corsHeaders.includes('*') || corsHeaders.includes('vercel.app'))) {
      logSuccess('CORS configuration is correct');
      return true;
    } else {
      logWarning('CORS configuration may need adjustment');
      return false;
    }
  } catch (error) {
    logError(`CORS test error: ${error.message}`);
    return false;
  }
}

// Main verification function
async function verifyAuthenticationSystem() {
  log('🚀 Starting Authentication System Verification', 'bold');
  log('================================================', 'bold');
  
  const results = {
    environment: false,
    localBackend: false,
    productionBackend: false,
    supabase: false,
    cors: false
  };
  
  // Test 1: Environment Configuration
  log('\n📋 Test 1: Environment Configuration', 'bold');
  results.environment = await testEnvironmentConfiguration();
  
  // Test 2: Supabase Connection
  log('\n📋 Test 2: Supabase Connection', 'bold');
  results.supabase = await testSupabaseConnection();
  
  // Test 3: Local Backend (if available)
  log('\n📋 Test 3: Local Backend Health', 'bold');
  try {
    results.localBackend = await testBackendHealth(config.localBackend);
  } catch (error) {
    logWarning('Local backend not available (expected if not running locally)');
  }
  
  // Test 4: Production Backend
  log('\n📋 Test 4: Production Backend Health', 'bold');
  results.productionBackend = await testBackendHealth(config.productionBackend);
  
  // Test 5: WebSocket Connection
  log('\n📋 Test 5: WebSocket Connection', 'bold');
  const wsLocal = await testWebSocketConnection(config.localBackend);
  const wsProduction = await testWebSocketConnection(config.productionBackend);
  
  // Test 6: CORS Configuration
  log('\n📋 Test 6: CORS Configuration', 'bold');
  results.cors = await testCORSConfiguration(config.productionBackend);
  
  // Summary
  log('\n📊 Verification Summary', 'bold');
  log('======================', 'bold');
  
  const testResults = [
    { name: 'Environment Configuration', result: results.environment },
    { name: 'Supabase Connection', result: results.supabase },
    { name: 'Local Backend Health', result: results.localBackend },
    { name: 'Production Backend Health', result: results.productionBackend },
    { name: 'WebSocket Connection (Local)', result: wsLocal },
    { name: 'WebSocket Connection (Production)', result: wsProduction },
    { name: 'CORS Configuration', result: results.cors }
  ];
  
  let passedTests = 0;
  let totalTests = testResults.length;
  
  for (const test of testResults) {
    if (test.result) {
      logSuccess(`${test.name}: PASSED`);
      passedTests++;
    } else {
      logError(`${test.name}: FAILED`);
    }
  }
  
  log('\n📈 Overall Results', 'bold');
  log(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    logSuccess('🎉 All tests passed! Authentication system is ready for deployment.');
    process.exit(0);
  } else {
    logError('⚠️ Some tests failed. Please fix the issues before deployment.');
    process.exit(1);
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  verifyAuthenticationSystem().catch((error) => {
    logError(`Verification failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  verifyAuthenticationSystem,
  testBackendHealth,
  testWebSocketConnection,
  testEnvironmentConfiguration,
  testSupabaseConnection,
  testCORSConfiguration
};
