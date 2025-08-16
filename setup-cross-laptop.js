const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return null;
}

function updateEnvironmentFile(filePath, backendIP) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update API URL
    content = content.replace(
      /VITE_API_URL=.*/g,
      `VITE_API_URL=http://${backendIP}:3000`
    );
    
    // Update WebSocket URL
    content = content.replace(
      /VITE_WEBSOCKET_URL=.*/g,
      `VITE_WEBSOCKET_URL=ws://${backendIP}:3000`
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Cross-Laptop Setup Helper');
  console.log('============================');
  
  const localIP = getLocalIPAddress();
  
  if (!localIP) {
    console.log('❌ Could not find local IP address');
    return;
  }
  
  console.log(`📍 Your local IP address: ${localIP}`);
  console.log('');
  
  // Check if this is the backend laptop
  const backendEnvPath = path.join(__dirname, 'backend', 'env.development');
  if (fs.existsSync(backendEnvPath)) {
    console.log('🖥️  This appears to be the BACKEND laptop');
    console.log(`📡 Backend will be accessible at: http://${localIP}:3000`);
    console.log(`🔌 WebSocket will be accessible at: ws://${localIP}:3000`);
    console.log('');
    console.log('📋 Instructions for FRONTEND laptop:');
    console.log(`1. Update frontend/env.local with:`);
    console.log(`   VITE_API_URL=http://${localIP}:3000`);
    console.log(`   VITE_WEBSOCKET_URL=ws://${localIP}:3000`);
    console.log('');
    console.log('2. Start backend on this laptop:');
    console.log('   cd backend && npm start');
  } else {
    console.log('💻 This appears to be the FRONTEND laptop');
    console.log('');
    
    // Ask for backend IP
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('🔗 Enter the BACKEND laptop IP address: ', (backendIP) => {
      rl.close();
      
      if (!backendIP) {
        console.log('❌ No IP address provided');
        return;
      }
      
      console.log('');
      console.log('🔄 Updating environment files...');
      
      const frontendEnvPath = path.join(__dirname, 'frontend', 'env.local');
      if (fs.existsSync(frontendEnvPath)) {
        updateEnvironmentFile(frontendEnvPath, backendIP);
      } else {
        console.log('❌ frontend/env.local not found');
      }
      
      console.log('');
      console.log('✅ Setup complete!');
      console.log(`🌐 Frontend will connect to: http://${backendIP}:3000`);
      console.log(`🔌 WebSocket will connect to: ws://${backendIP}:3000`);
      console.log('');
      console.log('🚀 Start frontend with: cd frontend && npm run dev');
    });
  }
}

main();
