#!/usr/bin/env node

/**
 * End-to-End Test for Driver Login Flow
 * Tests the complete driver authentication flow from frontend to backend
 * 
 * Usage:
 *   node scripts/test-driver-login-e2e.js
 * 
 * Environment Variables:
 *   API_URL - Backend API URL (default: http://localhost:3001)
 *   TEST_DRIVER_EMAIL - Test driver email
 *   TEST_DRIVER_PASSWORD - Test driver password
 */

const { io } = require('socket.io-client');

function resolveApiPrefix(rawPrefix) {
  if (rawPrefix === undefined || rawPrefix === null) {
    return '/api';
  }

  const trimmed = String(rawPrefix).trim();
  if (
    trimmed === '' ||
    trimmed === '/' ||
    trimmed.toLowerCase() === 'none' ||
    trimmed.toLowerCase() === 'off' ||
    trimmed.toLowerCase() === 'disabled'
  ) {
    return '';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function resolveWebsocketUrl(rawUrl, fallbackUrl) {
  if (!rawUrl || String(rawUrl).trim() === '') {
    return fallbackUrl;
  }
  return rawUrl;
}

// Configuration
const config = {
  API_URL: process.env.API_URL || 'http://localhost:3001',
  API_PREFIX: resolveApiPrefix(process.env.API_PREFIX),
  WEBSOCKET_URL: resolveWebsocketUrl(process.env.WEBSOCKET_URL, process.env.API_URL || 'http://localhost:3001'),
  TEST_DRIVER_EMAIL: process.env.TEST_DRIVER_EMAIL || 'driver@test.com',
  TEST_DRIVER_PASSWORD: process.env.TEST_DRIVER_PASSWORD || 'password123',
  TIMEOUT: 30000, // 30 seconds
};

/**
 * Safely join URL segments ensuring there is exactly one slash between parts.
 */
function buildUrl(...segments) {
  const sanitized = segments
    .filter(Boolean)
    .map((segment, index) => {
      if (index === 0) {
        return segment.replace(/\/+$/, '');
      }
      return segment.replace(/^\/+/, '').replace(/\/+$/, '');
    })
    .filter((segment) => segment.length > 0);

  if (sanitized.length === 0) {
    return '';
  }

  const [first, ...rest] = sanitized;
  return rest.length ? `${first}/${rest.join('/')}` : first;
}

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  startTime: Date.now(),
};

/**
 * Log test result
 */
function logTest(testName, passed, error = null, details = {}) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
    if (Object.keys(details).length > 0) {
      console.log(`   Details:`, details);
    }
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, error, details });
    console.log(`❌ ${testName}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
    if (Object.keys(details).length > 0) {
      console.log(`   Details:`, details);
    }
  }
}

/**
 * Test 1: Backend API Health Check
 */
async function testBackendHealth() {
  try {
    console.log('\n📡 Testing Backend API Health...');
    
    const healthUrl = buildUrl(config.API_URL, '/health');
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      logTest('Backend Health Check', true, null, { status: response.status, data });
      return true;
    } else {
      logTest('Backend Health Check', false, `HTTP ${response.status}: ${response.statusText}`, { url: healthUrl });
      return false;
    }
  } catch (error) {
    logTest('Backend Health Check', false, error.message, { 
      url: buildUrl(config.API_URL, '/health'),
      error: error.toString()
    });
    return false;
  }
}

/**
 * Test 2: Driver Login API Endpoint
 */
async function testDriverLogin() {
  const loginUrl = buildUrl(config.API_URL, config.API_PREFIX, '/auth/driver/login');
  try {
    console.log('\n🔐 Testing Driver Login API...');
    
    const requestBody = {
      email: config.TEST_DRIVER_EMAIL,
      password: config.TEST_DRIVER_PASSWORD,
    };

    console.log(`   Attempting login with email: ${config.TEST_DRIVER_EMAIL}`);
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logTest('Driver Login API - Response Parsing', false, 'Failed to parse JSON response', {
        status: response.status,
        statusText: response.statusText,
        responseText: responseText.substring(0, 200),
      });
      return null;
    }

    if (response.ok && data.success) {
      // Validate response structure
      const hasUser = data.data?.user?.id && data.data?.user?.email;
      const hasAssignment = data.data?.assignment?.bus_number && data.data?.assignment?.route_id;
      const hasSession = data.data?.session?.access_token && data.data?.session?.refresh_token;

      if (hasUser && hasAssignment && hasSession) {
      logTest('Driver Login API', true, null, {
        url: loginUrl,
          userId: data.data.user.id,
          email: data.data.user.email,
          busNumber: data.data.assignment.bus_number,
          routeName: data.data.assignment.route_name,
          hasToken: !!data.data.session.access_token,
        });
        return data.data;
      } else {
        logTest('Driver Login API - Response Validation', false, 'Invalid response structure', {
          url: loginUrl,
          hasUser,
          hasAssignment,
          hasSession,
          data: JSON.stringify(data).substring(0, 500),
        });
        return null;
      }
    } else {
      // Login failed - this is expected for invalid credentials
      const errorMessage = data.error || data.message || 'Login failed';
      const errorCode = data.code || 'UNKNOWN_ERROR';
      
      logTest('Driver Login API', false, errorMessage, {
        url: loginUrl,
        status: response.status,
        code: errorCode,
        response: data,
      });
      return null;
    }
  } catch (error) {
    logTest('Driver Login API', false, error.message, {
      url: loginUrl,
      error: error.toString(),
      stack: error.stack?.substring(0, 300),
    });
    return null;
  }
}

/**
 * Test 3: Session Validation
 */
async function testSessionValidation(accessToken) {
  const validateUrl = buildUrl(config.API_URL, config.API_PREFIX, '/auth/driver/validate');
  try {
    console.log('\n🔑 Testing Session Validation...');
    
    const response = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (response.ok && data.success) {
      logTest('Session Validation', true, null, {
        url: validateUrl,
        userId: data.data?.user?.id,
        role: data.data?.user?.role,
        hasAssignment: !!data.data?.assignment,
      });
      return true;
    } else {
      logTest('Session Validation', false, data.error || 'Validation failed', {
        url: validateUrl,
        status: response.status,
        code: data.code,
      });
      return false;
    }
  } catch (error) {
    logTest('Session Validation', false, error.message, { url: validateUrl });
    return false;
  }
}

/**
 * Test 4: Driver Assignment Retrieval
 */
async function testDriverAssignment(accessToken, driverId) {
  let assignmentUrl = buildUrl(config.API_URL, config.API_PREFIX, '/auth/driver/assignment');
  if (driverId) {
    const urlObj = assignmentUrl.startsWith('http')
      ? new URL(assignmentUrl)
      : new URL(assignmentUrl, config.API_URL);
    urlObj.searchParams.set('driver_id', driverId);
    assignmentUrl = urlObj.toString();
  }
  try {
    console.log('\n🚌 Testing Driver Assignment Retrieval...');
    
    const response = await fetch(assignmentUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (response.ok && data.success && data.data) {
      const assignment = data.data;
      logTest('Driver Assignment Retrieval', true, null, {
        url: assignmentUrl,
        busNumber: assignment.bus_number,
        routeName: assignment.route_name,
        driverName: assignment.driver_name,
        isActive: assignment.is_active,
      });
      return true;
    } else {
      logTest('Driver Assignment Retrieval', false, data.error || 'Failed to retrieve assignment', {
        url: assignmentUrl,
        status: response.status,
        code: data.code,
      });
      return false;
    }
  } catch (error) {
    logTest('Driver Assignment Retrieval', false, error.message, { url: assignmentUrl });
    return false;
  }
}

/**
 * Test 5: WebSocket Connection with Authentication
 */
async function testWebSocketConnection(accessToken) {
  try {
    console.log('\n🔌 Testing WebSocket Connection...');
    
    return new Promise((resolve) => {
      const websocketUrl = config.WEBSOCKET_URL || config.API_URL;
      const socket = io(websocketUrl, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        logTest('WebSocket Connection', false, 'Connection timeout', { url: websocketUrl });
        resolve(false);
      }, config.TIMEOUT);

      socket.on('connect', () => {
        clearTimeout(timeout);
        logTest('WebSocket Connection', true, null, {
          url: websocketUrl,
          socketId: socket.id,
          transport: socket.io.engine.transport.name,
        });
        socket.disconnect();
        resolve(true);
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        logTest('WebSocket Connection', false, error.message || 'Connection failed', {
          url: websocketUrl,
          error: error.toString(),
        });
        socket.disconnect();
        resolve(false);
      });

      socket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect') {
          // Server disconnected, which is fine for testing
          console.log('   WebSocket disconnected by server');
        }
      });
    });
  } catch (error) {
    logTest('WebSocket Connection', false, error.message, { url: config.WEBSOCKET_URL || config.API_URL });
    return false;
  }
}

/**
 * Test 6: Error Handling - Invalid Credentials
 */
async function testInvalidCredentials() {
  const loginUrl = buildUrl(config.API_URL, config.API_PREFIX, '/auth/driver/login');
  try {
    console.log('\n🚫 Testing Invalid Credentials Handling...');
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid@test.com',
        password: 'wrongpassword',
      }),
    });

    const data = await response.json();

    // Should return 401 with proper error message
    if (response.status === 401 && !data.success && data.error) {
      logTest('Invalid Credentials Handling', true, null, {
        url: loginUrl,
        status: response.status,
        errorCode: data.code,
        errorMessage: data.error,
      });
      return true;
    } else {
      logTest('Invalid Credentials Handling', false, 'Expected 401 error but got different response', {
        url: loginUrl,
        status: response.status,
        data,
      });
      return false;
    }
  } catch (error) {
    logTest('Invalid Credentials Handling', false, error.message, { url: loginUrl });
    return false;
  }
}

/**
 * Test 7: Error Handling - Missing Credentials
 */
async function testMissingCredentials() {
  const loginUrl = buildUrl(config.API_URL, config.API_PREFIX, '/auth/driver/login');
  try {
    console.log('\n🚫 Testing Missing Credentials Handling...');
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    // Should return 400 with proper error message
    if (response.status === 400 && !data.success && data.error) {
      logTest('Missing Credentials Handling', true, null, {
        url: loginUrl,
        status: response.status,
        errorCode: data.code,
        errorMessage: data.error,
      });
      return true;
    } else {
      logTest('Missing Credentials Handling', false, 'Expected 400 error but got different response', {
        url: loginUrl,
        status: response.status,
        data,
      });
      return false;
    }
  } catch (error) {
    logTest('Missing Credentials Handling', false, error.message, { url: loginUrl });
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🧪 Starting Driver Login End-to-End Tests...\n');
  console.log('Configuration:');
  console.log(`   API URL: ${config.API_URL}`);
  console.log(`   API Prefix: ${config.API_PREFIX || '(none)'}`);
  console.log(`   WebSocket URL: ${config.WEBSOCKET_URL || config.API_URL}`);
  console.log(`   Test Email: ${config.TEST_DRIVER_EMAIL}`);
  console.log(`   Timeout: ${config.TIMEOUT}ms\n`);

  try {
    // Test 1: Backend Health
    const healthOk = await testBackendHealth();
    if (!healthOk) {
      console.log('\n⚠️  Backend is not accessible. Some tests may fail.');
      console.log('   Make sure the backend server is running on', config.API_URL);
    }

    // Test 2: Driver Login
    const loginData = await testDriverLogin();
    if (!loginData) {
      console.log('\n❌ Driver login failed. Cannot proceed with authenticated tests.');
      console.log('   Make sure you have valid test credentials configured.');
      console.log('   Set TEST_DRIVER_EMAIL and TEST_DRIVER_PASSWORD environment variables.');
    } else {
      const accessToken = loginData.session.access_token;

      // Test 3: Session Validation
      await testSessionValidation(accessToken);

      // Test 4: Driver Assignment
      await testDriverAssignment(accessToken, loginData.user?.id);

      // Test 5: WebSocket Connection
      await testWebSocketConnection(accessToken);
    }

    // Test 6: Error Handling - Invalid Credentials
    await testInvalidCredentials();

    // Test 7: Error Handling - Missing Credentials
    await testMissingCredentials();

  } catch (error) {
    console.error('\n❌ Unexpected error during testing:', error);
    logTest('Test Execution', false, error.message, {
      stack: error.stack?.substring(0, 500),
    });
  }

  // Print summary
  const duration = ((Date.now() - testResults.startTime) / 1000).toFixed(2);
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary:');
  console.log('='.repeat(60));
  console.log(`   Total Tests: ${testResults.total}`);
  console.log(`   ✅ Passed: ${testResults.passed}`);
  console.log(`   ❌ Failed: ${testResults.failed}`);
  console.log(`   ⏱️  Duration: ${duration}s`);
  console.log('='.repeat(60));

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach(({ test, error, details }) => {
      console.log(`\n   - ${test}`);
      if (error) console.log(`     Error: ${error}`);
      if (details && Object.keys(details).length > 0) {
        console.log(`     Details:`, JSON.stringify(details, null, 6));
      }
    });
    console.log('\n');
  }

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Driver login flow is working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, testDriverLogin, testSessionValidation };

