import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy index.html
fs.copyFileSync('index.html', 'dist/index.html');

// Build with esbuild
esbuild.build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  target: 'esnext',
  minify: true,
  sourcemap: false,
  external: ['react', 'react-dom'],
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.jsx': 'jsx',
    '.js': 'js',
    '.css': 'css',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
}).then(() => {
  console.log('✅ Build completed successfully!');
}).catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
