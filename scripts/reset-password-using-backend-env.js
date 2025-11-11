/**
 * Script to reset driver password using backend environment variables
 * This script reads the backend's .env file and uses Supabase Admin API directly
 * 
 * Usage: node scripts/reset-password-using-backend-env.js <email> <newPassword>
 * 
 * Example:
 * node scripts/reset-password-using-backend-env.js adhyarumohit@gmail.com "Mohit Adhyaru"
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Try to load environment variables from backend .env files
function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    });
    return env;
  }
  return {};
}

// Load environment variables
const backendEnvPath = path.resolve(__dirname, '../backend/.env.production');
const backendEnvLocalPath = path.resolve(__dirname, '../backend/.env.local');
const backendEnvPath2 = path.resolve(__dirname, '../backend/.env');

const env = {
  ...process.env,
  ...loadEnvFile(backendEnvPath),
  ...loadEnvFile(backendEnvLocalPath),
  ...loadEnvFile(backendEnvPath2),
};

// Get Supabase credentials
const DRIVER_SUPABASE_URL = env.DRIVER_SUPABASE_URL || env.SUPABASE_URL;
const DRIVER_SUPABASE_SERVICE_ROLE_KEY = env.DRIVER_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!DRIVER_SUPABASE_URL || !DRIVER_SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('   Please ensure the backend has DRIVER_SUPABASE_URL and DRIVER_SUPABASE_SERVICE_ROLE_KEY');
  console.error('   or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in environment variables');
  console.error('');
  console.error('   Checked files:');
  console.error(`   - ${backendEnvPath}`);
  console.error(`   - ${backendEnvLocalPath}`);
  console.error(`   - ${backendEnvPath2}`);
  console.error('');
  console.error('   Or set environment variables:');
  console.error('   - DRIVER_SUPABASE_URL');
  console.error('   - DRIVER_SUPABASE_SERVICE_ROLE_KEY');
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
    console.log(`📍 Supabase URL: ${DRIVER_SUPABASE_URL.substring(0, 30)}...`);
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

    // Trim password to prevent whitespace issues
    const trimmedPassword = newPassword.trim();

    if (trimmedPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long (after trimming)');
    }

    // Update user's password
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: trimmedPassword,
      }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError.message);
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    console.log('✅ Password reset successful!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${trimmedPassword}`);
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
  console.error('Usage: node scripts/reset-password-using-backend-env.js <email> <newPassword>');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/reset-password-using-backend-env.js adhyarumohit@gmail.com "Mohit Adhyaru"');
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
    console.log('   2. Clear browser cache and localStorage:');
    console.log('      - Press F12 to open DevTools');
    console.log('      - Go to Application tab');
    console.log('      - Clear Storage (localStorage, sessionStorage)');
    console.log('   3. Try logging in with the new password');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    console.error('');
    console.error('💡 Alternative solutions:');
    console.error('   1. Use Supabase Dashboard:');
    console.error('      - Go to https://supabase.com/dashboard');
    console.error('      - Select your driver project');
    console.error('      - Go to Authentication > Users');
    console.error('      - Find user: adhyarumohit@gmail.com');
    console.error('      - Click "Reset Password" or "Update User"');
    console.error('      - Set new password: Mohit Adhyaru');
    console.error('');
    console.error('   2. Wait for backend deployment to complete');
    console.error('      - Check Render dashboard for deployment status');
    console.error('      - Once deployed, use the password reset endpoint');
    console.error('');
    process.exit(1);
  });

