#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Checks if the backend is properly deployed with CORS configuration
 */

const https = require('https');
const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL || 'https://bus-tracking-backend-1u04.onrender.com';
const FRONTEND_URL = 'https://gantpat-bts.netlify.app';

console.log('🔍 Verifying backend deployment...');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log(`Frontend URL: ${FRONTEND_URL}`);

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Origin': FRONTEND_URL,
        'User-Agent': 'Deployment-Verification-Script/1.0',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy());
    req.end();
  });
}

async function verifyCORS() {
  try {
    console.log('\n📡 Testing CORS configuration...');
    
    // Test OPTIONS request (CORS preflight)
    const optionsResponse = await makeRequest(`${BACKEND_URL}/admin/health`, {
      method: 'OPTIONS'
    });
    
    console.log(`✅ OPTIONS request status: ${optionsResponse.statusCode}`);
    console.log('📋 CORS Headers:');
    console.log(`   Access-Control-Allow-Origin: ${optionsResponse.headers['access-control-allow-origin']}`);
    console.log(`   Access-Control-Allow-Methods: ${optionsResponse.headers['access-control-allow-methods']}`);
    console.log(`   Access-Control-Allow-Headers: ${optionsResponse.headers['access-control-allow-headers']}`);
    console.log(`   Access-Control-Allow-Credentials: ${optionsResponse.headers['access-control-allow-credentials']}`);
    
    // Test actual GET request
    const getResponse = await makeRequest(`${BACKEND_URL}/admin/health`, {
      method: 'GET'
    });
    
    console.log(`\n✅ GET request status: ${getResponse.statusCode}`);
    
    // Verify CORS headers are present
    const corsOrigin = optionsResponse.headers['access-control-allow-origin'];
    const corsMethods = optionsResponse.headers['access-control-allow-methods'];
    
    if (corsOrigin && corsMethods) {
      console.log('🎉 CORS configuration is working correctly!');
      return true;
    } else {
      console.log('❌ CORS headers are missing or incorrect');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing CORS:', error.message);
    return false;
  }
}

async function verifyEndpoints() {
  try {
    console.log('\n🔗 Testing API endpoints...');
    
    const endpoints = [
      '/admin/health',
      '/admin/analytics'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await makeRequest(`${BACKEND_URL}${endpoint}`);
        console.log(`✅ ${endpoint}: ${response.statusCode}`);
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting deployment verification...\n');
  
  const corsWorking = await verifyCORS();
  await verifyEndpoints();
  
  console.log('\n📊 Verification Summary:');
  if (corsWorking) {
    console.log('✅ CORS configuration is properly deployed');
    console.log('✅ Backend should work with frontend');
  } else {
    console.log('❌ CORS configuration needs attention');
    console.log('❌ Backend may not work with frontend');
  }
  
  console.log('\n🔧 Next Steps:');
  if (corsWorking) {
    console.log('1. Test admin dashboard in browser');
    console.log('2. Verify all functionality works');
  } else {
    console.log('1. Check Render deployment status');
    console.log('2. Verify build process completed');
    console.log('3. Check backend logs for errors');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { verifyCORS, verifyEndpoints };
