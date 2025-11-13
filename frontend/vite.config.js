// Enhanced Vite config with cache busting, build optimization, and MIME type fixes
import { resolve } from 'path';

// PRODUCTION FIX: Removed MIME type fix plugin - no longer needed
// The issue was caused by a direct CSS link in index.html, which has been removed
// Vite handles CSS imports correctly through JavaScript modules (import './index.css')
// CSS is now only imported in main.tsx, so no direct link tag is needed in HTML

export default {
  // PRODUCTION FIX: Removed mimeTypeFixPlugin - CSS is now properly handled through JS imports
  plugins: [],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    cors: true,
    // Additional server configuration
    middlewareMode: false,
    // Ensure proper handling of JS files
    fs: {
      strict: false
    }
  },
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'static/js/[name]-[hash].js',
        entryFileNames: 'static/js/[name]-[hash].js',
        assetFileNames: 'static/assets/[name]-[hash].[ext]',
      },
    },
    // Ensure proper chunking for dynamic imports
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies for better caching
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    // Force pre-bundling to avoid MIME type issues
    force: true,
    // Exclude problematic dependencies from optimization
    exclude: []
  },
  // Ensure proper module resolution
  esbuild: {
    target: 'es2020'
  }
};