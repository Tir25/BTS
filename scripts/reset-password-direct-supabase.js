/**
 * Script to reset driver password directly using Supabase Admin API
 * This bypasses the backend and uses Supabase directly
 * 
 * Usage: node scripts/reset-password-direct-supabase.js <email> <newPassword>
 * 
 * Requires: DRIVER_SUPABASE_URL and DRIVER_SUPABASE_SERVICE_ROLE_KEY environment variables
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env.production') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env.local') });

const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment
const DRIVER_SUPABASE_URL = process.env.DRIVER_SUPABASE_URL || process.env.SUPABASE_URL;
const DRIVER_SUPABASE_SERVICE_ROLE_KEY = process.env.DRIVER_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DRIVER_SUPABASE_URL || !DRIVER_SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('   Please set DRIVER_SUPABASE_URL and DRIVER_SUPABASE_SERVICE_ROLE_KEY');
  console.error('   or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

// Create Supabase admin client
const supabaseAdmin = createClient(DRIVER_SUPABASE_URL, DRIVER_SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetDriverPassword(email, newPassword) {
  try {
    console.log(`\n🔄 Resetting password for: ${email}`);
    console.log(`📍 Supabase URL: ${DRIVER_SUPABASE_URL}`);
    console.log(`📤 Getting user list...\n`);

    // Get all users to find the one with the email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    // Find user by email
    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      throw new Error(`User with email ${email} not found`);
    }

    console.log(`✅ User found: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`\n📤 Updating password...\n`);

    // Update user's password
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword.trim(),
      }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError.message);
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    console.log('✅ Password reset successful!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`👤 User ID: ${updatedUser.user.id}`);
    console.log(`⏰ Updated: ${new Date().toISOString()}\n`);

    return { success: true, user: updatedUser.user };
  } catch (error) {
    console.error('\n❌ Password reset failed:', error.message);
    console.error('');
    throw error;
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node scripts/reset-password-direct-supabase.js <email> <newPassword>');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/reset-password-direct-supabase.js adhyarumohit@gmail.com "Mohit Adhyaru"');
  console.error('');
  console.error('Environment variables required:');
  console.error('  - DRIVER_SUPABASE_URL or SUPABASE_URL');
  console.error('  - DRIVER_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  process.exit(1);
}

const [email, newPassword] = args;

if (!email || !newPassword) {
  console.error('Error: Email and new password are required');
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error('Error: Password must be at least 6 characters long');
  process.exit(1);
}

resetDriverPassword(email, newPassword)
  .then(() => {
    console.log('✅ Script completed successfully');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Wait a few seconds for the password to be updated');
    console.log('   2. Clear browser cache and localStorage');
    console.log('   3. Try logging in with the new password');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    console.error('');
    process.exit(1);
  });

