/**
 * Script to delete orphaned driver auth user
 * This script removes the auth user for adhyarumohit@gmail.com
 * which exists in auth.users but not in user_profiles
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/.env.production') });
dotenv.config({ path: path.join(__dirname, '../backend/.env.local') });
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DRIVER_EMAIL = 'adhyarumohit@gmail.com';
const DRIVER_ID = '59349138-8d34-468c-a093-193af483473d';

async function deleteOrphanedDriver() {
  try {
    console.log('🔍 Checking for orphaned driver auth user...');
    console.log(`   Email: ${DRIVER_EMAIL}`);
    console.log(`   ID: ${DRIVER_ID}`);

    // Verify user exists in auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(DRIVER_ID);
    
    if (authError) {
      if (authError.message.includes('User not found')) {
        console.log('✅ User does not exist in auth.users - already deleted');
        return;
      }
      throw authError;
    }

    if (!authUser.user) {
      console.log('✅ User does not exist in auth.users - already deleted');
      return;
    }

    console.log('⚠️  Found orphaned auth user:');
    console.log(`   Email: ${authUser.user.email}`);
    console.log(`   ID: ${authUser.user.id}`);
    console.log(`   Created: ${authUser.user.created_at}`);
    console.log(`   Email confirmed: ${authUser.user.email_confirmed_at ? 'Yes' : 'No'}`);

    // Verify user does NOT exist in user_profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, role')
      .eq('id', DRIVER_ID)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    if (profile) {
      console.error('❌ ERROR: User exists in user_profiles!');
      console.error('   This is not an orphaned user. Use the deleteDriver function instead.');
      console.error('   Profile:', profile);
      process.exit(1);
    }

    console.log('✅ Confirmed: User does NOT exist in user_profiles (orphaned)');

    // Check for any related data
    console.log('🔍 Checking for related data...');
    
    const tables = [
      { name: 'live_locations', field: 'driver_id' },
      { name: 'locations', field: 'driver_id' },
      { name: 'trip_sessions', field: 'driver_id' },
      { name: 'driver_bus_assignments', field: 'driver_id' },
      { name: 'assignment_history', field: 'driver_id' },
      { name: 'shifts', field: 'driver_id' },
      { name: 'buses', field: 'assigned_driver_profile_id' },
      { name: 'audit_logs', field: 'user_id' },
    ];

    let hasRelatedData = false;
    for (const table of tables) {
      const { count, error } = await supabaseAdmin
        .from(table.name)
        .select('*', { count: 'exact', head: true })
        .eq(table.field, DRIVER_ID);

      if (error && error.code !== 'PGRST116') {
        console.warn(`   ⚠️  Could not check ${table.name}:`, error.message);
      } else if (count && count > 0) {
        console.warn(`   ⚠️  Found ${count} record(s) in ${table.name}`);
        hasRelatedData = true;
      }
    }

    if (!hasRelatedData) {
      console.log('✅ No related data found in database tables');
    }

    // Delete the auth user
    console.log('🗑️  Deleting auth user...');
    const { data: deleteData, error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(DRIVER_ID);

    if (deleteError) {
      throw deleteError;
    }

    console.log('✅ Successfully deleted auth user!');
    console.log('   User ID:', DRIVER_ID);
    console.log('   Email:', DRIVER_EMAIL);

    // Verify deletion
    console.log('🔍 Verifying deletion...');
    const { data: verifyUser, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(DRIVER_ID);
    
    if (verifyError && verifyError.message.includes('User not found')) {
      console.log('✅ Verification: User successfully deleted from auth.users');
    } else if (verifyUser.user) {
      console.error('❌ ERROR: User still exists after deletion!');
      process.exit(1);
    } else {
      console.log('✅ Verification: User successfully deleted');
    }

    console.log('\n✅ Cleanup complete!');
    console.log('   The orphaned driver auth user has been removed.');
    console.log('   Driver login should no longer cause authentication errors.');

  } catch (error) {
    console.error('❌ Error deleting orphaned driver:', error);
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    process.exit(1);
  }
}

// Run the script
deleteOrphanedDriver()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

