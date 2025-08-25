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

// Copy static assets
if (fs.existsSync('public')) {
  fs.cpSync('public', 'dist', { recursive: true });
  console.log('✅ Static assets copied successfully!');
}

// Process CSS with PostCSS and Tailwind

try {
  // Use PostCSS to process CSS with Tailwind
  execSync('npx postcss src/index.css -o dist/assets/index.css --env production', { stdio: 'inherit' });
  console.log('✅ CSS processed with PostCSS and Tailwind successfully!');
} catch (error) {
  console.error('❌ CSS processing failed:', error);
  // Fallback: copy raw CSS
  fs.copyFileSync('src/index.css', 'dist/assets/index.css');
  console.log('⚠️ Using fallback CSS (no Tailwind processing)');
}

// Build JavaScript
return esbuild.build({
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
    '.css': 'css',
  },
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
  
  // Create production HTML
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
