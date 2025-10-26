#!/usr/bin/env node

/**
 * DEPLOYMENT CONFIGURATION VALIDATOR
 * Prevents deployment configuration conflicts
 * 
 * Validates:
 * - No duplicate deployment configurations
 * - Proper environment variable setup
 * - Build script consistency
 * - Configuration file completeness
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(title, 'cyan');
  log('='.repeat(60), 'cyan');
}

class DeploymentConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  // Check for duplicate Vercel configurations
  checkVercelConfig() {
    section('Checking Vercel Configuration');
    
    const rootVercel = path.join(frontendDir, '..', 'vercel.json');
    const frontendVercel = path.join(frontendDir, 'vercel.json');
    
    const rootExists = fs.existsSync(rootVercel);
    const frontendExists = fs.existsSync(frontendVercel);
    
    if (rootExists && frontendExists) {
      this.warnings.push(
        'Both root and frontend vercel.json exist. ' +
        'Root vercel.json is the primary configuration.'
      );
      log('⚠️  Duplicate vercel.json files found', 'yellow');
    } else if (rootExists) {
      log('✅ Root vercel.json found (primary config)', 'green');
    } else if (frontendExists) {
      log('✅ Frontend vercel.json found', 'green');
    } else {
      this.errors.push('No vercel.json configuration found');
      log('❌ No vercel.json found', 'red');
    }
  }

  // Check for Netlify configuration (should not exist)
  checkNetlifyConfig() {
    section('Checking Netlify Configuration');
    
    const netlifyFiles = [
      path.join(frontendDir, 'netlify.toml'),
      path.join(frontendDir, '_redirects'),
      path.join(frontendDir, '_headers'),
    ];
    
    let found = false;
    for (const file of netlifyFiles) {
      if (fs.existsSync(file)) {
        this.warnings.push(`Netlify configuration file found: ${file}`);
        log(`⚠️  Found Netlify config: ${file}`, 'yellow');
        found = true;
      }
    }
    
    if (!found) {
      log('✅ No Netlify configuration found (expected)', 'green');
    }
  }

  // Check Docker configuration
  checkDockerConfig() {
    section('Checking Docker Configuration');
    
    const dockerfile = path.join(frontendDir, 'Dockerfile');
    const nginxConf = path.join(frontendDir, 'nginx.conf');
    const dockerCompose = path.join(frontendDir, '..', 'deploy', 'docker-compose.yml');
    
    const checks = [
      { file: dockerfile, name: 'Dockerfile' },
      { file: nginxConf, name: 'nginx.conf' },
    ];
    
    let allPresent = true;
    for (const check of checks) {
      if (fs.existsSync(check.file)) {
        log(`✅ ${check.name} found`, 'green');
      } else {
        log(`⚠️  ${check.name} not found`, 'yellow');
        allPresent = false;
      }
    }
    
    if (fs.existsSync(dockerCompose)) {
      log('✅ docker-compose.yml found', 'green');
    }
  }

  // Check build scripts
  checkBuildScripts() {
    section('Checking Build Scripts');
    
    const packageJsonPath = path.join(frontendDir, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.errors.push('package.json not found');
      return;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const scripts = packageJson.scripts || {};
    
    const requiredScripts = [
      'build',
      'build:vercel',
      'build:docker',
      'dev',
    ];
    
    const optionalScripts = [
      'build:render',
      'build:optimized',
      'preview',
    ];
    
    for (const script of requiredScripts) {
      if (scripts[script]) {
        log(`✅ ${script} script found`, 'green');
      } else {
        this.warnings.push(`Missing required script: ${script}`);
        log(`⚠️  Missing script: ${script}`, 'yellow');
      }
    }
    
    for (const script of optionalScripts) {
      if (scripts[script]) {
        log(`✅ ${script} script found (optional)`, 'green');
      }
    }
  }

  // Check environment files
  checkEnvironmentFiles() {
    section('Checking Environment Configuration');
    
    const envFiles = [
      { file: '.env.template', name: 'Template', required: true },
      { file: '.env.local', name: 'Local', required: false },
      { file: '.env.production', name: 'Production', required: false },
    ];
    
    for (const envFile of envFiles) {
      const filePath = path.join(frontendDir, envFile.file);
      if (fs.existsSync(filePath)) {
        log(`✅ ${envFile.name} env file found`, 'green');
      } else if (envFile.required) {
        this.warnings.push(`Missing ${envFile.name} env file`);
        log(`⚠️  Missing ${envFile.name} env file`, 'yellow');
      }
    }
  }

  // Check for conflicting deployment configurations
  checkConflicts() {
    section('Checking for Configuration Conflicts');
    
    const vercelJson = path.join(frontendDir, 'vercel.json');
    const netlifyToml = path.join(frontendDir, 'netlify.toml');
    
    // Check for conflicting deployment platforms
    if (fs.existsSync(vercelJson) && fs.existsSync(netlifyToml)) {
      this.errors.push(
        'Conflicting deployment configurations: ' +
        'Both vercel.json and netlify.toml exist'
      );
      log('❌ Conflicting deployment configs found', 'red');
    } else {
      log('✅ No deployment configuration conflicts', 'green');
    }
  }

  // Validate environment variables in template
  validateEnvTemplate() {
    section('Validating Environment Template');
    
    const envTemplate = path.join(frontendDir, '.env.template');
    
    if (!fs.existsSync(envTemplate)) {
      this.warnings.push('.env.template not found');
      return;
    }
    
    const content = fs.readFileSync(envTemplate, 'utf8');
    const requiredVars = [
      'VITE_API_URL',
      'VITE_WEBSOCKET_URL',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
    ];
    
    for (const variable of requiredVars) {
      if (content.includes(variable)) {
        log(`✅ Required variable found: ${variable}`, 'green');
      } else {
        this.errors.push(`Missing required variable in template: ${variable}`);
        log(`❌ Missing variable: ${variable}`, 'red');
      }
    }
  }

  // Run all validation checks
  validate() {
    log('\n🔍 DEPLOYMENT CONFIGURATION VALIDATOR', 'blue');
    log('=====================================\n', 'blue');
    
    this.checkVercelConfig();
    this.checkNetlifyConfig();
    this.checkDockerConfig();
    this.checkBuildScripts();
    this.checkEnvironmentFiles();
    this.checkConflicts();
    this.validateEnvTemplate();
    
    this.printSummary();
    
    return this.errors.length === 0;
  }

  printSummary() {
    section('Validation Summary');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      log('🎉 All checks passed!', 'green');
      log('Deployment configuration is valid.', 'green');
      return;
    }
    
    if (this.errors.length > 0) {
      log(`\n❌ Errors Found (${this.errors.length}):`, 'red');
      this.errors.forEach(error => {
        log(`  • ${error}`, 'red');
      });
    }
    
    if (this.warnings.length > 0) {
      log(`\n⚠️  Warnings (${this.warnings.length}):`, 'yellow');
      this.warnings.forEach(warning => {
        log(`  • ${warning}`, 'yellow');
      });
    }
    
    log('\n📋 Recommendations:', 'blue');
    if (this.errors.length > 0) {
      log('  • Fix all errors before deploying', 'blue');
    }
    if (this.warnings.length > 0) {
      log('  • Review warnings and address as needed', 'blue');
    }
    log('  • See frontend/DEPLOYMENT_GUIDE.md for details', 'blue');
  }
}

// Run validation
const validator = new DeploymentConfigValidator();
const isValid = validator.validate();

process.exit(isValid ? 0 : 1);
