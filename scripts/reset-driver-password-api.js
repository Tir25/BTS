/**
 * Script to reset driver password using the backend API
 * Usage: node scripts/reset-driver-password-api.js <email> <newPassword>
 * 
 * Example:
 * node scripts/reset-driver-password-api.js adhyarumohit@gmail.com "Mohit Adhyaru"
 */

const https = require('https');
const http = require('http');

// Get API URL from environment or use default
const API_URL = process.env.API_URL || 'http://localhost:3000';

async function resetDriverPassword(email, newPassword) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_URL}/api/auth/driver/reset-password`);
    
    const postData = JSON.stringify({
      email: email.trim(),
      newPassword: newPassword
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.success) {
            console.log('\n✅ Password reset successful!');
            console.log(`Email: ${email}`);
            console.log(`New Password: ${newPassword}`);
            console.log(`User ID: ${response.data.userId}\n`);
            resolve(response);
          } else {
            console.error('\n❌ Password reset failed:');
            console.error(`Status: ${res.statusCode}`);
            console.error(`Error: ${response.error || response.message || 'Unknown error'}\n`);
            reject(new Error(response.error || response.message || 'Password reset failed'));
          }
        } catch (error) {
          console.error('\n❌ Error parsing response:', error);
          console.error('Response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ Request error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node scripts/reset-driver-password-api.js <email> <newPassword>');
  console.error('\nExample:');
  console.error('  node scripts/reset-driver-password-api.js adhyarumohit@gmail.com "Mohit Adhyaru"');
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

console.log(`\n🔄 Resetting password for: ${email}`);
console.log(`API URL: ${API_URL}\n`);

resetDriverPassword(email, newPassword)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });

