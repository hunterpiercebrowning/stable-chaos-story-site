import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev proxies /api and /i to `npm run dev:api` (wrangler pages dev on :8788).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8788', changeOrigin: true },
      '/i': { target: 'http://127.0.0.1:8788', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
