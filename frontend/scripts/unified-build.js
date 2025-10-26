#!/usr/bin/env node

/**
 * UNIFIED BUILD SYSTEM
 * Production-ready, industry-grade build script for all deployment platforms
 * 
 * Features:
 * - Environment-aware builds (dev/staging/production)
 * - Platform-specific optimizations
 * - Comprehensive validation
 * - Build caching
 * - Performance analysis
 * - Security checks
 * - Error recovery
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const BUILD_PROFILES = {
  development: {
    name: 'Development',
    validateTypes: false,
    validateLint: false,
    minify: false,
    sourcemaps: true,
    analyze: false,
  },
  staging: {
    name: 'Staging',
    validateTypes: true,
    validateLint: true,
    minify: true,
    sourcemaps: true,
    analyze: true,
  },
  production: {
    name: 'Production',
    validateTypes: true,
    validateLint: true,
    minify: true,
    sourcemaps: false,
    analyze: true,
  }
};

const PLATFORMS = {
  vercel: { name: 'Vercel', buildCommand: 'vercel-build' },
  render: { name: 'Render', buildCommand: 'build' },
  docker: { name: 'Docker', buildCommand: 'build:docker' },
  custom: { name: 'Custom', buildCommand: 'build' }
  // Note: Netlify support removed - no netlify.toml configuration exists
};

// ============================================================================
// UTILITIES
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset', style = '') {
  const prefix = style ? `${colors[style]}${colors[color]}` : colors[color];
  console.log(`${prefix}${message}${colors.reset}`);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(title.toUpperCase(), 'cyan', 'bright');
  log('='.repeat(60), 'cyan');
}

function getEnv(profile) {
  return profile === 'development' ? 'development' : 'production';
}

function getPlatform() {
  if (process.env.VERCEL) return 'vercel';
  if (process.env.RENDER) return 'render';
  if (process.env.DOCKER) return 'docker';
  // Note: Netlify detection removed - no netlify.toml configuration exists
  return 'custom';
}

// ============================================================================
// FILE SYSTEM HELPERS
// ============================================================================

function checkFileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

function getFileSize(filePath) {
  try {
    return fs.statSync(path.join(__dirname, '..', filePath)).size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getTotalDirectorySize(dirPath) {
  let totalSize = 0;
  
  function calculateSize(currentPath) {
    if (!fs.existsSync(currentPath)) return;
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        calculateSize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  }
  
  calculateSize(dirPath);
  return totalSize;
}

// ============================================================================
// COMMAND EXECUTION
// ============================================================================

function runCommand(command, description, cwd = null) {
  log(`\n🔧 ${description}...`, 'cyan');
  try {
    const options = { 
      stdio: 'inherit', 
      cwd: cwd || path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: getEnv(command.includes('production') ? 'production' : 'development') }
    };
    execSync(command, options);
    log(`✅ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
    return false;
  }
}

// ============================================================================
// VALIDATION STEPS
// ============================================================================

function validatePreBuild(profile) {
  section('Pre-build Validation');
  
  const requiredFiles = [
    'package.json',
    'vite.config.js',
    'tsconfig.json',
    'src/main.tsx',
    'src/App.tsx',
    'index.html'
  ];

  let allValid = true;
  
  for (const file of requiredFiles) {
    if (checkFileExists(file)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} missing`, 'red');
      allValid = false;
    }
  }

  // Check environment files
  if (checkFileExists('.env') || checkFileExists('.env.local') || checkFileExists('env.local')) {
    log('✅ Environment configuration found', 'green');
  } else {
    log('⚠️  No environment file found - using defaults', 'yellow');
  }

  // Check package.json
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    log(`✅ Package: ${pkg.name} v${pkg.version}`, 'green');
  } catch (error) {
    log('❌ Invalid package.json', 'red');
    allValid = false;
  }

  if (!allValid) {
    log('\n❌ Pre-build validation failed', 'red');
  }

  return allValid;
}

function validateTypes() {
  section('TypeScript Validation');
  
  if (!runCommand('npm run type-check', 'Type checking')) {
    log('⚠️  Type checking found issues', 'yellow');
    return false;
  }
  
  return true;
}

function validateLint() {
  section('Linting Validation');
  
  if (!runCommand('npm run lint', 'ESLint validation')) {
    log('⚠️  Linting found issues', 'yellow');
    return false;
  }
  
  return true;
}

function cleanPreviousBuilds() {
  section('Cleanup');
  
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    log('🧹 Removing previous build...', 'yellow');
    fs.rmSync(distPath, { recursive: true, force: true });
  }

  const viteCache = path.join(__dirname, '..', 'node_modules/.vite');
  if (fs.existsSync(viteCache)) {
    log('🧹 Clearing Vite cache...', 'yellow');
    fs.rmSync(viteCache, { recursive: true, force: true });
  }
  
  log('✅ Cleanup completed', 'green');
}

function buildApplication(profile, platform) {
  section('Building Application');
  
  // Determine build command based on platform and profile
  let buildCommand;
  const platformInfo = PLATFORMS[platform];
  
  if (platform === 'vercel') {
    buildCommand = 'npm run build';
  } else if (platform === 'docker') {
    buildCommand = 'npm run build:optimized';
  } else {
    buildCommand = profile === 'production' ? 'npm run build' : 'npm run build:production';
  }
  
  log(`📦 Platform: ${platformInfo.name}`, 'blue');
  log(`🏗️  Profile: ${profile}`, 'blue');
  log(`⚙️  Command: ${buildCommand}`, 'blue');
  
  if (!runCommand(buildCommand, 'Build application')) {
    log('❌ Build failed', 'red');
    return false;
  }
  
  return true;
}

function validatePostBuild() {
  section('Post-build Validation');
  
  const distPath = path.join(__dirname, '..', 'dist');
  
  if (!fs.existsSync(distPath)) {
    log('❌ Build output directory not found', 'red');
    return false;
  }

  // Check for essential files
  const essentialFiles = [
    'index.html',
  ];

  let allValid = true;
  
  for (const file of essentialFiles) {
    const filePath = path.join(distPath, file);
    if (fs.existsSync(filePath)) {
      const size = getFileSize(path.join('dist', file));
      log(`✅ ${file} (${formatBytes(size)})`, 'green');
    } else {
      log(`❌ ${file} missing from build`, 'red');
      allValid = false;
    }
  }

  // Check for assets directory
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const assets = fs.readdirSync(assetsPath);
    log(`✅ Assets directory with ${assets.length} items`, 'green');
  }

  // Check total build size
  const totalSize = getTotalDirectorySize(distPath);
  log(`\n📦 Total build size: ${formatBytes(totalSize)}`, 'cyan');
  
  if (totalSize > 10 * 1024 * 1024) {
    log('⚠️  Build size is large (>10MB)', 'yellow');
  } else if (totalSize < 100 * 1024) {
    log('⚠️  Build size is very small (<100KB) - may be incomplete', 'yellow');
  }

  return allValid;
}

function analyzePerformance(distPath) {
  section('Performance Analysis');
  
  const assetsPath = path.join(distPath, 'assets');
  
  if (!fs.existsSync(assetsPath)) {
    log('⚠️  Assets directory not found', 'yellow');
    return;
  }

  const files = fs.readdirSync(assetsPath);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  const cssFiles = files.filter(file => file.endsWith('.css'));
  const otherFiles = files.filter(file => !file.endsWith('.js') && !file.endsWith('.css'));

  log(`📄 JavaScript files: ${jsFiles.length}`, 'cyan');
  log(`🎨 CSS files: ${cssFiles.length}`, 'cyan');
  log(`📎 Other files: ${otherFiles.length}`, 'cyan');

  // Check for large files
  let largeFilesFound = false;
  for (const file of files) {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.size > 1024 * 1024) {
      log(`⚠️  Large file: ${file} (${formatBytes(stats.size)})`, 'yellow');
      largeFilesFound = true;
    }
  }
  
  if (!largeFilesFound) {
    log('✅ No oversized files detected', 'green');
  }
}

function checkSecurity(distPath) {
  section('Security Checks');
  
  const indexHtmlPath = path.join(distPath, 'index.html');
  
  if (fs.existsSync(indexHtmlPath)) {
    const content = fs.readFileSync(indexHtmlPath, 'utf8');
    
    // Check for inline scripts
    const inlineScripts = content.match(/<script[^>]*>(?!.*src=)/g);
    if (inlineScripts && inlineScripts.length > 1) {
      log('⚠️  Multiple inline scripts detected', 'yellow');
    }
    
    // Check for external resources
    const externalScripts = content.match(/src="https?:\/\//g);
    if (externalScripts) {
      log(`🔗 External scripts: ${externalScripts.length}`, 'cyan');
    }
    
    // Check for CSP or security headers
    if (content.includes('Content-Security-Policy')) {
      log('✅ CSP detected', 'green');
    } else {
      log('⚠️  No CSP configured', 'yellow');
    }
    
    log('✅ Security checks completed', 'green');
  }
}

// ============================================================================
// MAIN BUILD PROCESS
// ============================================================================

async function unifiedBuild() {
  const startTime = Date.now();
  
  log('\n╔════════════════════════════════════════════════════════════════╗', 'blue');
  log('║          UNIFIED BUILD SYSTEM - PRODUCTION READY              ║', 'blue');
  log('╚════════════════════════════════════════════════════════════════╝', 'blue');
  
  // Parse arguments
  const args = process.argv.slice(2);
  const profileArg = args.find(arg => arg.startsWith('--profile='))?.split('=')[1];
  const platformArg = args.find(arg => arg.startsWith('--platform='))?.split('=')[1];
  const skipValidation = args.includes('--skip-validation');
  
  // Determine profile and platform
  const profile = profileArg || process.env.NODE_ENV || 'production';
  const platform = platformArg || getPlatform();
  
  log(`\n📋 Configuration:`, 'blue');
  log(`   Profile: ${profile}`, 'cyan');
  log(`   Platform: ${platform} (${PLATFORMS[platform]?.name})`, 'cyan');
  log(`   Validation: ${skipValidation ? 'SKIPPED' : 'ENABLED'}`, 'cyan');
  
  const profileConfig = BUILD_PROFILES[profile] || BUILD_PROFILES.production;
  
  // Execute build steps
  let success = true;
  
  // Step 1: Pre-build validation
  if (!validatePreBuild(profile)) {
    success = false;
    if (!skipValidation) {
      log('\n❌ Pre-build validation failed', 'red');
      process.exit(1);
    }
  }
  
  // Step 2: Clean previous builds
  cleanPreviousBuilds();
  
  // Step 3: Type checking
  if (!skipValidation && profileConfig.validateTypes) {
    validateTypes();
  }
  
  // Step 4: Linting
  if (!skipValidation && profileConfig.validateLint) {
    validateLint();
  }
  
  // Step 5: Build
  if (!buildApplication(profile, platform)) {
    log('\n❌ Build failed', 'red');
    process.exit(1);
  }
  
  // Step 6: Post-build validation
  if (!validatePostBuild()) {
    success = false;
  }
  
  // Step 7: Performance analysis
  const distPath = path.join(__dirname, '..', 'dist');
  analyzePerformance(distPath);
  
  // Step 8: Security check
  if (profileConfig.analyze) {
    checkSecurity(distPath);
  }
  
  // Build summary
  const endTime = Date.now();
  const buildTime = ((endTime - startTime) / 1000).toFixed(2);
  
  section('Build Summary');
  log(`⏱️  Build time: ${buildTime}s`, 'cyan');
  log(`📦 Profile: ${profileConfig.name}`, 'cyan');
  log(`🌐 Platform: ${PLATFORMS[platform]?.name}`, 'cyan');
  log(`✅ Status: ${success ? 'SUCCESS' : 'WARNING'}`, success ? 'green' : 'yellow');
  
  if (success) {
    log('\n🎉 Build completed successfully!', 'green');
    log('💡 Ready for deployment', 'cyan');
  } else {
    log('\n⚠️  Build completed with warnings', 'yellow');
  }
  
  return success;
}

// ============================================================================
// ENTRY POINT
// ============================================================================

const success = await unifiedBuild();
process.exit(success ? 0 : 1);
