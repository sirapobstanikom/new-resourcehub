import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // โหลด .env จากรากโปรเจกต์ (แบบเดิม); ถ้าใช้เฉพาะ frontend/.env ให้เปลี่ยนเป็น __dirname
  envDir: path.resolve(__dirname, '..'),
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    // jspdf / chunk หลักหลัง code-split มัก > 500 kB — ค่า default ของ Vite เตือนเกินจริงสำหรับแอปนี้
    chunkSizeWarningLimit: 700,
  },
});
