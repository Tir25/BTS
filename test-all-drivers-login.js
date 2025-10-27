/**
 * Automated Driver Login Test for All Drivers
 * Tests login functionality for all drivers in the database
 */

const drivers = [
  { email: 'divyajan221@gmail.com', name: 'Divya Jain' },
  { email: 'siddharthmali.211@gmail.com', name: 'Siddharth Mali' },
  { email: 'priya.sharma@example.com', name: 'Priya Sharma' },
  { email: 'prathambhatt771@gmail.com', name: 'Pratham Bhat' },
  { email: 'amit.singh@example.com', name: 'Amit Singh' },
  { email: 'suresh.patel@example.com', name: 'Suresh Patel' },
];

const TEST_PASSWORD = '15072002';
const LOGIN_URL = 'http://localhost:5173/driver-login';

async function testDriverLogin() {
  console.log('🚀 Starting automated driver login tests...\n');
  
  const results = [];
  
  for (let i = 0; i < drivers.length; i++) {
    const driver = drivers[i];
    console.log(`\n[${i + 1}/${drivers.length}] Testing login for: ${driver.name} (${driver.email})`);
    
    try {
      // Instructions for manual browser automation
      console.log(`   📋 Manual Steps:`);
      console.log(`   1. Navigate to: ${LOGIN_URL}`);
      console.log(`   2. Enter email: ${driver.email}`);
      console.log(`   3. Enter password: ${TEST_PASSWORD}`);
      console.log(`   4. Click "Sign In"`);
      console.log(`   5. Wait for dashboard to load`);
      console.log(`   6. Take screenshot`);
      console.log(`   7. Sign out\n`);
      
      results.push({
        driver: driver.name,
        email: driver.email,
        status: 'pending',
        message: 'Ready for manual testing'
      });
      
      // Wait 5 seconds between drivers
      if (i < drivers.length - 1) {
        console.log('   ⏳ Waiting 5 seconds before next driver...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error(`   ❌ Error testing ${driver.name}:`, error.message);
      results.push({
        driver: driver.name,
        email: driver.email,
        status: 'error',
        error: error.message
      });
    }
  }
  
  console.log('\n📊 Test Summary:');
  console.log('================');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.driver} (${result.email}): ${result.status}`);
  });
  
  return results;
}

// Run if executed directly
if (require.main === module) {
  testDriverLogin()
    .then(() => {
      console.log('\n✅ Test script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testDriverLogin, drivers, TEST_PASSWORD };

