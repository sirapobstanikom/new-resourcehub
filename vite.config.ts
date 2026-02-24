import 'dotenv/config';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { aiProxyPlugin } from './vite-plugin-ai-proxy';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), aiProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
