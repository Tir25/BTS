/**
 * Script to reset driver password using the PRODUCTION backend API
 * Usage: node scripts/reset-driver-password-production.js <email> <newPassword>
 * 
 * Example:
 * node scripts/reset-driver-password-production.js adhyarumohit@gmail.com "Mohit Adhyaru"
 */

const https = require('https');
const http = require('http');

// Production backend API URL
const PRODUCTION_API_URL = 'https://bus-tracking-backend-sxh8.onrender.com';

async function resetDriverPassword(email, newPassword) {
  return new Promise((resolve, reject) => {
    // Try both /api/auth and /auth paths (depending on deployment configuration)
    const url = new URL(`${PRODUCTION_API_URL}/auth/driver/reset-password`);
    
    const postData = JSON.stringify({
      email: email.trim(),
      newPassword: newPassword
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000 // 30 second timeout
    };

    console.log(`\n🔄 Resetting password for: ${email}`);
    console.log(`📍 Production API: ${PRODUCTION_API_URL}`);
    console.log(`📤 Sending request...\n`);

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.success) {
            console.log('✅ Password reset successful!');
            console.log(`📧 Email: ${email}`);
            console.log(`🔑 New Password: ${newPassword}`);
            console.log(`👤 User ID: ${response.data.userId}`);
            console.log(`⏰ Timestamp: ${response.timestamp}\n`);
            resolve(response);
          } else {
            console.error('❌ Password reset failed:');
            console.error(`   Status: ${res.statusCode}`);
            console.error(`   Error: ${response.error || response.message || 'Unknown error'}`);
            if (response.code) {
              console.error(`   Code: ${response.code}`);
            }
            console.error('');
            reject(new Error(response.error || response.message || 'Password reset failed'));
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error.message);
          console.error('Response:', data);
          console.error('');
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      console.error('   This could be a network issue or the backend might be down.');
      console.error('');
      reject(error);
    });

    req.on('timeout', () => {
      console.error('❌ Request timeout: The backend did not respond in time.');
      console.error('   The backend might be sleeping (Render free tier) or experiencing issues.');
      console.error('');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node scripts/reset-driver-password-production.js <email> <newPassword>');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/reset-driver-password-production.js adhyarumohit@gmail.com "Mohit Adhyaru"');
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
    console.error('💡 Troubleshooting:');
    console.error('   - Check if the backend is running and accessible');
    console.error('   - Verify the email address is correct');
    console.error('   - Check backend logs for any errors');
    console.error('   - If using Render free tier, the backend might be sleeping');
    console.error('');
    process.exit(1);
  });

