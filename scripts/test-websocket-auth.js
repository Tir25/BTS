#!/usr/bin/env node

/**
 * WebSocket Authentication Test Script
 * Tests the fixed WebSocket authentication flow
 */

const { io } = require('socket.io-client');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000';

// Test credentials (you'll need to replace these with actual test credentials)
const TEST_DRIVER_EMAIL = process.env.TEST_DRIVER_EMAIL || 'driver@test.com';
const TEST_DRIVER_PASSWORD = process.env.TEST_DRIVER_PASSWORD || 'testpassword123';

async function getAuthToken() {
  try {
    console.log('🔐 Getting authentication token...');
    
    const response = await fetch(`${API_BASE_URL}/auth/driver/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_DRIVER_EMAIL,
        password: TEST_DRIVER_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.data?.session?.access_token) {
      throw new Error('No token received from authentication');
    }

    console.log('✅ Authentication token received');
    return data.data.session.access_token;
  } catch (error) {
    console.error('❌ Failed to get authentication token:', error.message);
    throw error;
  }
}

async function testWebSocketConnection(token) {
  return new Promise((resolve, reject) => {
    console.log('🔌 Testing WebSocket connection...');
    
    const socket = io(WS_URL, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    let testResults = {
      connectionEstablished: false,
      middlewareAuthentication: false,
      driverInitialization: false,
      busAssignmentReceived: false,
      errors: [],
    };

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Test timeout after 15 seconds'));
    }, 15000);

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      testResults.connectionEstablished = true;
      
      // Test driver initialization
      console.log('🔐 Testing driver initialization...');
      socket.emit('driver:initialize');
    });

    socket.on('driver:initialized', (data) => {
      console.log('✅ Driver initialized successfully:', {
        driverId: data?.driverId,
        busId: data?.busId,
        busNumber: data?.busInfo?.bus_number
      });
      testResults.driverInitialization = true;
    });

    socket.on('driver:assignmentUpdate', (data) => {
      console.log('✅ Assignment update received:', {
        type: data?.type,
        hasAssignment: !!data?.assignment,
        busNumber: data?.assignment?.busNumber
      });
      testResults.busAssignmentReceived = true;
      
      // Test completed successfully
      clearTimeout(timeout);
      socket.disconnect();
      resolve(testResults);
    });

    socket.on('driver:initialization_failed', (error) => {
      console.error('❌ Driver initialization failed:', error);
      testResults.errors.push(`Initialization failed: ${error.message} (${error.code})`);
      
      clearTimeout(timeout);
      socket.disconnect();
      reject(new Error(`Driver initialization failed: ${error.message}`));
    });

    socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      testResults.errors.push(`WebSocket error: ${error.message}`);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      testResults.errors.push(`Connection error: ${error.message}`);
      
      clearTimeout(timeout);
      reject(new Error(`Connection failed: ${error.message}`));
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });
  });
}

async function runTest() {
  try {
    console.log('🚀 Starting WebSocket Authentication Test');
    console.log('=====================================');
    
    // Step 1: Get authentication token
    const token = await getAuthToken();
    
    // Step 2: Test WebSocket connection and authentication
    const results = await testWebSocketConnection(token);
    
    // Step 3: Report results
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`✅ Connection Established: ${results.connectionEstablished}`);
    console.log(`✅ Driver Initialization: ${results.driverInitialization}`);
    console.log(`✅ Bus Assignment Received: ${results.busAssignmentReceived}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    const allTestsPassed = results.connectionEstablished && 
                          results.driverInitialization && 
                          results.busAssignmentReceived;
    
    if (allTestsPassed) {
      console.log('\n🎉 All tests passed! WebSocket authentication is working correctly.');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed. Please check the errors above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
runTest();
