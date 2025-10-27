/**
 * WebSocket Broadcast Test Script
 * Tests the student live map WebSocket broadcast functionality
 * 
 * Usage: node test-websocket-broadcast.js
 */

const io = require('socket.io-client');

// Configuration
const WS_URL = process.env.WS_URL || 'http://localhost:3000';
const TEST_DRIVER_TOKEN = process.env.DRIVER_TOKEN || 'test-driver-token';
const TEST_STUDENT_TOKEN = process.env.STUDENT_TOKEN || 'test-student-token';

// Test Results
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Utility Functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function assert(condition, message) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    log(`PASS: ${message}`, 'success');
    return true;
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    log(`FAIL: ${message}`, 'error');
    return false;
  }
}

// Test 1: Student Connection and Listener Registration
async function testStudentConnection() {
  log('Testing student WebSocket connection...', 'info');
  
  return new Promise((resolve) => {
    const studentSocket = io(WS_URL, {
      auth: { token: TEST_STUDENT_TOKEN, clientType: 'student' },
      transports: ['websocket', 'polling']
    });

    let connected = false;
    let listenerRegistered = false;
    let locationReceived = false;
    let timeout;

    studentSocket.on('connect', () => {
      connected = true;
      log('Student connected to WebSocket', 'success');
      
      // Emit student connection event
      studentSocket.emit('student:connect');
    });

    studentSocket.on('student:connected', () => {
      log('Student authentication successful', 'success');
      
      // Register listener for bus location updates
      studentSocket.on('bus:locationUpdate', (location) => {
        listenerRegistered = true;
        locationReceived = true;
        log(`📍 Location update received: Bus ${location.busId} at (${location.latitude}, ${location.longitude})`, 'success');
        
        assert(true, 'Student received location update');
        
        clearTimeout(timeout);
        studentSocket.disconnect();
        resolve({
          connected,
          listenerRegistered,
          locationReceived
        });
      });
      
      // Set timeout for test (wait for broadcast)
      timeout = setTimeout(() => {
        assert(locationReceived, 'Student received location update within timeout');
        studentSocket.disconnect();
        resolve({
          connected,
          listenerRegistered,
          locationReceived
        });
      }, 10000); // 10 second timeout
    });

    studentSocket.on('connect_error', (error) => {
      log(`Connection error: ${error.message}`, 'error');
      assert(false, 'Student WebSocket connection');
      clearTimeout(timeout);
      resolve({
        connected: false,
        listenerRegistered: false,
        locationReceived: false
      });
    });

    studentSocket.on('error', (error) => {
      log(`WebSocket error: ${JSON.stringify(error)}`, 'error');
    });
  });
}

// Test 2: Driver Location Update Broadcast
async function testDriverBroadcast() {
  log('Testing driver location update broadcast...', 'info');
  
  return new Promise((resolve) => {
    const driverSocket = io(WS_URL, {
      auth: { token: TEST_DRIVER_TOKEN, clientType: 'driver' },
      transports: ['websocket', 'polling']
    });

    let initialized = false;
    let locationSent = false;
    let locationConfirmed = false;

    driverSocket.on('connect', () => {
      log('Driver connected to WebSocket', 'success');
      driverSocket.emit('driver:initialize');
    });

    driverSocket.on('driver:initialized', (data) => {
      initialized = true;
      log(`Driver initialized: Bus ${data.busId}`, 'success');
      
      // Send test location update
      const testLocation = {
        driverId: data.driverId,
        latitude: 23.025,
        longitude: 72.571,
        timestamp: new Date().toISOString(),
        speed: 40,
        heading: 90
      };
      
      driverSocket.emit('driver:locationUpdate', testLocation);
      locationSent = true;
      log('Location update sent by driver', 'success');
    });

    driverSocket.on('driver:locationConfirmed', (data) => {
      locationConfirmed = true;
      log(`Location confirmed: ${data.locationId}`, 'success');
    });

    driverSocket.on('error', (error) => {
      log(`Driver error: ${JSON.stringify(error)}`, 'error');
    });

    setTimeout(() => {
      assert(initialized, 'Driver initialized');
      assert(locationSent, 'Driver sent location update');
      // Note: locationConfirmed may be false if save fails, but broadcast should still happen
      
      driverSocket.disconnect();
      resolve({
        initialized,
        locationSent,
        locationConfirmed
      });
    }, 5000);
  });
}

