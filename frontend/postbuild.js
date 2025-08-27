// postbuild.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Running postbuild script...');

// With rootDir: frontend in render.yaml, the dist directory is already in the correct location
// This script just verifies the build output and provides logging

const distDir = path.join(__dirname, 'dist');

console.log(`🔍 Build verification:`);
console.log(`   Current directory: ${__dirname}`);
console.log(`   Dist directory: ${distDir}`);
console.log(`   Dist exists: ${fs.existsSync(distDir)}`);

if (!fs.existsSync(distDir)) {
  console.error('❌ Dist directory does not exist!');
  process.exit(1);
}

console.log('✅ Build output verified successfully!');

// List contents for verification
console.log('📂 Contents of dist directory:');
const files = fs.readdirSync(distDir);
files.forEach(file => {
  const filePath = path.join(distDir, file);
  const stats = fs.statSync(filePath);
  if (stats.isDirectory()) {
    console.log(`📁 ${file}/`);
  } else {
    console.log(`📄 ${file}`);
  }
});

console.log('✅ Postbuild script completed successfully!');
