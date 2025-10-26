#!/usr/bin/env node

/**
 * Script to systematically replace console statements with logger calls
 * This script will process all TypeScript files and replace console statements
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Logger import pattern
const LOGGER_IMPORT = "import { logger } from '../utils/logger';";
const LOGGER_IMPORT_RELATIVE = "import { logger } from './utils/logger';";

// Console statement replacements
const replacements = [
  // console.log patterns
  {
    pattern: /console\.log\(([^)]+)\);?/g,
    replacement: (match, content) => {
      // Extract the message and any additional parameters
      const cleanContent = content.trim();
      if (cleanContent.startsWith('`') && cleanContent.endsWith('`')) {
        // Template literal
        const message = cleanContent.slice(1, -1);
        return `logger.info('${message}', 'component');`;
      } else if (cleanContent.startsWith("'") && cleanContent.endsWith("'")) {
        // String literal
        const message = cleanContent.slice(1, -1);
        return `logger.info('${message}', 'component');`;
      } else if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
        // String literal
        const message = cleanContent.slice(1, -1);
        return `logger.info('${message}', 'component');`;
      } else {
        // Complex expression - use debug level
        return `logger.debug('Debug info', 'component', { data: ${cleanContent} });`;
      }
    }
  },
  // console.error patterns
  {
    pattern: /console\.error\(([^)]+)\);?/g,
    replacement: (match, content) => {
      const cleanContent = content.trim();
      if (cleanContent.startsWith('`') && cleanContent.endsWith('`')) {
        const message = cleanContent.slice(1, -1);
        return `logger.error('${message}', 'component');`;
      } else if (cleanContent.startsWith("'") && cleanContent.endsWith("'")) {
        const message = cleanContent.slice(1, -1);
        return `logger.error('${message}', 'component');`;
      } else if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
        const message = cleanContent.slice(1, -1);
        return `logger.error('${message}', 'component');`;
      } else {
        return `logger.error('Error occurred', 'component', { error: ${cleanContent} });`;
      }
    }
  },
  // console.warn patterns
  {
    pattern: /console\.warn\(([^)]+)\);?/g,
    replacement: (match, content) => {
      const cleanContent = content.trim();
      if (cleanContent.startsWith('`') && cleanContent.endsWith('`')) {
        const message = cleanContent.slice(1, -1);
        return `logger.warn('${message}', 'component');`;
      } else if (cleanContent.startsWith("'") && cleanContent.endsWith("'")) {
        const message = cleanContent.slice(1, -1);
        return `logger.warn('${message}', 'component');`;
      } else if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
        const message = cleanContent.slice(1, -1);
        return `logger.warn('${message}', 'component');`;
      } else {
        return `logger.warn('Warning', 'component', { data: ${cleanContent} });`;
      }
    }
  },
  // console.debug patterns
  {
    pattern: /console\.debug\(([^)]+)\);?/g,
    replacement: (match, content) => {
      const cleanContent = content.trim();
      if (cleanContent.startsWith('`') && cleanContent.endsWith('`')) {
        const message = cleanContent.slice(1, -1);
        return `logger.debug('${message}', 'component');`;
      } else if (cleanContent.startsWith("'") && cleanContent.endsWith("'")) {
        const message = cleanContent.slice(1, -1);
        return `logger.debug('${message}', 'component');`;
      } else if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
        const message = cleanContent.slice(1, -1);
        return `logger.debug('${message}', 'component');`;
      } else {
        return `logger.debug('Debug info', 'component', { data: ${cleanContent} });`;
      }
    }
  }
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check if file already has logger import
    const hasLoggerImport = content.includes('import { logger }') || content.includes('from \'../utils/logger\'') || content.includes('from \'./utils/logger\'');
    
    // Apply replacements
    for (const replacement of replacements) {
      const newContent = content.replace(replacement.pattern, replacement.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    // Add logger import if needed and file was modified
    if (modified && !hasLoggerImport) {
      // Determine the correct import path based on file location
      const isInSubdirectory = filePath.includes('/src/') && !filePath.endsWith('/src/');
      const importStatement = isInSubdirectory ? LOGGER_IMPORT : LOGGER_IMPORT_RELATIVE;
      
      // Find the last import statement and add logger import after it
      const importRegex = /import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm;
      const imports = content.match(importRegex);
      
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertIndex = lastImportIndex + lastImport.length;
        content = content.slice(0, insertIndex) + '\n' + importStatement + '\n' + content.slice(insertIndex);
      } else {
        // No imports found, add at the top
        content = importStatement + '\n\n' + content;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Processed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Starting console statement replacement...');
  
  // Find all TypeScript files
  const files = await glob('src/**/*.{ts,tsx}');
  
  let processedCount = 0;
  let modifiedCount = 0;
  
  for (const file of files) {
    processedCount++;
    if (processFile(file)) {
      modifiedCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${processedCount}`);
  console.log(`   Files modified: ${modifiedCount}`);
  console.log(`   Files unchanged: ${processedCount - modifiedCount}`);
  
  if (modifiedCount > 0) {
    console.log('\n✅ Console statement replacement completed!');
    console.log('💡 Run "npm run lint" to see the improvements.');
  } else {
    console.log('\n✅ No console statements found to replace.');
  }
}

// Run the script
main().catch(console.error);

export { processFile, replacements };
