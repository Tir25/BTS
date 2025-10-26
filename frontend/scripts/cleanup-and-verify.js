#!/usr/bin/env node

/**
 * Frontend Cleanup and Verification Script
 * Removes redundant files and verifies the structure
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
  cyan: '\x1b[36m',
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
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
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

function findEmptyFiles(directory = '.') {
  const emptyFiles = [];
  
  function searchDir(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
          searchDir(fullPath);
        } else if (stat.isFile()) {
          const content = fs.readFileSync(fullPath, 'utf8').trim();
          if (content === '' || content === '{}' || content === '[]' || content === 'null') {
            emptyFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  searchDir(directory);
  return emptyFiles;
}

function findDuplicateFiles() {
  const duplicates = [];
  const fileMap = new Map();
  
  function searchDir(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
          searchDir(fullPath);
        } else if (stat.isFile()) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const hash = content.length + content.slice(0, 100); // Simple hash
          
          if (fileMap.has(hash)) {
            duplicates.push({
              original: fileMap.get(hash),
              duplicate: fullPath,
              size: stat.size
            });
          } else {
            fileMap.set(hash, fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  searchDir('.');
  return duplicates;
}

function findUnusedFiles() {
  const unusedFiles = [];
  const srcFiles = findFiles('*.ts', 'src').concat(findFiles('*.tsx', 'src'));
  const allImports = new Set();
  
  // Collect all imports
  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g);
      
      if (importMatches) {
        for (const match of importMatches) {
          const importPath = match.match(/['"]([^'"]+)['"]/)[1];
          if (importPath.startsWith('./') || importPath.startsWith('../')) {
            allImports.add(importPath);
          }
        }
      }
    } catch (error) {
      // Ignore read errors
    }
  }
  
  // Check for unused files
  for (const file of srcFiles) {
    const relativePath = path.relative('src', file).replace(/\\/g, '/');
    const possibleImports = [
      './' + relativePath,
      './' + relativePath.replace(/\.(ts|tsx)$/, ''),
      './' + relativePath.replace(/\.(ts|tsx)$/, '/index')
    ];
    
    const isUsed = possibleImports.some(imp => allImports.has(imp));
    
    if (!isUsed && !file.includes('main.tsx') && !file.includes('App.tsx')) {
      unusedFiles.push(file);
    }
  }
  
  return unusedFiles;
}

async function cleanupAndVerify() {
  log('\n🧹 Frontend Cleanup and Verification', 'blue');
  log('====================================', 'blue');

  let issuesFound = 0;
  let filesRemoved = 0;

  // Step 1: Find empty files
  log('\n📄 Checking for empty files...', 'yellow');
  const emptyFiles = findEmptyFiles();
  
  if (emptyFiles.length > 0) {
    log(`Found ${emptyFiles.length} empty files:`, 'yellow');
    for (const file of emptyFiles) {
      log(`  - ${file}`, 'yellow');
      try {
        fs.unlinkSync(file);
        log(`  ✅ Removed: ${file}`, 'green');
        filesRemoved++;
      } catch (error) {
        log(`  ❌ Failed to remove: ${file}`, 'red');
        issuesFound++;
      }
    }
  } else {
    log('✅ No empty files found', 'green');
  }

  // Step 2: Find duplicate files
  log('\n📋 Checking for duplicate files...', 'yellow');
  const duplicates = findDuplicateFiles();
  
  if (duplicates.length > 0) {
    log(`Found ${duplicates.length} duplicate files:`, 'yellow');
    for (const dup of duplicates) {
      log(`  - Duplicate: ${dup.duplicate} (${dup.size} bytes)`, 'yellow');
      log(`    Original: ${dup.original}`, 'cyan');
      
      // Remove the duplicate (keep the original)
      try {
        fs.unlinkSync(dup.duplicate);
        log(`  ✅ Removed duplicate: ${dup.duplicate}`, 'green');
        filesRemoved++;
      } catch (error) {
        log(`  ❌ Failed to remove duplicate: ${dup.duplicate}`, 'red');
        issuesFound++;
      }
    }
  } else {
    log('✅ No duplicate files found', 'green');
  }

  // Step 3: Find unused files
  log('\n🔍 Checking for unused files...', 'yellow');
  const unusedFiles = findUnusedFiles();
  
  if (unusedFiles.length > 0) {
    log(`Found ${unusedFiles.length} potentially unused files:`, 'yellow');
    for (const file of unusedFiles) {
      log(`  - ${file}`, 'yellow');
      // Don't auto-remove unused files, just report them
      issuesFound++;
    }
    log('💡 Review these files manually before removing', 'cyan');
  } else {
    log('✅ No unused files found', 'green');
  }

  // Step 4: Check for deprecated configuration files
  log('\n⚙️  Checking for deprecated configurations...', 'yellow');
  const deprecatedFiles = [
    'src/config/ConfigManager.ts',
    'src/config/environment.ts',
    'src/config/production.ts'
  ];
  
  for (const file of deprecatedFiles) {
    if (fs.existsSync(file)) {
      log(`⚠️  Deprecated file found: ${file}`, 'yellow');
      log('💡 This file is deprecated but kept for backward compatibility', 'cyan');
    }
  }

  // Step 5: Verify structure
  log('\n🏗️  Verifying directory structure...', 'yellow');
  const requiredDirs = [
    'src',
    'src/components',
    'src/services',
    'src/utils',
    'src/config',
    'src/hooks',
    'src/stores',
    'src/types'
  ];
  
  for (const dir of requiredDirs) {
    if (fs.existsSync(dir)) {
      log(`✅ ${dir} exists`, 'green');
    } else {
      log(`❌ ${dir} missing`, 'red');
      issuesFound++;
    }
  }

  // Step 6: Check for proper configuration
  log('\n🔧 Checking configuration files...', 'yellow');
  const configFiles = [
    'package.json',
    'vite.config.js',
    'tsconfig.json',
    'tailwind.config.js'
  ];
  
  for (const file of configFiles) {
    if (fs.existsSync(file)) {
      log(`✅ ${file} exists`, 'green');
    } else {
      log(`❌ ${file} missing`, 'red');
      issuesFound++;
    }
  }

  // Step 7: Check for environment files
  log('\n🌍 Checking environment configuration...', 'yellow');
  const envFiles = ['.env', '.env.local', '.env.production'];
  let envFileFound = false;
  
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      log(`✅ ${file} exists`, 'green');
      envFileFound = true;
    }
  }
  
  if (!envFileFound) {
    log('⚠️  No environment file found', 'yellow');
    log('💡 Consider creating .env.local for development', 'cyan');
  }

  // Summary
  log('\n📊 Cleanup Summary', 'blue');
  log('==================', 'blue');
  log(`🗑️  Files removed: ${filesRemoved}`, 'cyan');
  log(`⚠️  Issues found: ${issuesFound}`, issuesFound > 0 ? 'yellow' : 'green');
  log(`✅ Status: ${issuesFound === 0 ? 'CLEAN' : 'NEEDS ATTENTION'}`, issuesFound === 0 ? 'green' : 'yellow');

  if (issuesFound === 0) {
    log('\n🎉 Frontend structure is clean and optimized!', 'green');
  } else {
    log('\n💡 Please review the issues above and take appropriate action.', 'yellow');
  }

  return issuesFound === 0;
}

// Run cleanup and verification
const success = await cleanupAndVerify();
process.exit(success ? 0 : 1);
