// Simple Vite config without imports
import { resolve } from 'path';

export default {
  plugins: [],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    cors: true
  }
};