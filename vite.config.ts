import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Chunks that must never be served to an unauthenticated visitor: anything
 * that bundles the content JSON, the data layer that imports it, the layer /
 * shell / admin UI built on it, or three.js. Vite emits them under
 * `assets/private/`, and `functions/_middleware.ts` gates that directory behind
 * an investor session or an admin cookie. Everything else (`assets/*`) is the
 * public entry: router, gate page, admin login form.
 */
const PRIVATE_MODULE = /[\\/](content[\\/][^\\/]+\.json|src[\\/](data|layers|shell|admin)[\\/]|node_modules[\\/]three[\\/])/
const isPrivateChunk = (moduleIds: readonly string[]) =>
  moduleIds.some((id) => PRIVATE_MODULE.test(id) && !/[\\/]src[\\/]admin[\\/](api|AdminGuard|LoginPage|admin\.css)/.test(id))

// Dev proxies /api and /i to `npm run dev:api` (wrangler pages dev on :8788) or `npm run dev:api:node`.
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
    // The only chunk above 500 kB is three.js on its own (~507 kB minified, ~128 kB gzip),
    // lazy-loaded behind the shell for the attractor. Nothing else comes close.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        chunkFileNames: (chunk) =>
          isPrivateChunk(chunk.moduleIds) ? 'assets/private/[name]-[hash].js' : 'assets/[name]-[hash].js',
      },
    },
  },
})
