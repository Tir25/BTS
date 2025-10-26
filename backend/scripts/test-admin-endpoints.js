#!/usr/bin/env node

/**
 * Admin Endpoints Test Script
 * Tests all admin endpoints to verify data loading works correctly
 */

const axios = require('axios');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../env.local') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  retries: 3,
  delay: 1000,
};

// Test results
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEndpoint(name, url, expectedFields = []) {
  testResults.total++;
  
  try {
    console.log(`🧪 Testing ${name}...`);
    
    const response = await axios.get(`${API_BASE_URL}${url}`, {
      timeout: TEST_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        // Add auth token if needed
        // 'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`
      }
    });
    
    if (response.status === 200 && response.data.success) {
      const data = response.data.data;
      
      if (Array.isArray(data)) {
        console.log(`✅ ${name}: Found ${data.length} records`);
        
        // Check if expected fields are present
        if (data.length > 0 && expectedFields.length > 0) {
          const firstRecord = data[0];
          const missingFields = expectedFields.filter(field => !(field in firstRecord));
          
          if (missingFields.length > 0) {
            console.log(`⚠️  ${name}: Missing fields: ${missingFields.join(', ')}`);
          } else {
            console.log(`✅ ${name}: All expected fields present`);
          }
        }
      } else {
        console.log(`✅ ${name}: Data structure looks good`);
      }
      
      testResults.passed++;
    } else {
      throw new Error(`Unexpected response: ${response.status} - ${JSON.stringify(response.data)}`);
    }
    
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    testResults.failed++;
    testResults.errors.push({
      endpoint: name,
      url,
      error: error.message
    });
  }
  
  await delay(TEST_CONFIG.delay);
}

async function runTests() {
  console.log('🚀 Starting Admin Endpoints Test Suite...');
  console.log(`📡 Testing against: ${API_BASE_URL}`);
  console.log('=' .repeat(50));
  
  // Test basic health
  await testEndpoint('Health Check', '/health');
  
  // Test admin endpoints
  await testEndpoint('Admin Analytics', '/admin/analytics');
  await testEndpoint('Admin System Health', '/admin/health');
  
  // Test bus management
  await testEndpoint('All Buses', '/admin/buses', [
    'id', 'bus_number', 'vehicle_no', 'capacity', 'is_active'
  ]);
  
  // Test driver management
  await testEndpoint('All Drivers', '/admin/drivers', [
    'id', 'email', 'full_name', 'role', 'is_active'
  ]);
  
  // Test route management
  await testEndpoint('All Routes', '/admin/routes', [
    'id', 'name', 'description', 'distance_km', 'is_active'
  ]);
  
  // Test assigned drivers
  await testEndpoint('Assigned Drivers', '/admin/assigned-drivers');
  
  console.log('=' .repeat(50));
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach(error => {
      console.log(`   - ${error.endpoint}: ${error.error}`);
    });
  }
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Admin data loading is working correctly.');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Check the errors above.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error.message);
  process.exit(1);
});
