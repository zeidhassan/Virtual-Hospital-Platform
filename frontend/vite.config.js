import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    // Allow ngrok tunnel hostnames through Vite's dev-server Host header check
    // (free ngrok URLs rotate but always end in one of these suffixes).
    allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.ngrok.app'],
    proxy: {
      // Proxy all /api requests to the Express backend (port 5000)
      // If backend routes don't have /api prefix, change to:
      //   target: 'http://localhost:5000', rewrite: (path) => path.replace(/^\/api/, '')
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy OAuth redirect routes
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
