#!/usr/bin/env node

/**
 * Script to restart Vite development server with proper cache clearing
 * This helps resolve MIME type issues and other caching problems
 */

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

const CACHE_DIRS = [
  'node_modules/.vite',
  'node_modules/.cache',
  '.vite'
];

console.log('🧹 Clearing Vite cache directories...');

// Clear cache directories
CACHE_DIRS.forEach(dir => {
  const fullPath = join(process.cwd(), dir);
  if (existsSync(fullPath)) {
    try {
      rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Cleared: ${dir}`);
    } catch (error) {
      console.warn(`⚠️ Could not clear ${dir}:`, error.message);
    }
  }
});

console.log('🚀 Starting Vite development server...');

try {
  // Start the development server
  execSync('npm run dev', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('❌ Failed to start development server:', error.message);
  process.exit(1);
}
