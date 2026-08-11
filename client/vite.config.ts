import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// When Vite runs in Docker, its API peer is the Compose service name, not
// localhost.  Local `npm run dev` keeps using localhost without extra config.
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000';

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
        '/chat': apiProxyTarget,
        '/sessions': apiProxyTarget,
        '/models': apiProxyTarget,
        '/knowledge': apiProxyTarget,
        '/workflows': apiProxyTarget,
        '/memory': apiProxyTarget,
        '/logs': apiProxyTarget,
        '/settings': apiProxyTarget,
        '/benchmarks': apiProxyTarget,
        '/api-keys': apiProxyTarget,
        '/api': apiProxyTarget,
        '/health': apiProxyTarget,
        '/docs': apiProxyTarget,
      },
    },
  };
});
