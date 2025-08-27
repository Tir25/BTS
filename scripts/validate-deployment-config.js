#!/usr/bin/env node

/**
 * Deployment Configuration Validator
 * Validates vercel.json and render.yaml configurations
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Deployment Configurations...\n');

// Check if required files exist
const requiredFiles = [
  'frontend/vercel.json',
  'render.yaml',
  'frontend/package.json',
  'backend/package.json'
];

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
  }
});

// Validate Vercel configuration
console.log('\n🚀 Validating Vercel Configuration:');
try {
  const vercelConfig = JSON.parse(fs.readFileSync('frontend/vercel.json', 'utf8'));
  
  // Check version
  if (vercelConfig.version !== 2) {
    console.log('  ⚠️  Vercel version should be 2');
  } else {
    console.log('  ✅ Version: 2');
  }
  
  // Check builds configuration
  if (vercelConfig.builds && vercelConfig.builds.length > 0) {
    const build = vercelConfig.builds[0];
    if (build.src === 'package.json' && build.config.distDir === 'dist') {
      console.log('  ✅ Build configuration correct');
    } else {
      console.log('  ❌ Build configuration incorrect');
    }
  }
  
  // Check routes
  if (vercelConfig.routes && vercelConfig.routes.length > 0) {
    console.log('  ✅ Routes configured');
  }
  
  // Check rewrites for SPA
  if (vercelConfig.rewrites && vercelConfig.rewrites.length > 0) {
    console.log('  ✅ SPA rewrites configured');
  }
  
} catch (error) {
  console.log(`  ❌ Error parsing vercel.json: ${error.message}`);
}

// Validate Render configuration
console.log('\n🎯 Validating Render Configuration:');
try {
  const renderConfig = fs.readFileSync('render.yaml', 'utf8');
  
  // Check for backend service
  if (renderConfig.includes('bus-tracking-backend')) {
    console.log('  ✅ Backend service configured');
  } else {
    console.log('  ❌ Backend service missing');
  }
  
  // Check for frontend service
  if (renderConfig.includes('bus-tracking-frontend')) {
    console.log('  ✅ Frontend service configured');
  } else {
    console.log('  ❌ Frontend service missing');
  }
  
  // Check frontend service type
  if (renderConfig.includes('type: static')) {
    console.log('  ✅ Frontend service type: static');
  } else {
    console.log('  ❌ Frontend service should be type: static');
  }
  
  // Check for required environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'VITE_API_URL',
    'VITE_WEBSOCKET_URL'
  ];
  
  console.log('  📋 Checking environment variables:');
  requiredEnvVars.forEach(envVar => {
    if (renderConfig.includes(envVar)) {
      console.log(`    ✅ ${envVar}`);
    } else {
      console.log(`    ❌ ${envVar} - MISSING`);
    }
  });
  
} catch (error) {
  console.log(`  ❌ Error parsing render.yaml: ${error.message}`);
}

// Check package.json scripts
console.log('\n📦 Validating Package.json Scripts:');

// Frontend scripts
try {
  const frontendPkg = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
  const requiredFrontendScripts = ['build', 'start'];
  
  requiredFrontendScripts.forEach(script => {
    if (frontendPkg.scripts[script]) {
      console.log(`  ✅ Frontend ${script} script: ${frontendPkg.scripts[script]}`);
    } else {
      console.log(`  ❌ Frontend ${script} script missing`);
    }
  });
} catch (error) {
  console.log(`  ❌ Error parsing frontend/package.json: ${error.message}`);
}

// Backend scripts
try {
  const backendPkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
  const requiredBackendScripts = ['build', 'start'];
  
  requiredBackendScripts.forEach(script => {
    if (backendPkg.scripts[script]) {
      console.log(`  ✅ Backend ${script} script: ${backendPkg.scripts[script]}`);
    } else {
      console.log(`  ❌ Backend ${script} script missing`);
    }
  });
} catch (error) {
  console.log(`  ❌ Error parsing backend/package.json: ${error.message}`);
}

// Check for conflicting configurations
console.log('\n⚠️  Checking for Configuration Conflicts:');

// Check for root-level vercel.json
if (fs.existsSync('vercel.json')) {
  const rootVercel = fs.readFileSync('vercel.json', 'utf8');
  if (rootVercel.includes('frontend/package.json')) {
    console.log('  ⚠️  Root-level vercel.json conflicts with frontend/vercel.json');
  }
}

// Check for multiple deployment configs
const deploymentConfigs = [
  'vercel.json',
  'frontend/vercel.json', 
  'render.yaml',
  'netlify.toml'
];

const existingConfigs = deploymentConfigs.filter(config => fs.existsSync(config));
console.log(`  📊 Found ${existingConfigs.length} deployment configurations: ${existingConfigs.join(', ')}`);

console.log('\n✅ Configuration validation complete!');
console.log('\n📋 Next Steps:');
console.log('  1. Set environment variables in Render dashboard');
console.log('  2. Deploy backend to Render');
console.log('  3. Deploy frontend to Vercel');
console.log('  4. Test API connectivity');
console.log('  5. Test WebSocket connections');
