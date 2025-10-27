// Enhanced Vite config with cache busting, build optimization, and MIME type fixes
import { resolve } from 'path';

// Custom plugin to fix MIME type issues
const mimeTypeFixPlugin = () => {
  return {
    name: 'mime-type-fix',
    configureServer(server) {
      // Fix MIME types for Vite dependency files
      server.middlewares.use('/node_modules/.vite/deps', (req, res, next) => {
        if (req.url && req.url.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
        next();
      });

      // Fix MIME types for all JavaScript files
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
        next();
      });
    }
  };
};

export default {
  plugins: [mimeTypeFixPlugin()],
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
    force: true
  },
  // Ensure proper module resolution
  esbuild: {
    target: 'es2020'
  }
};