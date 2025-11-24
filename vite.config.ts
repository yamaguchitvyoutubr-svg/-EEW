import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Vercelの環境変数(process.env.API_KEY)を、
    // アプリ内のコード(process.env.API_KEY)として使えるように置換する設定
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
});