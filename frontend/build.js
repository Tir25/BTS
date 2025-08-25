import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy static assets
if (fs.existsSync('public')) {
  fs.cpSync('public', 'dist', { recursive: true });
}

// Build CSS first
esbuild.build({
  entryPoints: ['src/index.css'],
  bundle: true,
  outfile: 'dist/assets/index.css',
  minify: true,
  loader: {
    '.css': 'css',
  },
}).then(() => {
  console.log('✅ CSS built successfully!');
  
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
    },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });
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
