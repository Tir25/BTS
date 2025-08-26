// postbuild.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Running postbuild script...');

// The issue is that Render expects the dist directory at the repository root level
// But our build creates it in the frontend directory
// We need to create a symlink or copy to the expected location

const sourceDir = path.join(__dirname, 'dist');
const targetDir = path.join(__dirname, '..', 'frontend', 'dist');

console.log(`🔍 Debug info:`);
console.log(`   Current directory: ${__dirname}`);
console.log(`   Source directory: ${sourceDir}`);
console.log(`   Target directory: ${targetDir}`);
console.log(`   Source exists: ${fs.existsSync(sourceDir)}`);
console.log(`   Target exists: ${fs.existsSync(targetDir)}`);

// If source and target are the same, we're already in the right place
if (sourceDir === targetDir) {
  console.log('✅ Files are already in the correct location!');
} else {
  // Create target directory if it doesn't exist
  console.log(`📁 Creating directory: ${targetDir}`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy files
  console.log(`📋 Copying files from ${sourceDir} to ${targetDir}`);
  copyFolderSync(sourceDir, targetDir);
}

// Helper function to copy folder recursively
function copyFolderSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    const stats = fs.statSync(sourcePath);
    if (stats.isDirectory()) {
      copyFolderSync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

console.log('✅ Postbuild script completed successfully!');
console.log('📂 Contents of frontend/dist:');
listDirectoryContents(targetDir);

// Helper function to list directory contents
function listDirectoryContents(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      console.log(`📁 ${file}/`);
    } else {
      console.log(`📄 ${file}`);
    }
  });
}
