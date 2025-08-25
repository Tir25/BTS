import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Load environment variables
const envPath = path.resolve(process.cwd(), 'env.local');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

console.log('📋 Loaded environment variables:', Object.keys(envVars));

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Ensure assets directory exists
if (!fs.existsSync('dist/assets')) {
  fs.mkdirSync('dist/assets', { recursive: true });
}

// Copy static assets
if (fs.existsSync('public')) {
  fs.cpSync('public', 'dist', { recursive: true });
  console.log('✅ Static assets copied successfully!');
}

// Process CSS with basic Tailwind-like replacements
try {
  let cssContent = fs.readFileSync('src/index.css', 'utf8');
  
  // Remove @import statements that cause path conflicts
  cssContent = cssContent.replace(/@import\s+['"]maplibre-gl\/dist\/maplibre-gl\.css['"];?\s*/g, '');
  
  // Basic Tailwind directive replacements
  cssContent = cssContent.replace(/@tailwind\s+base;/g, '');
  cssContent = cssContent.replace(/@tailwind\s+components;/g, '');
  cssContent = cssContent.replace(/@tailwind\s+utilities;/g, '');
  
  // Replace common @apply directives with actual CSS
  cssContent = cssContent.replace(/@apply\s+([^;]+);/g, (match, classes) => {
    const classList = classes.trim().split(/\s+/);
    const cssRules = [];
    
    classList.forEach(cls => {
      switch(cls) {
        case 'flex':
          cssRules.push('display: flex;');
          break;
        case 'items-center':
          cssRules.push('align-items: center;');
          break;
        case 'justify-center':
          cssRules.push('justify-content: center;');
          break;
        case 'text-center':
          cssRules.push('text-align: center;');
          break;
        case 'w-full':
          cssRules.push('width: 100%;');
          break;
        case 'h-full':
          cssRules.push('height: 100%;');
          break;
        case 'min-h-screen':
          cssRules.push('min-height: 100vh;');
          break;
        case 'bg-white':
          cssRules.push('background-color: white;');
          break;
        case 'text-black':
          cssRules.push('color: black;');
          break;
        case 'font-bold':
          cssRules.push('font-weight: bold;');
          break;
        case 'text-lg':
          cssRules.push('font-size: 1.125rem;');
          break;
        case 'text-xl':
          cssRules.push('font-size: 1.25rem;');
          break;
        case 'text-2xl':
          cssRules.push('font-size: 1.5rem;');
          break;
        case 'text-3xl':
          cssRules.push('font-size: 1.875rem;');
          break;
        case 'p-4':
          cssRules.push('padding: 1rem;');
          break;
        case 'm-4':
          cssRules.push('margin: 1rem;');
          break;
        case 'rounded':
          cssRules.push('border-radius: 0.25rem;');
          break;
        case 'shadow':
          cssRules.push('box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);');
          break;
        case 'hover:shadow-lg':
          cssRules.push('transition: box-shadow 0.15s ease-in-out;');
          break;
        case 'transition':
          cssRules.push('transition: all 0.15s ease-in-out;');
          break;
        case 'cursor-pointer':
          cssRules.push('cursor: pointer;');
          break;
        case 'opacity-50':
          cssRules.push('opacity: 0.5;');
          break;
        case 'opacity-75':
          cssRules.push('opacity: 0.75;');
          break;
        case 'opacity-90':
          cssRules.push('opacity: 0.9;');
          break;
        case 'opacity-100':
          cssRules.push('opacity: 1;');
          break;
        case 'hidden':
          cssRules.push('display: none;');
          break;
        case 'block':
          cssRules.push('display: block;');
          break;
        case 'inline-block':
          cssRules.push('display: inline-block;');
          break;
        case 'grid':
          cssRules.push('display: grid;');
          break;
        case 'absolute':
          cssRules.push('position: absolute;');
          break;
        case 'relative':
          cssRules.push('position: relative;');
          break;
        case 'fixed':
          cssRules.push('position: fixed;');
          break;
        case 'top-0':
          cssRules.push('top: 0;');
          break;
        case 'left-0':
          cssRules.push('left: 0;');
          break;
        case 'right-0':
          cssRules.push('right: 0;');
          break;
        case 'bottom-0':
          cssRules.push('bottom: 0;');
          break;
        case 'z-10':
          cssRules.push('z-index: 10;');
          break;
        case 'z-20':
          cssRules.push('z-index: 20;');
          break;
        case 'z-30':
          cssRules.push('z-index: 30;');
          break;
        case 'z-40':
          cssRules.push('z-index: 40;');
          break;
        case 'z-50':
          cssRules.push('z-index: 50;');
          break;
        default:
          // For unknown classes, add a comment
          cssRules.push(`/* @apply ${cls} - class not processed */`);
      }
    });
    
    return cssRules.join(' ');
  });
  
  // Add some basic responsive utilities
  cssContent += `
/* Basic responsive utilities */
@media (max-width: 768px) {
  .mobile-hidden { display: none !important; }
  .mobile-block { display: block !important; }
}

@media (min-width: 769px) {
  .desktop-hidden { display: none !important; }
  .desktop-block { display: block !important; }
}

/* Basic flexbox utilities */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }

/* Basic spacing utilities */
.p-2 { padding: 0.5rem; }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.p-8 { padding: 2rem; }
.m-2 { margin: 0.5rem; }
.m-4 { margin: 1rem; }
.m-6 { margin: 1.5rem; }
.m-8 { margin: 2rem; }

/* Basic text utilities */
.text-sm { font-size: 0.875rem; }
.text-base { font-size: 1rem; }
.text-lg { font-size: 1.125rem; }
.text-xl { font-size: 1.25rem; }
.text-2xl { font-size: 1.5rem; }
.text-3xl { font-size: 1.875rem; }
.text-4xl { font-size: 2.25rem; }

/* Basic color utilities */
.text-white { color: white; }
.text-black { color: black; }
.text-gray-500 { color: #6b7280; }
.text-gray-600 { color: #4b5563; }
.text-gray-700 { color: #374151; }
.text-gray-800 { color: #1f2937; }
.text-gray-900 { color: #111827; }

.bg-white { background-color: white; }
.bg-black { background-color: black; }
.bg-gray-100 { background-color: #f3f4f6; }
.bg-gray-200 { background-color: #e5e7eb; }
.bg-gray-300 { background-color: #d1d5db; }
.bg-gray-400 { background-color: #9ca3af; }
.bg-gray-500 { background-color: #6b7280; }

/* Basic border utilities */
.border { border: 1px solid #e5e7eb; }
.border-2 { border: 2px solid #e5e7eb; }
.border-gray-200 { border-color: #e5e7eb; }
.border-gray-300 { border-color: #d1d5db; }
.rounded { border-radius: 0.25rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }

/* Basic shadow utilities */
.shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); }
.shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }

/* Basic hover effects */
.hover\\:shadow-lg:hover { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
.hover\\:opacity-75:hover { opacity: 0.75; }
.hover\\:bg-gray-100:hover { background-color: #f3f4f6; }

/* Basic transition utilities */
.transition { transition: all 0.15s ease-in-out; }
.transition-colors { transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, text-decoration-color 0.15s ease-in-out, fill 0.15s ease-in-out, stroke 0.15s ease-in-out; }
.transition-opacity { transition: opacity 0.15s ease-in-out; }

/* Basic cursor utilities */
.cursor-pointer { cursor: pointer; }
.cursor-default { cursor: default; }

/* Basic overflow utilities */
.overflow-hidden { overflow: hidden; }
.overflow-auto { overflow: auto; }
.overflow-scroll { overflow: scroll; }

/* Basic position utilities */
.relative { position: relative; }
.absolute { position: absolute; }
.fixed { position: fixed; }
.sticky { position: sticky; }

/* Basic width and height utilities */
.w-full { width: 100%; }
.h-full { height: 100%; }
.min-h-screen { min-height: 100vh; }
.min-w-screen { min-width: 100vw; }

/* Basic display utilities */
.block { display: block; }
.inline-block { display: inline-block; }
.inline { display: inline; }
.hidden { display: none; }
.grid { display: grid; }

/* Basic font utilities */
.font-bold { font-weight: bold; }
.font-normal { font-weight: normal; }
.font-light { font-weight: 300; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }

/* Basic text alignment */
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-justify { text-align: justify; }
`;

  fs.writeFileSync('dist/assets/index.css', cssContent);
  console.log('✅ CSS processed and enhanced with basic utilities!');
} catch (error) {
  console.error('❌ CSS processing failed:', error);
  // Create basic CSS file as fallback
  const fallbackCss = `
/* Basic fallback CSS */
body { 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
  background-color: white;
  color: black;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.flex { display: flex; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.text-center { text-align: center; }
.w-full { width: 100%; }
.h-full { height: 100%; }
.min-h-screen { min-height: 100vh; }
.bg-white { background-color: white; }
.text-black { color: black; }
.font-bold { font-weight: bold; }
.text-lg { font-size: 1.125rem; }
.text-xl { font-size: 1.25rem; }
.text-2xl { font-size: 1.5rem; }
.text-3xl { font-size: 1.875rem; }
.p-4 { padding: 1rem; }
.m-4 { margin: 1rem; }
.rounded { border-radius: 0.25rem; }
.shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); }
.transition { transition: all 0.15s ease-in-out; }
.cursor-pointer { cursor: pointer; }
.hidden { display: none; }
.block { display: block; }
.relative { position: relative; }
.absolute { position: absolute; }
.top-0 { top: 0; }
.left-0 { left: 0; }
.right-0 { right: 0; }
.bottom-0 { bottom: 0; }
.z-10 { z-index: 10; }
.z-20 { z-index: 20; }
.z-30 { z-index: 30; }
.z-40 { z-index: 40; }
.z-50 { z-index: 50; }
`;
  fs.writeFileSync('dist/assets/index.css', fallbackCss);
  console.log('⚠️ Created fallback CSS with basic utilities');
}

// Try to find and copy MapLibre CSS from different possible locations
const possibleMaplibrePaths = [
  'node_modules/maplibre-gl/dist/maplibre-gl.css',
  'node_modules/maplibre-gl/maplibre-gl.css',
  'node_modules/maplibre-gl/dist/maplibre-gl.min.css'
];

let maplibreCssCopied = false;
for (const cssPath of possibleMaplibrePaths) {
  try {
    if (fs.existsSync(cssPath)) {
      fs.copyFileSync(cssPath, 'dist/assets/maplibre-gl.css');
      console.log(`✅ MapLibre CSS copied successfully from ${cssPath}!`);
      maplibreCssCopied = true;
      break;
    }
  } catch (error) {
    console.log(`⚠️ Failed to copy from ${cssPath}`);
  }
}

if (!maplibreCssCopied) {
  console.log('⚠️ MapLibre CSS not found in any expected location, will use CDN fallback');
}

// Build JavaScript
esbuild.build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outfile: 'dist/assets/main.js',
  format: 'esm',
  target: 'esnext',
  minify: true,
  sourcemap: false,
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.jsx': 'jsx',
    '.js': 'js',
    '.css': 'empty', // Don't bundle CSS imports
  },
  external: ['maplibre-gl/dist/maplibre-gl.css'], // External CSS imports
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.VITE_SUPABASE_URL': `"${envVars.VITE_SUPABASE_URL || ''}"`,
    'import.meta.env.VITE_SUPABASE_ANON_KEY': `"${envVars.VITE_SUPABASE_ANON_KEY || ''}"`,
    'import.meta.env.VITE_ADMIN_EMAILS': `"${envVars.VITE_ADMIN_EMAILS || ''}"`,
    'import.meta.env.VITE_API_URL': `"${envVars.VITE_API_URL || ''}"`,
    'import.meta.env.VITE_WEBSOCKET_URL': `"${envVars.VITE_WEBSOCKET_URL || ''}"`,
    'import.meta.env.VITE_MAPLIBRE_TOKEN': `"${envVars.VITE_MAPLIBRE_TOKEN || ''}"`,
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true',
    'import.meta.env.MODE': '"production"',
  },
}).then(() => {
  console.log('✅ JavaScript built successfully!');
  
  // Create production HTML with conditional MapLibre CSS
  const maplibreCssLink = maplibreCssCopied 
    ? '<link rel="stylesheet" href="/assets/maplibre-gl.css">'
    : '<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css">';

  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>University Bus Tracking System</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/index.css">
    ${maplibreCssLink}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/main.js"></script>
  </body>
</html>`;
  
  fs.writeFileSync('dist/index.html', htmlContent);
  console.log('✅ Production HTML created successfully!');
  console.log('✅ Build completed successfully!');
}).catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
