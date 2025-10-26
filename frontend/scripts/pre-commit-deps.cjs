#!/usr/bin/env node

/**
 * Pre-commit Dependency Check
 * Ensures dependencies are healthy before commits
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Running pre-commit dependency checks...\n');

try {
  // Check for dependency conflicts
  console.log('Checking for dependency conflicts...');
  execSync('npm ls --depth=0', { stdio: 'pipe' });
  console.log('✅ No dependency conflicts found');

  // Check security vulnerabilities
  console.log('Checking for security vulnerabilities...');
  const auditResult = execSync('npm audit --audit-level=high', { 
    stdio: 'pipe',
    encoding: 'utf8'
  });
  
  if (auditResult.includes('found 0 vulnerabilities')) {
    console.log('✅ No high-severity vulnerabilities found');
  } else {
    console.log('⚠️  High-severity vulnerabilities found:');
    console.log(auditResult);
    console.log('Please run "npm audit fix" to resolve issues');
    process.exit(1);
  }

  // Check for critical outdated packages
  console.log('Checking for critically outdated packages...');
  try {
    const outdatedResult = execSync('npm outdated', { 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    if (outdatedResult.trim()) {
      console.log('📦 Some packages are outdated:');
      console.log(outdatedResult);
      console.log('Consider running "npm update" to update packages');
    } else {
      console.log('✅ All packages are up to date');
    }
  } catch (error) {
    // npm outdated exits with code 1 when packages are outdated
    if (error.status === 1) {
      console.log('📦 Some packages are outdated (this is normal)');
    } else {
      throw error;
    }
  }

  console.log('\n🎉 All pre-commit dependency checks passed!');
  
} catch (error) {
  console.error('\n❌ Pre-commit dependency checks failed:');
  console.error(error.message);
  console.error('\nPlease fix the issues above before committing.');
  process.exit(1);
}
