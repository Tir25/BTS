#!/usr/bin/env node

/**
 * Dependency Management Script
 * Ensures consistent dependency versions across the project
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DependencyManager {
  constructor() {
    this.packageJsonPath = path.join(__dirname, '..', 'package.json');
    this.packageLockPath = path.join(__dirname, '..', 'package-lock.json');
  }

  /**
   * Check for dependency conflicts
   */
  checkConflicts() {
    console.log('🔍 Checking for dependency conflicts...');
    
    try {
      const result = execSync('npm ls --depth=0', { 
        cwd: path.dirname(this.packageJsonPath),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (result.includes('UNMET') || result.includes('extraneous')) {
        console.warn('⚠️  Found dependency issues:');
        console.log(result);
        return false;
      }
      
      console.log('✅ No dependency conflicts found');
      return true;
    } catch (error) {
      console.error('❌ Error checking dependencies:', error.message);
      return false;
    }
  }

  /**
   * Check for outdated packages
   */
  checkOutdated() {
    console.log('🔍 Checking for outdated packages...');
    
    try {
      const result = execSync('npm outdated', { 
        cwd: path.dirname(this.packageJsonPath),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (result.trim()) {
        console.log('📦 Outdated packages found:');
        console.log(result);
        return false;
      }
      
      console.log('✅ All packages are up to date');
      return true;
    } catch (error) {
      // npm outdated exits with code 1 when packages are outdated
      if (error.status === 1) {
        console.log('📦 Some packages are outdated (this is normal)');
        return false;
      }
      console.error('❌ Error checking outdated packages:', error.message);
      return false;
    }
  }

  /**
   * Check for security vulnerabilities
   */
  checkSecurity() {
    console.log('🔍 Checking for security vulnerabilities...');
    
    try {
      const result = execSync('npm audit --audit-level=moderate', { 
        cwd: path.dirname(this.packageJsonPath),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (result.includes('found 0 vulnerabilities')) {
        console.log('✅ No security vulnerabilities found');
        return true;
      }
      
      console.log('⚠️  Security vulnerabilities found:');
      console.log(result);
      return false;
    } catch (error) {
      console.error('❌ Error checking security:', error.message);
      return false;
    }
  }

  /**
   * Update dependencies safely
   */
  updateDependencies() {
    console.log('🔄 Updating dependencies...');
    
    try {
      // Update patch and minor versions only
      execSync('npm update', { 
        cwd: path.dirname(this.packageJsonPath),
        stdio: 'inherit'
      });
      
      console.log('✅ Dependencies updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating dependencies:', error.message);
      return false;
    }
  }

  /**
   * Clean and reinstall dependencies
   */
  cleanInstall() {
    console.log('🧹 Cleaning and reinstalling dependencies...');
    
    try {
      // Remove node_modules and package-lock.json
      if (fs.existsSync(path.join(path.dirname(this.packageJsonPath), 'node_modules'))) {
        execSync('rmdir /s /q node_modules', { 
          cwd: path.dirname(this.packageJsonPath),
          shell: true
        });
      }
      
      if (fs.existsSync(this.packageLockPath)) {
        fs.unlinkSync(this.packageLockPath);
      }
      
      // Reinstall
      execSync('npm install', { 
        cwd: path.dirname(this.packageJsonPath),
        stdio: 'inherit'
      });
      
      console.log('✅ Clean install completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error during clean install:', error.message);
      return false;
    }
  }

  /**
   * Generate dependency report
   */
  generateReport() {
    console.log('📊 Generating dependency report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      conflicts: this.checkConflicts(),
      outdated: this.checkOutdated(),
      security: this.checkSecurity(),
      recommendations: []
    };

    if (!report.conflicts) {
      report.recommendations.push('Run npm install to resolve conflicts');
    }

    if (!report.outdated) {
      report.recommendations.push('Consider updating outdated packages');
    }

    if (!report.security) {
      report.recommendations.push('Run npm audit fix to resolve security issues');
    }

    // Save report
    const reportPath = path.join(__dirname, '..', 'dependency-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Report saved to: ${reportPath}`);
    return report;
  }

  /**
   * Run full dependency health check
   */
  runHealthCheck() {
    console.log('🏥 Running dependency health check...\n');
    
    const results = {
      conflicts: this.checkConflicts(),
      outdated: this.checkOutdated(),
      security: this.checkSecurity()
    };

    console.log('\n📋 Health Check Results:');
    console.log(`Conflicts: ${results.conflicts ? '✅' : '❌'}`);
    console.log(`Outdated: ${results.outdated ? '✅' : '⚠️'}`);
    console.log(`Security: ${results.security ? '✅' : '❌'}`);

    const allGood = Object.values(results).every(Boolean);
    
    if (allGood) {
      console.log('\n🎉 All dependency checks passed!');
    } else {
      console.log('\n⚠️  Some issues found. Run the appropriate fixes.');
    }

    return allGood;
  }
}

// CLI Interface
if (require.main === module) {
  const manager = new DependencyManager();
  const command = process.argv[2];

  switch (command) {
    case 'check':
      manager.runHealthCheck();
      break;
    case 'update':
      manager.updateDependencies();
      break;
    case 'clean':
      manager.cleanInstall();
      break;
    case 'report':
      manager.generateReport();
      break;
    default:
      console.log('Usage: node dependency-manager.cjs [check|update|clean|report]');
      console.log('  check  - Run health check');
      console.log('  update - Update dependencies');
      console.log('  clean  - Clean install');
      console.log('  report - Generate report');
  }
}

module.exports = DependencyManager;
