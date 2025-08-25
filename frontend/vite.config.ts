import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..'), // Look for env files in the project root
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development', // Only enable in development
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['framer-motion', '@headlessui/react'],
          maps: ['maplibre-gl'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit for larger chunks
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'maplibre-gl'],
  },
});
