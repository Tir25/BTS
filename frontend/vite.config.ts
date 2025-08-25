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
    sourcemap: false,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true,
      },
    },
    target: 'esnext',
    minify: 'esbuild',
    commonjsOptions: {
      include: [],
    },
  },
  optimizeDeps: {
    exclude: ['@rollup/rollup-linux-x64-gnu'],
    force: true,
    include: ['react', 'react-dom'],
  },
  define: {
    global: 'globalThis',
  },
  esbuild: {
    target: 'esnext',
  },
});
