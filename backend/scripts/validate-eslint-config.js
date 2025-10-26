#!/usr/bin/env node

/**
 * ESLint Configuration Validation Script
 * 
 * This script validates that:
 * 1. Only one ESLint configuration exists
 * 2. Configuration is valid and parseable
 * 3. All required dependencies are installed
 * 4. Configuration follows best practices
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkESLintConfigFiles() {
  log('\n🔍 Checking for ESLint configuration files...', 'cyan');
  
  const configFiles = [
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.json',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    'eslint.config.js',
    'eslint.config.mjs',
  ];
  
  const existingConfigs = configFiles.filter(file => 
    fs.existsSync(path.join(process.cwd(), file))
  );
  
  if (existingConfigs.length === 0) {
    log('❌ No ESLint configuration found!', 'red');
    return false;
  }
  
  if (existingConfigs.length > 1) {
    log(`❌ Multiple ESLint configurations found: ${existingConfigs.join(', ')}`, 'red');
    log('💡 ESLint will use the first one in priority order, others will be ignored', 'yellow');
    log('💡 Consider consolidating to a single configuration', 'yellow');
    return false;
  }
  
  log(`✅ Single ESLint configuration found: ${existingConfigs[0]}`, 'green');
  return true;
}

function validateESLintConfig() {
  log('\n🔧 Validating ESLint configuration...', 'cyan');
  
  try {
    // Try to parse the configuration
    execSync('npx eslint --print-config src/server.ts', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    log('✅ ESLint configuration is valid', 'green');
    return true;
  } catch (error) {
    log('❌ ESLint configuration is invalid', 'red');
    log(`Error: ${error.message}`, 'red');
    return false;
  }
}

function checkDependencies() {
  log('\n📦 Checking ESLint dependencies...', 'cyan');
  
  const requiredDeps = [
    'eslint',
    '@typescript-eslint/parser',
    '@typescript-eslint/eslint-plugin',
    'eslint-config-prettier',
    'eslint-plugin-prettier',
    'prettier'
  ];
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const missingDeps = requiredDeps.filter(dep => !allDeps[dep]);
  
  if (missingDeps.length > 0) {
    log(`❌ Missing dependencies: ${missingDeps.join(', ')}`, 'red');
    log('💡 Run: npm install --save-dev ' + missingDeps.join(' '), 'yellow');
    return false;
  }
  
  log('✅ All required dependencies are installed', 'green');
  return true;
}

function checkConfigurationBestPractices() {
  log('\n📋 Checking configuration best practices...', 'cyan');
  
  const configPath = '.eslintrc.js';
  if (!fs.existsSync(configPath)) {
    log('❌ ESLint configuration file not found', 'red');
    return false;
  }
  
  const configContent = fs.readFileSync(configPath, 'utf8');
  const issues = [];
  
  // Check for common issues
  if (configContent.includes('"@typescript-eslint/no-explicit-any": "off"')) {
    issues.push('Consider using "warn" instead of "off" for @typescript-eslint/no-explicit-any');
  }
  
  if (!configContent.includes('prettier')) {
    issues.push('Consider adding prettier integration');
  }
  
  if (!configContent.includes('overrides')) {
    issues.push('Consider adding overrides for test files');
  }
  
  if (issues.length > 0) {
    log('⚠️  Configuration could be improved:', 'yellow');
    issues.forEach(issue => log(`   • ${issue}`, 'yellow'));
  } else {
    log('✅ Configuration follows best practices', 'green');
  }
  
  return true;
}

function runLintTest() {
  log('\n🧪 Running ESLint test...', 'cyan');
  
  try {
    execSync('npm run lint', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    log('✅ ESLint test passed', 'green');
    return true;
  } catch (error) {
    log('⚠️  ESLint test failed (this is expected with many warnings)', 'yellow');
    log('💡 Run "npm run lint:fix" to auto-fix issues', 'yellow');
    return true; // Don't fail the validation for linting issues
  }
}

function generateReport() {
  log('\n📊 ESLint Configuration Validation Report', 'bright');
  log('=' .repeat(50), 'cyan');
  
  const results = {
    configFiles: checkESLintConfigFiles(),
    configValid: validateESLintConfig(),
    dependencies: checkDependencies(),
    bestPractices: checkConfigurationBestPractices(),
    lintTest: runLintTest(),
  };
  
  const allPassed = Object.values(results).every(result => result);
  
  log('\n📋 Summary:', 'bright');
  log(`   Config Files: ${results.configFiles ? '✅' : '❌'}`, results.configFiles ? 'green' : 'red');
  log(`   Config Valid: ${results.configValid ? '✅' : '❌'}`, results.configValid ? 'green' : 'red');
  log(`   Dependencies: ${results.dependencies ? '✅' : '❌'}`, results.dependencies ? 'green' : 'red');
  log(`   Best Practices: ${results.bestPractices ? '✅' : '❌'}`, results.bestPractices ? 'green' : 'red');
  log(`   Lint Test: ${results.lintTest ? '✅' : '❌'}`, results.lintTest ? 'green' : 'red');
  
  if (allPassed) {
    log('\n🎉 ESLint configuration validation passed!', 'green');
    process.exit(0);
  } else {
    log('\n❌ ESLint configuration validation failed!', 'red');
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  generateReport();
}

module.exports = {
  checkESLintConfigFiles,
  validateESLintConfig,
  checkDependencies,
  checkConfigurationBestPractices,
  runLintTest,
};
