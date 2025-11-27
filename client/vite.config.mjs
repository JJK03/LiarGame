import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,              // 0.0.0.0 bind, ngrok가 접근 가능
    port: 5173,
    allowedHosts: [
      'subfascial-polyphyletic-lydia.ngrok-free.dev',
    ],
  },
});


