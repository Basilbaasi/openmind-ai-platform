import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      // Proxy all /api, /chat, /sessions, /models, etc. to FastAPI backend
      proxy: {
        '/chat': 'http://localhost:8000',
        '/sessions': 'http://localhost:8000',
        '/models': 'http://localhost:8000',
        '/knowledge': 'http://localhost:8000',
        '/workflows': 'http://localhost:8000',
        '/memory': 'http://localhost:8000',
        '/logs': 'http://localhost:8000',
        '/settings': 'http://localhost:8000',
        '/benchmarks': 'http://localhost:8000',
        '/api-keys': 'http://localhost:8000',
        '/api': 'http://localhost:8000',
        '/health': 'http://localhost:8000',
        '/docs': 'http://localhost:8000',
      },
    },
  };
});
