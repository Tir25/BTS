/**
 * Script to reset driver password
 * Usage: ts-node scripts/reset-driver-password.ts <email> <newPassword>
 */

import { getDriverSupabaseAdmin } from '../src/config/supabase';
import { logger } from '../src/utils/logger';

async function resetDriverPassword(email: string, newPassword: string) {
  try {
    logger.info('🔄 Starting password reset process', 'script', { email });
    
    const driverSupabaseAdmin = getDriverSupabaseAdmin();
    
    // First, get the user by email
    const { data: users, error: listError } = await driverSupabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      logger.error('❌ Error listing users', 'script', { error: listError.message });
      throw new Error(`Failed to list users: ${listError.message}`);
    }
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      logger.error('❌ User not found', 'script', { email });
      throw new Error(`User with email ${email} not found`);
    }
    
    logger.info('✅ User found', 'script', { userId: user.id, email: user.email });
    
    // Update the user's password
    const { data: updatedUser, error: updateError } = await driverSupabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
      }
    );
    
    if (updateError) {
      logger.error('❌ Error updating password', 'script', { error: updateError.message });
      throw new Error(`Failed to update password: ${updateError.message}`);
    }
    
    logger.info('✅ Password reset successful', 'script', { 
      userId: updatedUser.user.id, 
      email: updatedUser.user.email 
    });
    
    console.log('\n✅ Password reset successful!');
    console.log(`Email: ${email}`);
    console.log(`New Password: ${newPassword}`);
    console.log(`User ID: ${updatedUser.user.id}\n`);
    
    return { success: true, user: updatedUser.user };
  } catch (error) {
    logger.error('❌ Password reset failed', 'script', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    console.error('\n❌ Password reset failed:', error);
    throw error;
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: ts-node scripts/reset-driver-password.ts <email> <newPassword>');
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
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

