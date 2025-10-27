/**
 * Automated Login Test for All Drivers
 * Logs into driver dashboard for each driver sequentially
 */

const drivers = [
  { email: 'divyajan221@gmail.com', name: 'Divya Jain' },
  { email: 'siddharthmali.211@gmail.com', name: 'Siddharth Mali' },
  { email: 'priya.sharma@example.com', name: 'Priya Sharma' },
  { email: 'prathambhatt771@gmail.com', name: 'Pratham Bhat' },
  { email: 'amit.singh@example.com', name: 'Amit Singh' },
  { email: 'suresh.patel@example.com', name: 'Suresh Patel' },
];

// Test passwords to try (in order)
const TEST_PASSWORDS = [
  '15072002', // Found in driver_login_test.js
  'password123',
  'Test@123',
  'Driver@123',
];

const LOGIN_URL = 'http://localhost:5173/driver-login';
const DASHBOARD_URL = 'http://localhost:5173/driver-dashboard';

console.log('🚀 Starting automated driver login tests...\n');
console.log(`Found ${drivers.length} drivers to test\n`);

drivers.forEach((driver, index) => {
  console.log(`[${index + 1}/${drivers.length}] ${driver.name} (${driver.email})`);
});

console.log('\n📋 Instructions:');
console.log('1. Browser automation will attempt login for each driver');
console.log('2. If password fails, you may need to provide correct password');
console.log('3. Each driver will be tested sequentially');
console.log('\nStarting automation...\n');

module.exports = { drivers, TEST_PASSWORDS, LOGIN_URL, DASHBOARD_URL };

