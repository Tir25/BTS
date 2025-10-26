#!/usr/bin/env node

/**
 * Frontend Structure Validation Script
 * Prevents dual implementation problems and structural issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function findFiles(filename, directory = '.') {
  const results = [];
  
  function searchDir(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          searchDir(fullPath);
        } else if (stat.isFile() && item === filename) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  searchDir(directory);
  return results;
}

function findNestedDirectories() {
  const results = [];
  
  function searchDir(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          // Check for nested directories with same name
          const nestedPath = path.join(fullPath, item);
          if (fs.existsSync(nestedPath)) {
            results.push(nestedPath);
          }
          searchDir(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  searchDir('.');
  return results;
}

function findDuplicateConfigs() {
  const configs = {
    eslint: findFiles('.eslintrc.cjs').concat(findFiles('.eslintrc.json')),
    typescript: findFiles('tsconfig.json'),
    package: findFiles('package.json')
  };
  
  return configs;
}

function validateStructure() {
  log('\n🔍 Frontend Structure Validation', 'blue');
  log('================================', 'blue');
  
  const issues = [];
  const warnings = [];
  
  // 1. Check for duplicate App.tsx files
  log('\n📁 Checking for duplicate App.tsx files...', 'yellow');
  const appFiles = findFiles('App.tsx');
  if (appFiles.length > 1) {
    issues.push(`❌ Multiple App.tsx files found: ${appFiles.join(', ')}`);
    log(`❌ Multiple App.tsx files found: ${appFiles.join(', ')}`, 'red');
  } else if (appFiles.length === 1) {
    log(`✅ Single App.tsx file found: ${appFiles[0]}`, 'green');
  } else {
    log('⚠️  No App.tsx file found', 'yellow');
  }
  
  // 2. Check for nested directories
  log('\n📂 Checking for nested directories...', 'yellow');
  const nestedDirs = findNestedDirectories();
  if (nestedDirs.length > 0) {
    issues.push(`❌ Nested directories found: ${nestedDirs.join(', ')}`);
    log(`❌ Nested directories found: ${nestedDirs.join(', ')}`, 'red');
  } else {
    log('✅ No nested directories found', 'green');
  }
  
  // 3. Check for duplicate configurations
  log('\n⚙️  Checking for duplicate configurations...', 'yellow');
  const configs = findDuplicateConfigs();
  
  // ESLint configs
  if (configs.eslint.length > 1) {
    issues.push(`❌ Multiple ESLint configs found: ${configs.eslint.join(', ')}`);
    log(`❌ Multiple ESLint configs found: ${configs.eslint.join(', ')}`, 'red');
  } else if (configs.eslint.length === 1) {
    log(`✅ Single ESLint config found: ${configs.eslint[0]}`, 'green');
  }
  
  // TypeScript configs
  if (configs.typescript.length > 1) {
    warnings.push(`⚠️  Multiple TypeScript configs found: ${configs.typescript.join(', ')}`);
    log(`⚠️  Multiple TypeScript configs found: ${configs.typescript.join(', ')}`, 'yellow');
  } else if (configs.typescript.length === 1) {
    log(`✅ Single TypeScript config found: ${configs.typescript[0]}`, 'green');
  }
  
  // Package.json files
  if (configs.package.length > 1) {
    warnings.push(`⚠️  Multiple package.json files found: ${configs.package.join(', ')}`);
    log(`⚠️  Multiple package.json files found: ${configs.package.join(', ')}`, 'yellow');
  } else if (configs.package.length === 1) {
    log(`✅ Single package.json found: ${configs.package[0]}`, 'green');
  }
  
  // 4. Check for empty configuration files
  log('\n📄 Checking for empty configuration files...', 'yellow');
  const emptyFiles = [];
  
  // Check common config files
  const configFiles = [
            // 'netlify.toml', // Removed: Netlify not configured
    'vercel.json',
    '.env',
    '.env.local',
    '.env.production'
  ];
  
  for (const file of configFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8').trim();
      if (content === '' || content === '{}' || content === '[]') {
        emptyFiles.push(file);
        warnings.push(`⚠️  Empty configuration file: ${file}`);
        log(`⚠️  Empty configuration file: ${file}`, 'yellow');
      }
    }
  }
  
  if (emptyFiles.length === 0) {
    log('✅ No empty configuration files found', 'green');
  }
  
  // 5. Check for proper directory structure
  log('\n🏗️  Checking directory structure...', 'yellow');
  const requiredDirs = ['src', 'src/components', 'src/services', 'src/utils'];
  const missingDirs = [];
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      missingDirs.push(dir);
      warnings.push(`⚠️  Missing directory: ${dir}`);
      log(`⚠️  Missing directory: ${dir}`, 'yellow');
    }
  }
  
  if (missingDirs.length === 0) {
    log('✅ All required directories present', 'green');
  }
  
  // Summary
  log('\n📊 Validation Summary', 'blue');
  log('====================', 'blue');
  
  if (issues.length === 0 && warnings.length === 0) {
    log('🎉 All checks passed! Structure is clean and properly organized.', 'green');
    return 0;
  }
  
  if (issues.length > 0) {
    log(`\n❌ Critical Issues Found (${issues.length}):`, 'red');
    issues.forEach(issue => log(`  ${issue}`, 'red'));
  }
  
  if (warnings.length > 0) {
    log(`\n⚠️  Warnings (${warnings.length}):`, 'yellow');
    warnings.forEach(warning => log(`  ${warning}`, 'yellow'));
  }
  
  log('\n📋 Recommendations:', 'blue');
  log('1. Remove duplicate files and configurations', 'blue');
  log('2. Clean up empty configuration files', 'blue');
  log('3. Ensure proper directory structure', 'blue');
  log('4. Follow naming conventions', 'blue');
  
  return issues.length > 0 ? 1 : 0;
}

// Run validation
const exitCode = validateStructure();
process.exit(exitCode);

export { validateStructure, findFiles, findNestedDirectories };
