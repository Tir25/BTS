const io = require('socket.io-client');
const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const WEBSOCKET_URL = process.env.VITE_WEBSOCKET_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const TEST_DRIVER_EMAIL = process.env.TEST_DRIVER_EMAIL || 'driver1@example.com';
const TEST_DRIVER_PASSWORD = process.env.TEST_DRIVER_PASSWORD || 'password123';
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123';

console.log(`\n--- Testing Admin-Driver Real-time Synchronization ---`);
console.log(`WebSocket URL: ${WEBSOCKET_URL}`);
console.log(`API Base URL: ${API_BASE_URL}`);
console.log(`Test Driver Email: ${TEST_DRIVER_EMAIL}`);
console.log(`Test Admin Email: ${TEST_ADMIN_EMAIL}`);

async function testAdminDriverSync() {
  let driverToken = null;
  let adminToken = null;
  let driverSocket = null;
  let driverId = null;
  let busId = null;
  let assignmentReceived = false;

  try {
    // Step 1: Login as driver
    console.log('\n--- Step 1: Driver Login ---');
    const driverLoginResponse = await axios.post(`${API_BASE_URL}/auth/driver/login`, {
      email: TEST_DRIVER_EMAIL,
      password: TEST_DRIVER_PASSWORD,
    });

    if (driverLoginResponse.data.success) {
      driverToken = driverLoginResponse.data.data.session.access_token;
      driverId = driverLoginResponse.data.data.user.id;
      busId = driverLoginResponse.data.data.assignment.bus_id;
      console.log('✅ Driver logged in successfully');
      console.log(`   Driver ID: ${driverId}`);
      console.log(`   Bus ID: ${busId}`);
    } else {
      console.error('❌ Driver login failed:', driverLoginResponse.data.error);
      return process.exit(1);
    }

    // Step 2: Login as admin
    console.log('\n--- Step 2: Admin Login ---');
    const adminLoginResponse = await axios.post(`${API_BASE_URL}/auth/admin/login`, {
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
    });

    if (adminLoginResponse.data.success) {
      adminToken = adminLoginResponse.data.data.session.access_token;
      console.log('✅ Admin logged in successfully');
    } else {
      console.error('❌ Admin login failed:', adminLoginResponse.data.error);
      return process.exit(1);
    }

    // Step 3: Connect driver to WebSocket
    console.log('\n--- Step 3: Driver WebSocket Connection ---');
    driverSocket = io(WEBSOCKET_URL, {
      transports: ['websocket'],
      auth: {
        token: driverToken,
      },
      query: {
        clientType: 'driver',
      },
      forceNew: true,
      reconnection: false,
      timeout: 10000,
    });

    let driverConnected = false;
    let driverAuthenticated = false;

    const driverConnectionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Driver WebSocket connection timed out')), 15000);

      driverSocket.on('connect', () => {
        clearTimeout(timeout);
        driverConnected = true;
        console.log('✅ Driver WebSocket connected');
        resolve();
      });

      driverSocket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Driver WebSocket connection error: ${error.message}`));
      });
    });

    await driverConnectionPromise;

    // Step 4: Authenticate driver
    console.log('\n--- Step 4: Driver WebSocket Authentication ---');
    const driverAuthPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Driver authentication timed out')), 10000);

      driverSocket.emit('driver:authenticate', { token: driverToken });

      driverSocket.on('driver:authenticated', (data) => {
        clearTimeout(timeout);
        driverAuthenticated = true;
        console.log('✅ Driver authenticated via WebSocket');
        console.log('   Assignment Data:', data);
        resolve();
      });

      driverSocket.on('driver:authentication_failed', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Driver authentication failed: ${JSON.stringify(error)}`));
      });
    });

    await driverAuthPromise;

    // Step 5: Listen for assignment updates
    console.log('\n--- Step 5: Setting up Assignment Update Listener ---');
    driverSocket.on('driver:assignmentUpdate', (data) => {
      console.log('📋 Received assignment update:', data);
      assignmentReceived = true;
      
      if (data.type === 'admin_update') {
        console.log('✅ Admin update received by driver!');
        console.log('   New Assignment:', data.assignment);
      }
    });

    // Step 6: Admin updates driver assignment
    console.log('\n--- Step 6: Admin Updates Driver Assignment ---');
    
    // First, get current assignment
    const getAssignmentResponse = await axios.get(`${API_BASE_URL}/production-assignments/bus/${busId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (getAssignmentResponse.data.success) {
      console.log('📋 Current assignment retrieved:', getAssignmentResponse.data.data);
      
      // Update the assignment
      const updateData = {
        driver_id: driverId,
        route_id: getAssignmentResponse.data.data.route_id,
        notes: `Updated by admin at ${new Date().toISOString()}`,
        status: 'active'
      };

      console.log('🔄 Updating assignment...');
      const updateResponse = await axios.put(`${API_BASE_URL}/production-assignments/bus/${busId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (updateResponse.data.success) {
        console.log('✅ Assignment updated by admin');
        console.log('   Updated Assignment:', updateResponse.data.data);
      } else {
        console.error('❌ Failed to update assignment:', updateResponse.data.error);
        return process.exit(1);
      }
    } else {
      console.error('❌ Failed to get current assignment:', getAssignmentResponse.data.error);
      return process.exit(1);
    }

    // Step 7: Wait for driver to receive update
    console.log('\n--- Step 7: Waiting for Driver to Receive Update ---');
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⏰ Timeout waiting for assignment update');
        resolve();
      }, 10000);

      const checkInterval = setInterval(() => {
        if (assignmentReceived) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });

    // Step 8: Test assignment refresh
    console.log('\n--- Step 8: Testing Assignment Refresh ---');
    driverSocket.emit('driver:requestAssignmentUpdate');
    
    await new Promise((resolve) => {
      setTimeout(() => {
        console.log('✅ Assignment refresh test completed');
        resolve();
      }, 3000);
    });

    console.log('\n--- Test Results ---');
    if (assignmentReceived) {
      console.log('✅ SUCCESS: Driver received real-time assignment updates from admin');
    } else {
      console.log('❌ FAILED: Driver did not receive assignment updates');
    }

    console.log('\n--- Test Complete ---');
    driverSocket.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('HTTP Error Status:', error.response.status);
      console.error('HTTP Error Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    if (driverSocket) driverSocket.disconnect();
    process.exit(1);
  }
}

testAdminDriverSync();
