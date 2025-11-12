require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getDriverSupabaseAdmin } = require('../dist/config/supabase/driverClient.js');

const TEST_PASSWORD = 'password123'; // Common test password

async function resetAllDriverPasswords() {
  try {
    const admin = getDriverSupabaseAdmin();
    
    // Get all active drivers from user_profiles
    const { data: drivers, error: driversError } = await admin
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('role', 'driver')
      .eq('is_active', true);
    
    if (driversError) {
      console.error('❌ Error fetching drivers:', driversError);
      process.exit(1);
    }
    
    if (!drivers || drivers.length === 0) {
      console.log('⚠️ No active drivers found');
      process.exit(0);
    }
    
    console.log(`\n🔐 Resetting passwords for ${drivers.length} drivers...\n`);
    console.log(`New password for all drivers: ${TEST_PASSWORD}\n`);
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const driver of drivers) {
      try {
        console.log(`🔄 Resetting password for: ${driver.email} (${driver.full_name})...`);
        
        const { data, error } = await admin.auth.admin.updateUserById(driver.id, {
          password: TEST_PASSWORD
        });
        
        if (error) {
          console.error(`  ❌ Failed: ${error.message}`);
          results.failed.push({ driver, error: error.message });
        } else {
          console.log(`  ✅ Success`);
          results.success.push(driver);
        }
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
        results.failed.push({ driver, error: err.message });
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Success: ${results.success.length}`);
    console.log(`  ❌ Failed: ${results.failed.length}`);
    
    if (results.success.length > 0) {
      console.log(`\n✅ Successfully reset passwords for:`);
      results.success.forEach(d => {
        console.log(`   - ${d.email} (${d.full_name})`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log(`\n❌ Failed to reset passwords for:`);
      results.failed.forEach(({ driver, error }) => {
        console.log(`   - ${driver.email}: ${error}`);
      });
    }
    
    console.log(`\n🔑 All drivers can now login with password: ${TEST_PASSWORD}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetAllDriverPasswords();

