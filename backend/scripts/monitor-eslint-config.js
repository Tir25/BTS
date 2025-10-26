#!/usr/bin/env node

/**
 * ESLint Configuration Monitoring Script
 * 
 * This script monitors for:
 * 1. Multiple ESLint configurations
 * 2. Configuration changes
 * 3. Dependency updates
 * 4. Rule violations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration monitoring
const CONFIG_MONITOR_FILE = '.eslint-config-monitor.json';

function loadMonitorData() {
  if (fs.existsSync(CONFIG_MONITOR_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_MONITOR_FILE, 'utf8'));
  }
  return {
    lastCheck: null,
    configHash: null,
    violations: [],
    dependencies: {}
  };
}

function saveMonitorData(data) {
  fs.writeFileSync(CONFIG_MONITOR_FILE, JSON.stringify(data, null, 2));
}

function getConfigHash() {
  const configFiles = ['.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json'];
  const existingConfigs = configFiles.filter(file => fs.existsSync(file));
  
  if (existingConfigs.length === 0) return null;
  
  const configContent = fs.readFileSync(existingConfigs[0], 'utf8');
  return require('crypto').createHash('md5').update(configContent).digest('hex');
}

function checkForMultipleConfigs() {
  const configFiles = [
    '.eslintrc.js',
    '.eslintrc.cjs', 
    '.eslintrc.json',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    'eslint.config.js',
    'eslint.config.mjs'
  ];
  
  const existingConfigs = configFiles.filter(file => fs.existsSync(file));
  
  if (existingConfigs.length > 1) {
    console.log(`⚠️  Multiple ESLint configurations detected: ${existingConfigs.join(', ')}`);
    console.log('💡 Consider consolidating to a single configuration');
    return false;
  }
  
  return true;
}

function checkDependencyVersions() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const eslintDeps = Object.keys(allDeps).filter(dep => 
    dep.includes('eslint') || dep.includes('prettier')
  );
  
  console.log('📦 ESLint-related dependencies:');
  eslintDeps.forEach(dep => {
    console.log(`   ${dep}: ${allDeps[dep]}`);
  });
  
  return eslintDeps;
}

function runLintAnalysis() {
  try {
    const output = execSync('npm run lint', { 
      stdio: 'pipe',
      cwd: process.cwd()
    }).toString();
    
    const lines = output.split('\n');
    const errorLines = lines.filter(line => line.includes('error'));
    const warningLines = lines.filter(line => line.includes('warning'));
    
    return {
      errors: errorLines.length,
      warnings: warningLines.length,
      total: errorLines.length + warningLines.length
    };
  } catch (error) {
    // ESLint returns non-zero exit code when there are issues
    const output = error.stdout?.toString() || '';
    const lines = output.split('\n');
    const errorLines = lines.filter(line => line.includes('error'));
    const warningLines = lines.filter(line => line.includes('warning'));
    
    return {
      errors: errorLines.length,
      warnings: warningLines.length,
      total: errorLines.length + warningLines.length
    };
  }
}

function generateReport() {
  console.log('🔍 ESLint Configuration Monitor');
  console.log('=' .repeat(40));
  
  const monitorData = loadMonitorData();
  const currentConfigHash = getConfigHash();
  const configChanged = monitorData.configHash !== currentConfigHash;
  
  console.log(`📅 Last check: ${monitorData.lastCheck || 'Never'}`);
  console.log(`🔧 Config changed: ${configChanged ? 'Yes' : 'No'}`);
  
  // Check for multiple configs
  const singleConfig = checkForMultipleConfigs();
  
  // Check dependencies
  const deps = checkDependencyVersions();
  
  // Run lint analysis
  console.log('\n🧪 Running lint analysis...');
  const lintResults = runLintAnalysis();
  
  console.log(`📊 Lint results: ${lintResults.errors} errors, ${lintResults.warnings} warnings`);
  
  // Update monitor data
  const newMonitorData = {
    lastCheck: new Date().toISOString(),
    configHash: currentConfigHash,
    violations: lintResults,
    dependencies: deps.reduce((acc, dep) => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      acc[dep] = packageJson.devDependencies[dep] || packageJson.dependencies[dep];
      return acc;
    }, {})
  };
  
  saveMonitorData(newMonitorData);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  
  if (!singleConfig) {
    console.log('   • Consolidate ESLint configurations');
  }
  
  if (lintResults.errors > 0) {
    console.log('   • Fix ESLint errors: npm run lint:fix');
  }
  
  if (lintResults.warnings > 50) {
    console.log('   • Consider reducing warnings for better code quality');
  }
  
  if (configChanged) {
    console.log('   • Configuration changed - review changes');
  }
  
  console.log('\n✅ ESLint monitoring complete');
}

// Main execution
if (require.main === module) {
  generateReport();
}

module.exports = {
  loadMonitorData,
  saveMonitorData,
  getConfigHash,
  checkForMultipleConfigs,
  checkDependencyVersions,
  runLintAnalysis,
  generateReport
};
