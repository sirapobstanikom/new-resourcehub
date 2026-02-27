import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // อย่าใส่ API keys ใน define — จะหลุดไปใน client bundle ตอน deploy
    // - OpenAI: ใช้ Supabase Edge Function openai-proxy (OPENAI_API_KEY ใน Supabase Secrets)
    // - Gemini: ไม่ inject ใน client
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
