import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression2';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer for development
    process.env.ANALYZE === 'true' && visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
    // Compression for production builds
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
  ].filter(Boolean),
  envDir: path.resolve(__dirname, '..'), // Look for env files in the project root
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow network access for cross-laptop testing
    strictPort: false, // Allow port fallback if 5173 is busy
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize CSS to prevent layout shifts
    cssCodeSplit: true,
    // Ensure assets are properly handled
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Enhanced manual chunk splitting for better performance
        manualChunks: (id) => {
          // Vendor chunks - separate large libraries
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            // Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Animations
            if (id.includes('framer-motion')) {
              return 'vendor-animations';
            }
            // Maps
            if (id.includes('maplibre-gl') || id.includes('leaflet')) {
              return 'vendor-maps';
            }
            // WebSocket
            if (id.includes('socket.io-client')) {
              return 'vendor-websocket';
            }
            // State management
            if (id.includes('zustand') || id.includes('@tanstack/react-query')) {
              return 'vendor-state';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Other vendor libraries
            return 'vendor-misc';
          }
          
          // Component chunks - separate large components
          if (id.includes('src/components')) {
            if (id.includes('StreamlinedManagement')) {
              return 'component-admin';
            }
            if (id.includes('DriverDashboard') || id.includes('DriverInterface')) {
              return 'component-driver';
            }
            if (id.includes('EnhancedStudentMap')) {
              return 'component-student';
            }
            if (id.includes('PremiumHomepage')) {
              return 'component-homepage';
            }
            return 'component-misc';
          }
          
          // Service chunks
          if (id.includes('src/services')) {
            if (id.includes('websocket') || id.includes('realtime')) {
              return 'service-realtime';
            }
            if (id.includes('auth') || id.includes('supabase')) {
              return 'service-auth';
            }
            return 'service-misc';
          }
        },
        // Ensure consistent asset naming
        assetFileNames: assetInfo => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Optimize for production - use terser for better compression
    minify: process.env.NODE_ENV === 'production' ? 'terser' : 'esbuild',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Target modern browsers for better optimization
    target: 'es2022',
  },
  // Ensure proper asset handling
  assetsInclude: [
    '**/*.svg',
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.webp',
  ],
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@tanstack/react-query',
      'socket.io-client',
      '@supabase/supabase-js',
    ],
    // exclude: ['maplibre-gl'], // Exclude large map library from pre-bundling
  },
});
