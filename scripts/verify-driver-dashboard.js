#!/usr/bin/env node

/**
 * Comprehensive verification script for driver dashboard functionality
 * Tests the complete driver authentication and WebSocket flow
 */

const { io } = require('socket.io-client');

const config = {
  API_URL: process.env.API_URL || 'http://localhost:3001',
  WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'http://localhost:3001',
  TEST_DRIVER_EMAIL: process.env.TEST_DRIVER_EMAIL || 'driver@test.com',
  TEST_DRIVER_PASSWORD: process.env.TEST_DRIVER_PASSWORD || 'password123',
};

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(testName, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, error });
    console.log(`❌ ${testName}: ${error}`);
  }
}

async function testDriverLogin() {
  try {
    console.log('\n🔐 Testing Driver Login...');
    
    const response = await fetch(`${config.API_URL}/api/auth/driver/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: config.TEST_DRIVER_EMAIL,
        password: config.TEST_DRIVER_PASSWORD,
      }),
    });

    const data = await response.json();
    
    if (data.success && data.data?.session?.access_token) {
      logTest('Driver Login API', true);
      return data.data.session.access_token;
    } else {
      logTest('Driver Login API', false, data.error || 'No token received');
      return null;
    }
  } catch (error) {
    logTest('Driver Login API', false, error.message);
    return null;
  }
}

async function testWebSocketConnection(token) {
  try {
    console.log('\n🔌 Testing WebSocket Connection...');
    
    const socket = io(config.WEBSOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    const connected = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 10000);
      
      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve(true);
      });
      
      socket.on('connect_error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });

    if (connected) {
      logTest('WebSocket Connection', true);
      return socket;
    } else {
      logTest('WebSocket Connection', false, 'Connection timeout');
      return null;
    }
  } catch (error) {
    logTest('WebSocket Connection', false, error.message);
    return null;
  }
}

async function testDriverInitialization(socket) {
  try {
    console.log('\n🔑 Testing Driver Initialization...');
    
    const initialized = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 10000);
      
      socket.once('driver:initialized', (data) => {
        clearTimeout(timeout);
        console.log('   Driver initialized with data:', {
          driverId: data?.driverId,
          busId: data?.busId,
          busNumber: data?.busInfo?.bus_number
        });
        resolve(true);
      });
      
      socket.once('driver:initialization_failed', (error) => {
        clearTimeout(timeout);
        console.log('   Initialization failed:', error);
        resolve(false);
      });
      
      socket.emit('driver:initialize');
    });

    logTest('Driver WebSocket Initialization', initialized);
    return initialized;
  } catch (error) {
    logTest('Driver WebSocket Initialization', false, error.message);
    return false;
  }
}

async function testLocationUpdate(socket) {
  try {
    console.log('\n📍 Testing Location Update...');
    
    const locationData = {
      driverId: 'test-driver-id',
      busId: 'test-bus-id',
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: new Date().toISOString(),
      speed: 25.5,
      heading: 90
    };

    const locationConfirmed = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      
      socket.once('driver:locationConfirmed', (data) => {
        clearTimeout(timeout);
        console.log('   Location update confirmed:', data);
        resolve(true);
      });
      
      socket.emit('driver:locationUpdate', locationData);
    });

    logTest('Location Update', locationConfirmed);
    return locationConfirmed;
  } catch (error) {
    logTest('Location Update', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Starting Driver Dashboard Verification Tests...\n');
  
  // Test 1: Driver Login
  const token = await testDriverLogin();
  if (!token) {
    console.log('\n❌ Cannot proceed without authentication token');
    return;
  }

  // Test 2: WebSocket Connection
  const socket = await testWebSocketConnection(token);
  if (!socket) {
    console.log('\n❌ Cannot proceed without WebSocket connection');
    return;
  }

  // Test 3: Driver Initialization
  const initialized = await testDriverInitialization(socket);
  if (!initialized) {
    console.log('\n❌ Cannot proceed without driver initialization');
    socket.disconnect();
    return;
  }

  // Test 4: Location Update
  await testLocationUpdate(socket);

  // Cleanup
  socket.disconnect();

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   Total Tests: ${testResults.total}`);
  console.log(`   Passed: ${testResults.passed}`);
  console.log(`   Failed: ${testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`   - ${test}: ${error}`);
    });
  }

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Driver dashboard is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }

  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);