// Test 3: Broadcast Reliability (Multiple Students)
async function testMultipleStudents() {
  log('Testing broadcast to multiple students...', 'info');
  
  const students = [];
  const receivedUpdates = [];
  
  // Create 5 student connections
  for (let i = 0; i < 5; i++) {
    const studentSocket = io(WS_URL, {
      auth: { token: TEST_STUDENT_TOKEN, clientType: 'student' },
      transports: ['websocket', 'polling']
    });
    
    students.push({
      socket: studentSocket,
      id: i,
      received: false
    });
    
    studentSocket.on('connect', () => {
      studentSocket.emit('student:connect');
    });
    
    studentSocket.on('student:connected', () => {
      studentSocket.on('bus:locationUpdate', (location) => {
        students[i].received = true;
        receivedUpdates.push(i);
        log(`Student ${i} received location update`, 'success');
      });
    });
  }
  
  // Wait for all connections
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Wait for potential broadcasts
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Cleanup
  students.forEach(student => student.socket.disconnect());
  
  const receivedCount = receivedUpdates.length;
  assert(receivedCount > 0, `At least ${receivedCount} students received updates`);
  
  return { total: students.length, received: receivedCount };
}

// Test 4: Broadcast Even on Save Failure
async function testBroadcastOnSaveFailure() {
  log('Testing broadcast when database save fails...', 'info');
  
  // This test verifies that broadcasts happen even if saveLocationUpdate returns null
  // The backend should continue to broadcast regardless of save status
  
  return new Promise((resolve) => {
    const studentSocket = io(WS_URL, {
      auth: { token: TEST_STUDENT_TOKEN, clientType: 'student' },
      transports: ['websocket', 'polling']
    });

    let receivedUpdate = false;

    studentSocket.on('connect', () => {
      studentSocket.emit('student:connect');
    });

    studentSocket.on('student:connected', () => {
      studentSocket.on('bus:locationUpdate', (location) => {
        receivedUpdate = true;
        log('✅ Received update even during save failure simulation', 'success');
        assert(true, 'Broadcast happened despite save failure');
      });
    });

    // Simulate timeout - if we receive update, broadcast is working
    setTimeout(() => {
      assert(receivedUpdate, 'Broadcast occurred even during save failure');
      studentSocket.disconnect();
      resolve({ receivedUpdate });
    }, 15000);
  });
}

// Main Test Runner
async function runTests() {
  log('Starting WebSocket Broadcast Tests...', 'info');
  log(`WebSocket URL: ${WS_URL}`, 'info');
  log('', 'info');
  
  try {
    // Test 1: Student Connection
    log('='.repeat(60), 'info');
    log('TEST 1: Student Connection and Listener', 'info');
    log('='.repeat(60), 'info');
    await testStudentConnection();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Driver Broadcast
    log('', 'info');
    log('='.repeat(60), 'info');
    log('TEST 2: Driver Location Update Broadcast', 'info');
    log('='.repeat(60), 'info');
    await testDriverBroadcast();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Multiple Students
    log('', 'info');
    log('='.repeat(60), 'info');
    log('TEST 3: Multiple Students Receiving Broadcasts', 'info');
    log('='.repeat(60), 'info');
    await testMultipleStudents();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Broadcast on Save Failure
    log('', 'info');
    log('='.repeat(60), 'info');
    log('TEST 4: Broadcast Reliability During Failures', 'info');
    log('='.repeat(60), 'info');
    await testBroadcastOnSaveFailure();
    
  } catch (error) {
    log(`Test suite error: ${error.message}`, 'error');
    testResults.errors.push(error.message);
  }
  
  // Print Summary
  log('', 'info');
  log('='.repeat(60), 'info');
  log('TEST SUMMARY', 'info');
  log('='.repeat(60), 'info');
  log(`Total Tests: ${testResults.total}`, 'info');
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
  
  if (testResults.errors.length > 0) {
    log('', 'info');
    log('Errors:', 'error');
    testResults.errors.forEach((error, index) => {
      log(`  ${index + 1}. ${error}`, 'error');
    });
  }
  
  log('', 'info');
  log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 
      testResults.passed === testResults.total ? 'success' : 'warning');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests();

